#!/usr/bin/env python3
"""内容、页面与工程配置校验。"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ROOT = PROJECT_ROOT / 'miniprogram'


def fail(message: str) -> None:
    print(f'  ❌ {message}')
    raise SystemExit(1)


def ok(message: str) -> None:
    print(f'  ✅ {message}')


def run_node_json(script: str):
    result = subprocess.run(
        ['node', '-e', script],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        print(result.stderr)
        fail('Node 数据读取失败')
    return json.loads(result.stdout)


def check_js_syntax() -> None:
    print('=== 1. JavaScript 语法 ===')
    files = sorted(ROOT.rglob('*.js'))
    for path in files:
        result = subprocess.run(
            ['node', '--check', str(path)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            print(result.stderr)
            fail(str(path.relative_to(ROOT)))
    ok(f'{len(files)} 个 JavaScript 文件语法正常')


def check_documents() -> None:
    print('\n=== 2. 文档唯一数据源 ===')
    docs = run_node_json(
        "const d=require('./data/documents'); console.log(JSON.stringify(d.DOCUMENTS));"
    )
    if len(docs) != 42:
        fail(f'文档数量应为 42，实际 {len(docs)}')

    ids = [item['id'] for item in docs]
    files = [item['file'] for item in docs]
    if len(ids) != len(set(ids)):
        fail('存在重复文档 ID')
    if len(files) != len(set(files)):
        fail('存在重复文档路径')
    if any(not item['file'].startswith('docs/') for item in docs):
        fail('文档路径必须以 docs/ 开头')

    expected = {
        'wifi7-transition-notice': '校园无线网络新旧系统切换通知',
        'graduation-self-check': '毕业与学位资格学生自查操作说明',
        'micro-majors-2026': '2026 年微专业报名通知',
        'student-regulations': '沈阳化工大学学生管理规定',
        'summer-campus-stay-2026': '2026 年暑期本科生留校工作方案',
        'classroom-video-review-application': '回放教室监控录像申请表',
        'student-origin-credit-loan-liaoning-2026': '国家生源地信用助学贷款（国家开发银行辽宁分行）',
    }
    index = {item['id']: item for item in docs}
    for doc_id, title in expected.items():
        if index.get(doc_id, {}).get('title') != title:
            fail(f'{doc_id} 标题未同步')

    loan = index.get('student-origin-credit-loan-liaoning-2026', {})
    if not loan.get('hasLocalPreview'):
        fail('助学贷款 PDF 应使用小程序内原生 PDF 预览')
    if loan.get('note') != 'PDF · 微信原生打开':
        fail('助学贷款 PDF 原生预览标记异常')
    if loan.get('remoteInternal'):
        fail('助学贷款 PDF 不应再配置远程下载打开')
    doc_util = ROOT.joinpath('utils/doc.js').read_text(encoding='utf-8')
    for token in ('wx.downloadFile', 'DOCUMENT_FILE_INDEX'):
        if token in doc_util:
            fail(f'文档工具仍残留远程下载打开逻辑：{token}')

    page_js = [
        path for path in ROOT.joinpath('pages').rglob('*.js')
        if 'preview' not in path.parts
    ]
    duplicated = []
    pattern = re.compile(r"file\s*:\s*['\"]docs/")
    for path in page_js:
        text = path.read_text(encoding='utf-8')
        if pattern.search(text) or "'docs/" in text or '"docs/' in text:
            duplicated.append(str(path.relative_to(ROOT)))
    if duplicated:
        fail('页面仍硬编码文档清单：' + ', '.join(duplicated))

    search_cases = {
        '体测': 'physical-fitness-score-tables',
        'WiFi7': 'wifi7-transition-notice',
        '高数': 'calculus-2-final-2025-2026',
        '查重': 'thesis-plagiarism-check-2026',
        '监控调阅': 'classroom-video-review-application',
        '毕业自查': 'graduation-self-check',
        '助学贷款': 'student-origin-credit-loan-liaoning-2026',
        '95593': 'student-origin-credit-loan-liaoning-2026',
    }
    search_result = run_node_json(
        "const d=require('./data/documents'); const qs=['体测','WiFi7','高数','查重','监控调阅','毕业自查','助学贷款','95593']; const out={}; for(const q of qs){out[q]=d.DOCUMENTS.filter(x=>d.documentMatches(x,q)).map(x=>x.id);} console.log(JSON.stringify(out));"
    )
    for query, expected_id in search_cases.items():
        if expected_id not in search_result.get(query, []):
            fail(f'搜索词“{query}”不能命中 {expected_id}')

    ok('42 份资料 ID、路径唯一，关键标题与网页版 v1.29 基线对齐')
    ok('业务页面不再重复维护 docs/... 文档元数据')
    ok('常用新旧名称和关键词搜索正常')


def check_versions_and_config() -> None:
    print('\n=== 3. 版本与工程配置 ===')
    site = run_node_json(
        "const d=require('./data/content'); console.log(JSON.stringify(d.SITE));"
    )
    if site.get('sourceVersion') != 'v1.29':
        fail('sourceVersion 应为 v1.29')
    release_version = str(site.get('version') or '')
    if not re.fullmatch(r'v\d+\.\d+\.\d+-mini', release_version):
        fail(f'小程序版本格式无效：{release_version or "<空>"}，应类似 v1.4.5-mini')
    if site.get('sourceRevision') != '20260814' or site.get('updatedAt') != '2026-08-14':
        fail('网页版同步修订日期应为 2026-08-14')

    config = json.loads(PROJECT_ROOT.joinpath('project.config.json').read_text(encoding='utf-8'))
    root_value = str(config.get('miniprogramRoot') or '').replace('\\', '/').rstrip('/') + '/'
    if root_value != 'miniprogram/':
        fail(f'project.config.json 的 miniprogramRoot 应为 miniprogram/，实际 {root_value}')

    app_cfg = json.loads(ROOT.joinpath('app.json').read_text(encoding='utf-8'))
    if app_cfg.get('lazyCodeLoading') != 'requiredComponents':
        fail('app.json 必须保持 lazyCodeLoading=requiredComponents，避免主包页面注入回归')

    for rel in ('pages/map/map.js', 'pages/map-detail/map-detail.js', 'pages/campus/campus.js', 'pages/campus-detail/campus-detail.js'):
        text = ROOT.joinpath(rel).read_text(encoding='utf-8')
        if 'utils/page' in text or 'map-page' in text or 'campus-page' in text:
            fail(f'{rel} 不应依赖页面工厂或 utils/page.js')

    setting = config.get('setting', {})
    if setting.get('ignoreUploadUnusedFiles') is not False or setting.get('ignoreDevUnusedFiles') is not False:
        fail('开发者工具不得自动忽略未识别文件，否则固定文档分包可能被漏打包')

    for forbidden in ('project.config.json', 'project.private.config.json', 'README.md', 'scripts'):
        if ROOT.joinpath(forbidden).exists():
            fail(f'运行目录不应包含工作区文件：miniprogram/{forbidden}')

    gitignore = PROJECT_ROOT.joinpath('.gitignore').read_text(encoding='utf-8')
    if 'project.private.config.json' not in gitignore:
        fail('.gitignore 未忽略本机私有配置')

    ok('工作区与 miniprogram 运行目录已分离，后续可仅覆盖运行目录更新')


def extract_handlers(wxml: str) -> set[str]:
    handlers = set()
    for match in re.finditer(r'(?:bind|catch)(?::|[a-zA-Z-]+=")([^"\s]+)', wxml):
        value = match.group(1)
        if value and not value.startswith('{{'):
            handlers.add(value)
    # 兼容 bindtap="method" 形式
    handlers.update(re.findall(r'(?:bind|catch)[\w:-]+="([A-Za-z_$][\w$]*)"', wxml))
    return handlers


def collect_local_js_source(js_path: Path, seen: set[Path] | None = None) -> str:
    seen = seen or set()
    js_path = js_path.resolve()
    if js_path in seen or not js_path.exists():
        return ''
    seen.add(js_path)
    text = js_path.read_text(encoding='utf-8')
    parts = [text]
    for req in re.findall(r"require\(['\"]([^'\"]+)['\"]\)", text):
        if not req.startswith('.'):
            continue
        base = (js_path.parent / req).resolve()
        candidates = [base, Path(str(base) + '.js'), base / 'index.js']
        dep = next((candidate for candidate in candidates if candidate.exists() and candidate.is_file()), None)
        if dep is not None and ROOT.resolve() in dep.parents:
            parts.append(collect_local_js_source(dep, seen))
    return '\n'.join(parts)


def check_wxml_handlers() -> None:
    print('\n=== 4. WXML 事件绑定 ===')
    checked = 0
    missing = []
    for wxml_path in sorted(ROOT.rglob('*.wxml')):
        js_path = wxml_path.with_suffix('.js')
        if not js_path.exists():
            continue
        handlers = extract_handlers(wxml_path.read_text(encoding='utf-8'))
        js_text = collect_local_js_source(js_path)
        for handler in handlers:
            if not re.search(rf'\b{re.escape(handler)}\s*\(', js_text):
                missing.append(f'{wxml_path.relative_to(ROOT)} -> {handler}')
        checked += 1
    if missing:
        fail('缺失事件处理函数：' + '; '.join(missing))
    ok(f'{checked} 个页面/模板的事件处理函数完整（含本地页面工厂依赖）')


def check_tab_icons() -> None:
    print('\n=== 5. TabBar 图标 ===')
    tab = ROOT / 'assets' / 'tab'
    home = hashlib.sha256((tab / 'tab-home.png').read_bytes()).hexdigest()
    docs = hashlib.sha256((tab / 'tab-docs.png').read_bytes()).hexdigest()
    home_active = hashlib.sha256((tab / 'tab-home-active.png').read_bytes()).hexdigest()
    docs_active = hashlib.sha256((tab / 'tab-docs-active.png').read_bytes()).hexdigest()
    if home == docs or home_active == docs_active:
        fail('首页与资料图标仍然重复')
    ok('首页与资料 Tab 图标已区分')





def check_timetable_feature() -> None:
    print('\n=== 5A. 本地课表、课表码与 JSON 分享 ===')
    app = json.loads(ROOT.joinpath('app.json').read_text(encoding='utf-8'))
    tab_list = app.get('tabBar', {}).get('list', [])
    tab_paths = [item.get('pagePath') for item in tab_list]
    if len(tab_list) != 5:
        fail(f'TabBar 应保持 5 项，实际 {len(tab_list)}')
    if 'pages/timetable/timetable' not in tab_paths:
        fail('TabBar 缺少课表入口')
    if 'pages/about/about' in tab_paths:
        fail('关于页仍占用底部 Tab，应从首页/课表设置进入')
    if 'pages/about/about' not in app.get('pages', []):
        fail('关于页被误删')
    for icon in ('tab-timetable.png', 'tab-timetable-active.png'):
        if not ROOT.joinpath('assets/tab', icon).exists():
            fail(f'缺少课表 Tab 图标：{icon}')

    required_files = [
        'pages/timetable/timetable.js',
        'pages/timetable/timetable.json',
        'pages/timetable/timetable.wxml',
        'pages/timetable/timetable.wxss',
        'utils/timetable-store.js',
        'utils/timetable-codec.js',
    ]
    for rel in required_files:
        if not ROOT.joinpath(rel).exists():
            fail(f'课表功能缺少文件：{rel}')

    page_js = ROOT.joinpath('pages/timetable/timetable.js').read_text(encoding='utf-8')
    page_wxml = ROOT.joinpath('pages/timetable/timetable.wxml').read_text(encoding='utf-8')
    store_js = ROOT.joinpath('utils/timetable-store.js').read_text(encoding='utf-8')
    codec_js = ROOT.joinpath('utils/timetable-codec.js').read_text(encoding='utf-8')
    for token in ('wx.chooseMessageFile', 'wx.shareFileMessage', 'writeExportFile', 'parseImportText', 'createShareCode'):
        if token not in page_js and token not in store_js:
            fail(f'课表 JSON 导入/分享能力缺少：{token}')
    for token in ('wx.setStorageSync', 'wx.env.USER_DATA_PATH', 'HISTORY_LIMIT = 5', "FORMAT = 'syuct-timetable'"):
        if token not in store_js:
            fail(f'课表本地持久化能力缺少：{token}')
    for token in ('SYUCT-TT2:', 'encodeShareCode', 'decodeShareCode', 'checksum'):
        if token not in codec_js:
            fail(f'课表码编解码能力缺少：{token}')
    for token in ('添加课程', '导入课表', '分享课表', '仅存本机'):
        if token not in page_wxml:
            fail(f'课表页面缺少关键入口：{token}')
    if '关于与共建' not in ROOT.joinpath('pages/index/index.wxml').read_text(encoding='utf-8'):
        fail('关于页移出 Tab 后，首页没有保留入口')
    ok('课表保持 5 项底栏结构，本地双份存储 + 5 次历史备份已接入')
    ok('短课表码支持校验与剪贴板自动解码，同时兼容 JSON 文件和原始 JSON')


def check_home_navigation_stack() -> None:
    print('\n=== 6. 首页返回导航栈 ===')
    app = json.loads(ROOT.joinpath('app.json').read_text(encoding='utf-8'))
    tab_pages = {f"/{item['pagePath']}" for item in app.get('tabBar', {}).get('list', [])}
    portals = run_node_json(
        "const d=require('./data/content'); console.log(JSON.stringify(d.PORTALS));"
    )
    portal_index = {item['title']: item['page'] for item in portals}
    expected = {
        '校园地图': '/pages/map-detail/map-detail',
        '校园生活': '/pages/campus-detail/campus-detail',
    }
    for title, route in expected.items():
        actual = portal_index.get(title)
        if actual != route:
            fail(f'{title} 首页入口应指向 {route}，实际 {actual}')
        if actual in tab_pages:
            fail(f'{title} 首页入口不能直接指向 TabBar 页面，否则返回会退出小程序')
        page_dir = ROOT / actual.lstrip('/')
        for suffix in ('.js', '.json', '.wxml', '.wxss'):
            path = page_dir.with_suffix(suffix)
            if not path.exists():
                fail(f'{title} 普通详情页缺失：{path.relative_to(ROOT)}')
    ok('首页地图与校园生活使用普通页面入栈，返回键可回到首页')



def check_web_content_sync() -> None:
    print('\n=== 7. 网页版内容同步 ===')
    content = run_node_json(
        "const d=require('./data/content'); console.log(JSON.stringify(d));"
    )
    expected_questions = [
        '报到时间与材料准备',
        '缴费安全与到校安排',
        '选课、竞赛与部分培养方案',
        '统一身份认证与校园账号',
        '校园地图与快递取件',
    ]
    actual_questions = [item.get('title') for item in content.get('QUICK_QUESTIONS', [])]
    if actual_questions != expected_questions:
        fail('首页“新生最常问”未与网页版五项入口对齐')

    stats = {item.get('label'): item.get('value') for item in content.get('STATS', [])}
    if stats.get('核心资料与地图') != '44 项':
        fail('首页核心资料与地图统计未同步为 44 项')
    if stats.get('实用导航地图') != '4 张':
        fail('首页导航地图统计未同步为 4 张')
    if content.get('SITE', {}).get('siteUrl') != 'https://www.syuct.top/':
        fail('网页版主入口未统一为 www.syuct.top')
    if not content.get('SITE', {}).get('panoramaUrl'):
        fail('校园地图缺少网页版官方全景入口')

    fresh = content.get('FRESHMAN', {})
    expected_payment = '新生缴费方式、时间和项目以入学指南及学校财务通知为准。有生源地信用助学贷款需求的同学，可查看下方辽宁分行参考资料；实际办理以当地学生资助管理中心和贷款合同为准。'
    if fresh.get('paymentText') != expected_payment:
        fail('新生页缴费与助学贷款精简文案不一致')
    freshman_wxml = ROOT.joinpath('pages/freshman/freshman.wxml').read_text(encoding='utf-8')
    if '缴费、银行卡与助学贷款' not in freshman_wxml or '生源地助学贷款资料' not in freshman_wxml or 'loanDoc.title' not in freshman_wxml:
        fail('新生页未展示精简后的助学贷款资料入口')
    if 'loan-callout' in freshman_wxml or 'loanDoc.description' in freshman_wxml:
        fail('新生页助学贷款区域仍存在重复说明')

    groups = run_node_json(
        "const d=require('./data/documents'); console.log(JSON.stringify({digital:d.getSectionGroups('digital'),academics:d.getSectionGroups('academics'),services:d.getSectionGroups('services'),campus:d.getSectionGroups('campus'),docs:d.DOCUMENTS}));"
    )
    expected_sections = {
        'digital': [
            '统一身份认证',
            'WebVPN：访问校内系统',
            'CARSI：校外访问学术资源',
            '图书馆移动服务',
        ],
        'academics': [
            '专业培养方案',
            '选修课与学分',
            '创新竞赛与开放实验室',
            '课程真题',
            '微专业',
        ],
        'services': [
            '教务与选课',
            '奖学金与学生事务',
            '校园事务与录像调阅',
            '毕业与论文',
        ],
        'campus': [
            '校历与作息',
            '体育、校园跑与体测',
            '图书馆与学习',
            '群与校园信息',
            '假期留校',
        ],
    }
    for name, names in expected_sections.items():
        actual = [item.get('name') for item in groups.get(name, [])]
        if actual != names:
            fail(f'{name} 栏目标题或顺序未与网页版对齐：{actual}')

    exact_copy = {
        ('digital', 'identity', 'lead'): '统一身份认证相当于数字校园的“网上通行证”。第一次使用需要完成账号激活，并确保企业微信消息可以正常接收。',
        ('digital', 'webvpn', 'lead'): 'WebVPN 适合在校外通过浏览器访问部分校内应用与资源，无需安装客户端。已激活统一身份认证后，可以使用账号密码或扫码登录。',
        ('digital', 'carsi', 'lead'): 'CARSI 主要用于校外访问学校已购买或已接入的电子资源。登录成功后，应能看到“沈阳化工大学教师/同学”身份提示。',
        ('academics', 'innovation', 'preCallout'): '阅读顺序：先看 2025 年补充修订，再结合 2024 年原办法。补充修订调整了竞赛分级和部分资助口径，获奖奖励标准保持不变。',
        ('academics', 'electives', 'postWarning'): '经验资料使用边界：教师、课程内容和考核方式会变化。主观经验只用于了解差异，最终应结合培养方案、课表和自己的学习目标。',
        ('services', 'graduation', 'postWarning'): '论文查重：2026 届通知中学校总体要求正文重复比率不得高于 30%，申优论文不得高于 20%；各学院可能执行更严格标准。',
        ('campus', 'vacation', 'postWarning'): '时效提醒：暑期留校方案按年度发布。后续年份请优先查看学生工作处和学院最新通知，不要直接沿用 2026 年时间节点。',
    }
    for (page, section_id, field), expected_text in exact_copy.items():
        section = next((item for item in groups.get(page, []) if item.get('id') == section_id), {})
        if section.get(field) != expected_text:
            fail(f'{page}.{section_id}.{field} 文案未与网页版对齐')

    if any(not item.get('description') for item in groups.get('docs', [])):
        fail('存在缺少说明文案的资料')

    pairs = [
        ('pages/map/map.wxml', 'pages/map-detail/map-detail.wxml'),
        ('pages/campus/campus.wxml', 'pages/campus-detail/campus-detail.wxml'),
    ]
    for left, right in pairs:
        if ROOT.joinpath(left).read_text(encoding='utf-8') != ROOT.joinpath(right).read_text(encoding='utf-8'):
            fail(f'{left} 与 {right} 内容不一致')

    about_data = content.get('ABOUT', {})
    acknowledgements = about_data.get('acknowledgements', {})
    if acknowledgements.get('file') != 'docs/syuct-acknowledgements.pdf':
        fail('关于页致谢名单文件入口缺失')
    if acknowledgements.get('note') != 'PDF · 微信原生打开':
        fail('关于页致谢名单应标记为微信原生打开')
    previews = run_node_json(
        "const d=require('./data/previews'); console.log(JSON.stringify(d));"
    )
    ack_preview = previews.get('syuct-acknowledgements.pdf', {})
    if not str(ack_preview.get('root', '')).startswith('/packages/pdf-') or ack_preview.get('mode') != 'native-document':
        fail('致谢名单原生 PDF manifest 异常')

    about = ROOT.joinpath('pages/about/about.wxml').read_text(encoding='utf-8')
    about_js = ROOT.joinpath('pages/about/about.js').read_text(encoding='utf-8')
    if '贴吧交流群' in about:
        ok('关于页保留贴吧交流群入口（用户要求）')
    if 'ack-entry' not in about or 'openAcknowledgements' not in about or 'openDoc(doc.file, doc.title)' not in about_js:
        fail('关于页“共建”下方致谢名单入口未完整接入')
    ok('关于页“共建”下方已接入致谢名单微信原生预览')
    ok('首页五项常问、六大栏目、资料说明和官方全景已按网页版 v1.29 基线对齐')


def read_image_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data.startswith(b'\x89PNG\r\n\x1a\n') and len(data) >= 24:
        return int.from_bytes(data[16:20], 'big'), int.from_bytes(data[20:24], 'big')
    if data.startswith(b'\xff\xd8'):
        offset = 2
        while offset + 9 < len(data):
            if data[offset] != 0xFF:
                offset += 1
                continue
            marker = data[offset + 1]
            offset += 2
            if marker in {0xD8, 0xD9}:
                continue
            if offset + 2 > len(data):
                break
            length = int.from_bytes(data[offset:offset + 2], 'big')
            if length < 2 or offset + length > len(data):
                break
            if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
                height = int.from_bytes(data[offset + 3:offset + 5], 'big')
                width = int.from_bytes(data[offset + 5:offset + 7], 'big')
                return width, height
            offset += length
    fail(f'无法读取图片尺寸：{path.relative_to(ROOT)}')


def check_groups_and_maps() -> None:
    print('\n=== 8. 交流群、高清地图与相册分包 ===')
    groups = run_node_json(
        "const d=require('./data/content'); console.log(JSON.stringify(d.COMMUNITY_GROUPS));"
    )
    expected_groups = {
        'freshman-2026': '1170264357',
        'tieba': '596823406',
    }
    actual_groups = {item.get('id'): item.get('number') for item in groups}
    if actual_groups != expected_groups:
        fail(f'交流群数据异常：{actual_groups}')

    index_wxml = ROOT.joinpath('pages/index/index.wxml').read_text(encoding='utf-8')
    about_wxml = ROOT.joinpath('pages/about/about.wxml').read_text(encoding='utf-8')
    if 'communityGroups' not in index_wxml or 'communityGroups' not in about_wxml:
        fail('首页或关于页未使用统一交流群数据')
    if 'copyCommunityGroup' not in index_wxml or 'copyCommunityGroup' not in about_wxml:
        fail('交流群复制事件未统一接入')
    if '查看加群二维码' in index_wxml or ROOT.joinpath('assets/qq-group.png').exists():
        fail('v1.29 已取消二维码，但小程序仍保留旧二维码入口或资源')

    app = json.loads(ROOT.joinpath('app.json').read_text(encoding='utf-8'))
    package_index = {item.get('root'): item for item in app.get('subPackages', []) or app.get('subpackages', [])}
    required_packages = {
        'packages/maps-main': 'mapsMain',
        'packages/maps-delivery': 'mapsDelivery',
        'packages/gallery': 'gallery',
    }
    for root, name in required_packages.items():
        item = package_index.get(root)
        if not item or item.get('name') != name or item.get('pages') != ['pages/viewer/viewer']:
            fail(f'分包配置异常：{root}')

    expected_images = {
        ROOT / 'packages/maps-main/assets/campus-map.jpg': (1400, 2000),
        ROOT / 'packages/maps-main/assets/sports-map.png': (1400, 2000),
        ROOT / 'packages/maps-delivery/assets/delivery-pickup-overview.jpg': (1400, 1000),
        ROOT / 'packages/maps-delivery/assets/delivery-haochijie-layout.jpg': (1600, 900),
    }
    for path, minimum in expected_images.items():
        if not path.exists():
            fail(f'缺少高清导航图：{path.relative_to(ROOT)}')
        width, height = read_image_size(path)
        if width < minimum[0] or height < minimum[1]:
            fail(f'{path.relative_to(ROOT)} 分辨率不足：{width}x{height}')

    for package_root in ['packages/maps-main', 'packages/maps-delivery', 'packages/gallery']:
        package = ROOT / package_root
        package_size = sum(path.stat().st_size for path in package.rglob('*') if path.is_file())
        if package_size >= 2 * 1024 * 1024:
            fail(f'{package_root} 分包过大：{package_size / 1024:.1f} KiB')
        ok(f'{package_root} 约 {package_size / 1024:.1f} KiB')

    for page in ['pages/map/map', 'pages/map-detail/map-detail']:
        js = ROOT.joinpath(page + '.js').read_text(encoding='utf-8')
        wxml = ROOT.joinpath(page + '.wxml').read_text(encoding='utf-8')
        if 'Page(Object.assign({' not in js or 'openMapViewer' not in js:
            fail(f'{page}.js 未使用稳定的直接 Page 注册或缺少地图打开逻辑')
        if 'packages/maps-main/pages/viewer/viewer' not in js or 'packages/maps-delivery/pages/viewer/viewer' not in js:
            fail(f'{page}.js 未按地图类型路由到两个高清分包')
        if 'openMapViewer' not in wxml or not re.search(r'class="map-image"[^>]*mode="aspectFit"', wxml):
            fail(f'{page}.wxml 地图缩略图或点击逻辑异常')

    for viewer_path in [
        'packages/maps-main/pages/viewer/viewer.wxml',
        'packages/maps-delivery/pages/viewer/viewer.wxml',
    ]:
        viewer = ROOT.joinpath(viewer_path).read_text(encoding='utf-8')
        if 'movable-area' not in viewer or 'scale-max="5"' not in viewer:
            fail(f'{viewer_path} 未启用缩放拖动')

    gallery = run_node_json(
        "const d=require('./data/content'); console.log(JSON.stringify(d.CAMPUS.gallery));"
    )
    if len(gallery) != 13:
        fail('校园相册应保持 13 张')
    for item in gallery:
        thumb = item.get('file', '')
        if not thumb.startswith('/assets/'):
            fail(f'相册缩略图必须位于主包：{thumb}')
        path = ROOT / thumb.lstrip('/')
        if not path.exists():
            fail(f'缺少相册缩略图：{path.relative_to(ROOT)}')
        if path.stat().st_size > 90 * 1024:
            fail(f'相册缩略图过大：{path.relative_to(ROOT)}')
    gallery_viewer = ROOT.joinpath('packages/gallery/pages/viewer/viewer.js').read_text(encoding='utf-8')
    if '/packages/gallery/assets/' not in gallery_viewer or 'wx.previewImage' not in gallery_viewer:
        fail('高清校园相册查看器配置异常')

    ok('新生群与贴吧群按 v1.29 统一维护，旧二维码已清理')
    # 加群只保留“复制群号”：不允许快捷加群/一键加群按钮、QQ 网页加群链接与
    # “微信小程序无法直接唤起 QQ”类提示框。
    freshman_wxml = ROOT.joinpath('pages/freshman/freshman.wxml').read_text(encoding='utf-8')
    about_wxml = ROOT.joinpath('pages/about/about.wxml').read_text(encoding='utf-8')
    index_wxml = ROOT.joinpath('pages/index/index.wxml').read_text(encoding='utf-8')
    app_js = ROOT.joinpath('app.js').read_text(encoding='utf-8')
    for label, text in (('freshman.wxml', freshman_wxml), ('about.wxml', about_wxml), ('index.wxml', index_wxml)):
        if '一键加群' in text or '快捷加群' in text:
            fail(f'{label} 仍存在“一键加群/快捷加群”按钮文案')
        if '无法直接唤起 QQ' in text:
            fail(f'{label} 仍保留“微信小程序无法直接唤起 QQ”提示')
    if 'data-url="{{item.joinUrl}}"' in freshman_wxml or 'data-url="{{item.joinUrl}}"' in about_wxml:
        fail('小程序加群按钮仍在复制/处理 QQ 网页链接')
    if 'quickJoinQQGroup' in app_js:
        fail('app.js 仍保留统一快捷加群流程')
    content_js = ROOT.joinpath('data/content.js').read_text(encoding='utf-8')
    if 'qm.qq.com' in content_js:
        fail('小程序数据层仍保留 QQ 网页加群链接，容易被误当作可直接跳转能力')
    ok('QQ 群加入仅保留复制群号，无快捷加群按钮与无法唤起 QQ 提示')
    ok('高清校园/体育图、快递图和校园相册均按需分包加载')


def check_landmarks_and_main_package() -> None:
    print('\n=== 9. 校园地标与主包体积 ===')
    content = run_node_json(
        "const d=require('./data/content'); console.log(JSON.stringify({landmarks:d.LANDMARKS,freshman:d.FRESHMAN.landmark,map:d.MAP.landmark,digital:d.DIGITAL.landmark,academics:d.ACADEMICS.landmark,services:d.SERVICES.landmark,campus:d.CAMPUS.landmark}));"
    )
    expected = {
        'freshman': ('校训石', '/assets/landmark-motto-stone.png'),
        'map': ('龙门', '/assets/landmark-dragon-gate.png'),
        'digital': ('槐德广场', '/assets/landmark-huaide-square.png'),
        'academics': ('图书馆', '/assets/landmark-library.png'),
        'services': ('老校门', '/assets/landmark-old-school-gate.png'),
        'campus': ('化学金字塔', '/assets/landmark-chemical-pyramid.png'),
    }
    for page, (name, image) in expected.items():
        item = content.get(page) or {}
        if item.get('name') != name or item.get('image') != image:
            fail(f'{page} 校园地标未按网页版同步：{item}')
        path = ROOT / image.lstrip('/')
        if not path.exists():
            fail(f'缺少地标图片：{path.relative_to(ROOT)}')
        width, height = read_image_size(path)
        if width < 440 or height < 300:
            fail(f'{path.relative_to(ROOT)} 尺寸过小：{width}x{height}')
        if path.stat().st_size > 100 * 1024:
            fail(f'{path.relative_to(ROOT)} 未做小程序体积优化：{path.stat().st_size / 1024:.1f} KiB')

    app = json.loads(ROOT.joinpath('app.json').read_text(encoding='utf-8'))
    if app.get('usingComponents', {}).get('landmark-hero') != '/components/landmark-hero/landmark-hero':
        fail('未全局注册 landmark-hero 组件')

    page_files = [
        'pages/freshman/freshman.wxml',
        'pages/map/map.wxml',
        'pages/map-detail/map-detail.wxml',
        'pages/digital/digital.wxml',
        'pages/academics/academics.wxml',
        'pages/services/services.wxml',
        'pages/campus/campus.wxml',
        'pages/campus-detail/campus-detail.wxml',
    ]
    for rel in page_files:
        text = ROOT.joinpath(rel).read_text(encoding='utf-8')
        if '<landmark-hero' not in text or 'bindlandmarktap="openLandmark"' not in text:
            fail(f'{rel} 未接入统一地标页首')

    subpackage_roots = [ROOT / item['root'] for item in app.get('subPackages', []) or app.get('subpackages', [])]
    size = 0
    for path in ROOT.rglob('*'):
        if not path.is_file():
            continue
        if any(package == path or package in path.parents for package in subpackage_roots):
            continue
        size += path.stat().st_size
    if size >= 2 * 1024 * 1024:
        fail(f'主包体积超过 2 MiB：{size / 1024:.1f} KiB')
    if size >= int(1.85 * 1024 * 1024):
        print(f'  ⚠️  主包约 {size / 1024:.1f} KiB，接近 2 MiB 上限')
    else:
        ok(f'主包约 {size / 1024:.1f} KiB')
    total_packages = sum(
        path.stat().st_size
        for item in app.get('subPackages', []) or app.get('subpackages', [])
        for path in ROOT.joinpath(item['root']).rglob('*')
        if path.is_file()
    ) + size
    if total_packages >= 20 * 1024 * 1024:
        fail(f'主包 + 分包总量超过 20 MiB：{total_packages / 1024 / 1024:.2f} MiB')
    ok(f'主包 + 分包原始运行文件约 {total_packages / 1024 / 1024:.2f} MiB')
    ok('六个网页版校园地标已压缩并接入统一页首组件')

def main() -> None:
    check_js_syntax()
    check_documents()
    check_versions_and_config()
    check_wxml_handlers()
    check_tab_icons()
    check_timetable_feature()
    check_home_navigation_stack()
    check_web_content_sync()
    check_groups_and_maps()
    check_landmarks_and_main_package()
    print('\n=== 内容与工程校验完成 ===')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
