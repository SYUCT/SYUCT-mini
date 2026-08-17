#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证运行目录内所有静态相对 require 路径都能解析到真实文件。"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ROOT = PROJECT_ROOT / 'miniprogram'
RE_REQUIRE = re.compile(r"require\(['\"]([^'\"]+)['\"]\)")


def resolve_like_node(from_dir: Path, request: str) -> Path | None:
    base = (from_dir / request).resolve()
    candidates = [
        base,
        Path(str(base) + '.js'),
        Path(str(base) + '.json'),
        base / 'index.js',
        base / 'index.json',
    ]
    return next((candidate for candidate in candidates if candidate.exists()), None)


def main() -> int:
    bad = []
    checked = 0
    files = sorted(ROOT.rglob('*.js'))

    for path in files:
        text = path.read_text(encoding='utf-8')
        for request in RE_REQUIRE.findall(text):
            if not request.startswith('.'):
                continue
            checked += 1
            resolved = resolve_like_node(path.parent, request)
            if resolved is None:
                bad.append(f'{path.relative_to(ROOT)} -> {request}')

    print(f'共扫描 {len(files)} 个 JavaScript 文件，检查 {checked} 个静态相对 require')
    if not bad:
        print('✅ 所有静态相对 require 路径均可解析')
        return 0

    for item in bad:
        print('❌ ' + item)
    print(f'❌ 共 {len(bad)} 个路径错误')
    return 1


if __name__ == '__main__':
    sys.exit(main())
