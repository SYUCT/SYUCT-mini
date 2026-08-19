#!/usr/bin/env python3
"""Build one-time workspace and future runtime-update archives."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = PROJECT_ROOT / 'miniprogram'
DIST = PROJECT_ROOT / 'dist'


def read_version() -> str:
    text = (APP_ROOT / 'data/content.js').read_text(encoding='utf-8')
    match = re.search(r"\bversion:\s*'([^']+)'", text)
    if not match:
        raise SystemExit('无法读取 SITE.version')
    version = match.group(1)
    if not re.fullmatch(r'v\d+\.\d+\.\d+-mini', version):
        raise SystemExit(f'SITE.version 格式无效：{version}，应类似 v1.4.5-mini')
    return version


def run_checks() -> None:
    for script in ('verify-sync.py', 'verify-pdfs.py', 'verify-require.py'):
        subprocess.run(['python3', str(PROJECT_ROOT / 'scripts' / script)], cwd=PROJECT_ROOT, check=True)


def should_skip(path: Path) -> bool:
    rel = path.relative_to(PROJECT_ROOT)
    parts = rel.parts
    if not parts:
        return False
    if parts[0] in {'.git', 'dist'}:
        return True
    if path.name in {'.DS_Store', 'project.private.config.json'}:
        return True
    if '__MACOSX' in parts:
        return True
    return False


def write_workspace_zip(target: Path) -> None:
    outer = 'syuct-miniprogram'
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in sorted(PROJECT_ROOT.rglob('*')):
            if not path.is_file() or should_skip(path):
                continue
            rel = path.relative_to(PROJECT_ROOT)
            zf.write(path, f'{outer}/{rel.as_posix()}')


def write_runtime_zip(target: Path) -> None:
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in sorted(APP_ROOT.rglob('*')):
            if not path.is_file() or path.name == '.DS_Store' or '__MACOSX' in path.parts:
                continue
            zf.write(path, path.relative_to(APP_ROOT).as_posix())


def verify_runtime_zip(target: Path) -> None:
    with zipfile.ZipFile(target) as zf:
        names = set(zf.namelist())
        required = {
            'app.js',
            'app.json',
            'packages/pdf-i/pages/open/open.wxml',
            'packages/pdf-i/pages/open/open.js',
        }
        missing = sorted(required - names)
        if missing:
            raise SystemExit('runtime update 缺少文件: ' + ', '.join(missing))
        app = json.loads(zf.read('app.json').decode('utf-8'))
        if not app.get('subPackages'):
            raise SystemExit('runtime update 的 app.json 缺少 subPackages')


def main() -> None:
    run_checks()
    version = read_version()
    DIST.mkdir(exist_ok=True)
    for old in DIST.glob('syuct-miniprogram-*.zip'):
        old.unlink()

    workspace = DIST / f'syuct-miniprogram-{version}-workspace.zip'
    runtime = DIST / f'syuct-miniprogram-{version}-runtime-update.zip'
    write_workspace_zip(workspace)
    write_runtime_zip(runtime)
    verify_runtime_zip(runtime)

    print(f'workspace: {workspace} ({workspace.stat().st_size / 1024 / 1024:.2f} MiB)')
    print(f'runtime:   {runtime} ({runtime.stat().st_size / 1024 / 1024:.2f} MiB)')


if __name__ == '__main__':
    main()
