<div align="center">

<img src="docs/promo-banner.webp" alt="沈阳化工大学校园指南 · SYUCT Campus Guide" width="100%">

# SYUCT 微信小程序

沈阳化工大学校园指南（非官方学生共建）的微信小程序端仓库。

**信息安全 · 仅存本机　|　隐私保护 · 数据不上传**

</div>

## 关于本项目

一站式校园信息汇总，由学生整理、为学生服务。小程序端**不依赖任何服务器**：42 份资料、校园地图和课表功能全部内置在包体内，课表数据只保存在本机，不经过任何后端。

| | |
|---|---|
| 小程序版本 | `v1.4.5-mini` |
| 同步的网页版版本 | `v1.29` |
| 内容同步日期 | `2026-08-14` |
| 资料数量 | 42 份（另有 1 份致谢文档）；39 份内置原生打开，4 份超 3 MiB 走网页版 |
| 网页版 | [www.syuct.top](https://www.syuct.top/) · 仓库 `SYUCT/SYUCT-web` |
| 小程序仓库 | `SYUCT/SYUCT-mini` |

## 功能

**课表管理** —— 本周课程、导入课表（课表码 / JSON）、生成课表码分享、当前课程高亮。课表码可从网页版生成，班群里互相转发即可导入。

**校园服务** —— 校园地图（含高清总图、体育课地图、快递取件图）、学习资料下载、校园生活指南、新生入学、办事大厅、数字校园。

## 项目结构

从 v1.3.2 开始，开发者工具工作区与小程序运行目录分离：

```text
syuct-miniprogram/
├── project.config.json        # 开发者工具工程配置，长期保持在外层
├── project.private.config.json# 开发者工具本机生成，不进入发布包
├── README.md
├── docs/                      # 宣传素材等，不参与小程序打包
├── scripts/                   # 校验、构建、更新工具，不参与小程序打包
└── miniprogram/               # 真正上传/预览的小程序运行目录
    ├── app.js
    ├── app.json
    ├── app.wxss
    ├── pages/
    ├── packages/
    ├── data/
    ├── utils/
    └── assets/
```

`project.config.json` 固定使用 `miniprogramRoot: "miniprogram/"`。因此只要外层 `syuct-miniprogram` 目录位置不变，微信开发者工具只需导入一次；后续更新直接替换 `miniprogram/` 即可，不需要重新导入项目。

> `miniprogram/` 之外的目录都不会计入小程序包体，新增素材请放在 `docs/`，不要放进 `miniprogram/assets/`。

## 第一次导入

1. 把完整工程解压到一个长期不改路径的位置，例如 `~/Projects/syuct-miniprogram/`。
2. 微信开发者工具选择“导入项目”。
3. 选择外层 `syuct-miniprogram/`，也就是能直接看到 `project.config.json` 的目录。
4. 以后不要更换这个外层目录路径。

## 后续覆盖更新

后续发布可以只提供“runtime update”压缩包。它的根目录就是 `app.js`、`app.json`、`pages/`、`packages/` 等运行文件。

推荐两种更新方式：

- 手动：把更新包内容覆盖到现有的 `syuct-miniprogram/miniprogram/`。
- 脚本：在项目根目录执行 `bash scripts/apply-update.sh /path/to/runtime-update.zip`。脚本会先校验更新包，再整体替换 `miniprogram/`，外层工程配置和开发者工具本机配置不会动。

更新后回到微信开发者工具重新“编译”即可，不需要重新导入。

## 结构与体积优化

微信限制：主包 ≤ 2 MiB，单个分包 ≤ 2 MiB，主包 + 全部分包 ≤ 20 MiB。当前主包约 1.18 MiB、总量约 17.43 MiB。

- 工作区和运行目录分离，避免版本更新时反复导入工程。
- 九个原生文档分包共用 `utils/native-document.js`，文档打开逻辑只维护一份。
- 文档以 Brotli(quality=11) 压缩后 Z85 编码为固定字符串模块，运行时由 `wx.openDocument` 原生打开。Z85 膨胀 25%，比 base64 的 33% 更省。
- 两个高清地图分包共用 `utils/zoomable-map-page.js`，缩放逻辑只维护一份。
- 地图页/地图详情页、校园生活页/详情页各自内联页面逻辑，不经过页面工厂，避免主包页面注入回归（由 `verify-sync.py` 强制校验）。
- 高清地图图片做保守压缩；体育地图使用无损 WebP（原 PNG 的 alpha 通道全不透明，属无效数据）。
- PDF / Word / Excel / PPT 源文件 ≤ 3 MiB 时使用固定分包数据原生打开；较大文件复制网页版链接。

## 校验

```bash
node scripts/test-timetable.js    # 课表码、导入容错、双份存储、分享路径回归（85 项断言）
python3 scripts/verify-sync.py     # 内容同步、分包与主包/总包体积
python3 scripts/verify-pdfs.py     # 39 份文档端到端还原 + 3 MiB 路由一致性
python3 scripts/verify-require.py  # 静态相对 require 路径可解析
```

`verify-pdfs.py` 需要 `brotli`：`pip3 install brotli`。以上脚本连同全量 `node --check` 在 push 和 PR 时由 GitHub Actions 自动执行。

`test-timetable.js` 直接 require 运行目录里的真实模块（不复制被测逻辑），以内存桩替换 Storage 与文件系统，因此能覆盖"一份数据损坏、另一份完好"这类仲裁路径。

打包发布：

```bash
python3 scripts/build-release.py
```

## 说明

本项目为非官方学生共建项目。涉及政策、收费、考试、学籍、培养方案和毕业要求的内容，请以学校及学院当年正式通知为准。
