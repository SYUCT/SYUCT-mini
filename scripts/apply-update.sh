#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_ROOT="$PROJECT_ROOT/miniprogram"
ZIP_PATH="${1:-}"

if [[ -z "$ZIP_PATH" ]]; then
  echo "用法: bash scripts/apply-update.sh /path/to/runtime-update.zip" >&2
  exit 2
fi

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "更新包不存在: $ZIP_PATH" >&2
  exit 2
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/syuct-update.XXXXXX")"
BACKUP_DIR="$PROJECT_ROOT/.miniprogram-backup"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$TMP_DIR/runtime"
unzip -q "$ZIP_PATH" -d "$TMP_DIR/runtime"

if [[ ! -f "$TMP_DIR/runtime/app.json" || ! -f "$TMP_DIR/runtime/app.js" ]]; then
  echo "这不是有效的 SYUCT runtime update：根目录缺少 app.json/app.js" >&2
  exit 1
fi

python3 - "$TMP_DIR/runtime/app.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding='utf-8') as f:
    cfg = json.load(f)
if not cfg.get('pages'):
    raise SystemExit('app.json 缺少 pages')
if not (cfg.get('subPackages') or cfg.get('subpackages')):
    raise SystemExit('app.json 缺少分包配置')
PY

rm -rf "$BACKUP_DIR"
if [[ -d "$APP_ROOT" ]]; then
  mv "$APP_ROOT" "$BACKUP_DIR"
fi

if mv "$TMP_DIR/runtime" "$APP_ROOT"; then
  rm -rf "$BACKUP_DIR"
  echo "更新完成。回到微信开发者工具重新编译即可，无需重新导入。"
else
  rm -rf "$APP_ROOT"
  if [[ -d "$BACKUP_DIR" ]]; then
    mv "$BACKUP_DIR" "$APP_ROOT"
  fi
  echo "更新失败，已恢复原运行目录。" >&2
  exit 1
fi
