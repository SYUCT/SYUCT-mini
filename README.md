# SYUCT 微信小程序备份

沈阳化工大学校园指南（非官方学生共建）的微信小程序端备份仓库。

- 小程序版本：`v1.4.5-mini`
- 同步的网页版版本：`v1.29`
- 内容同步日期：`2026-08-14`
- 资料数量：42 份
- 网页版仓库：`SYUCT/SYUCT-web`
- 网页版地址：`https://www.syuct.top/`
- 小程序备份仓库：`SYUCT/SYUCT-mini`

## 项目结构

从 v1.3.2 开始，开发者工具工作区与小程序运行目录分离：

```text
syuct-miniprogram/
├── project.config.json        # 开发者工具工程配置，长期保持在外层
├── project.private.config.json# 开发者工具本机生成，不进入发布包
├── README.md
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

## v1.3.2 结构与体积优化

- 工作区和运行目录分离，避免版本更新时反复导入工程。
- 九个原生文档分包共用 `utils/native-document.js`，文档打开逻辑只维护一份。
- 两个高清地图分包共用 `utils/zoomable-map-page.js`，缩放逻辑只维护一份。
- 地图页/地图详情页、校园生活页/详情页各自内联页面逻辑，不经过页面工厂，避免主包页面注入回归（由 `verify-sync.py` 强制校验）。
- 高清地图图片做保守压缩；体育地图使用无损 WebP（原 PNG 的 alpha 通道全不透明，属无效数据）。
- PDF / Word / Excel / PPT 源文件 <= 3 MiB 时仍使用固定分包数据，由 `wx.openDocument` 原生打开；较大文件继续复制网页版链接。

## 校验

```bash
python3 scripts/verify-sync.py
python3 scripts/verify-pdfs.py
python3 scripts/verify-require.py
```

打包发布：

```bash
python3 scripts/build-release.py
```
