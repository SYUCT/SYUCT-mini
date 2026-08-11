#!/usr/bin/env python3
"""本地 PDF 图片预览端到端校验。"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOTS = [ROOT / 'packages' / f'preview-{letter}' for letter in 'abcdefg']
MAX_BYTES = 2 * 1024 * 1024
WARN_BYTES = int(1.85 * 1024 * 1024)
PAGE_FILES = ['preview.js', 'preview.wxml', 'preview.wxss', 'preview.json']


def fail(message: str) -> None:
    print(f'  ❌ {message}')
    raise SystemExit(1)


def ok(message: str) -> None:
    print(f'  ✅ {message}')


def load_manifest() -> dict:
    source = ROOT.joinpath('data/previews.js').read_text(encoding='utf-8')
    match = re.search(r'module\.exports = (\{.*\});\s*$', source, re.S)
    if not match:
        fail('无法解析 data/previews.js')
    return json.loads(match.group(1))


def check_app_json() -> None:
    print('=== 1. app.json 分包 ===')
    app = json.loads(ROOT.joinpath('app.json').read_text(encoding='utf-8'))
    if 'pages/preview/preview' in app.get('pages', []):
        fail('预览模板不应注册到主包')
    preview_packages = [
        package for package in app.get('subpackages', [])
        if str(package.get('root', '')).startswith('packages/preview-')
    ]
    if len(preview_packages) != 7:
        fail('应配置 7 个预览分包')
    for package in preview_packages:
        if package.get('pages') != ['pages/preview/preview']:
            fail(f"{package.get('root')} 页面配置异常")
    ok('主包、高清地图分包与 7 个预览分包配置正常')


def check_template_sync() -> None:
    print('\n=== 2. 预览模板同步 ===')
    source = ROOT / 'pages' / 'preview'
    for package_root in PACKAGE_ROOTS:
        target = package_root / 'pages' / 'preview'
        for name in PAGE_FILES:
            source_hash = hashlib.sha256((source / name).read_bytes()).hexdigest()
            target_hash = hashlib.sha256((target / name).read_bytes()).hexdigest()
            if source_hash != target_hash:
                fail(f'{target.relative_to(ROOT)}/{name} 未与源模板同步')
    ok('7 个分包预览页面与源模板完全一致')


def check_javascript() -> None:
    print('\n=== 3. 预览 JavaScript ===')
    files = [ROOT / 'utils' / 'doc.js', ROOT / 'data' / 'previews.js']
    files.extend(root / 'pages' / 'preview' / 'preview.js' for root in PACKAGE_ROOTS)
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
    preview_source = ROOT.joinpath('pages/preview/preview.js').read_text(encoding='utf-8')
    if 'WINDOW_RADIUS = 2' not in preview_source or 'updateWindow' not in preview_source:
        fail('预览页未启用相邻页窗口加载')
    ok('预览逻辑语法正常，已启用相邻页窗口加载')


def check_manifest_files() -> None:
    print('\n=== 4. manifest 与图片完整性 ===')
    manifest = load_manifest()
    if len(manifest) != 13:
        fail(f'本地预览文档应为 13 份，实际 {len(manifest)}')

    referenced = set()
    missing = []
    for name, meta in manifest.items():
        ranges = meta.get('ranges') or []
        if not ranges:
            fail(f'{name} 没有 ranges')
        for root, start, end in ranges:
            if start > end:
                fail(f'{name} ranges 起止页错误')
            for page in range(start, end + 1):
                path = ROOT / root.lstrip('/') / meta['dir'] / f'page-{page:02d}.jpg'
                referenced.add(path.resolve())
                if not path.exists():
                    missing.append(str(path.relative_to(ROOT)))
    if missing:
        fail('缺失预览图片：' + ', '.join(missing[:8]))

    actual = {path.resolve() for path in ROOT.joinpath('packages').rglob('page-*.jpg')}
    extras = actual - referenced
    if extras:
        fail(f'存在 {len(extras)} 张未被 manifest 引用的预览图片')
    if len(actual) != 142:
        fail(f'预览图片应为 142 张，实际 {len(actual)}')
    ok('13 份文档、142 张预览图片全部存在且均被引用')


def check_package_sizes() -> None:
    print('\n=== 5. 分包体积 ===')
    for root in PACKAGE_ROOTS:
        size = sum(path.stat().st_size for path in root.rglob('*') if path.is_file())
        label = str(root.relative_to(ROOT))
        if size >= MAX_BYTES:
            fail(f'{label}: {size / 1024:.1f} KiB，超过 2 MiB')
        if size >= WARN_BYTES:
            print(f'  ⚠️  {label}: {size / 1024:.1f} KiB，接近 2 MiB 上限')
        else:
            print(f'  ✅ {label}: {size / 1024:.1f} KiB')


def main() -> None:
    check_app_json()
    check_template_sync()
    check_javascript()
    check_manifest_files()
    check_package_sizes()
    print('\n=== 预览校验完成 ===')


if __name__ == '__main__':
    main()
