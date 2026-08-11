#!/usr/bin/env python3
"""生成 data/previews.js，并校验逐页 JPG 是否存在。"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# 文件名 -> ranges。一个文档可以跨多个分包，每段格式为 [分包 root, 起始页, 结束页]。
RANGE_MAP = {
    'chemical-engineering-plan-2025.pdf': [['/packages/preview-a', 1, 23]],
    'computer-science-plan-2025.pdf': [['/packages/preview-d', 1, 30]],
    'competition-management-reward-2024.pdf': [['/packages/preview-b', 1, 20]],
    'student-regulations.pdf': [['/packages/preview-c', 1, 10], ['/packages/preview-e', 11, 19]],
    'calendar-2026-2027.pdf': [['/packages/preview-e', 1, 1]],
    'summer-campus-stay-2026.pdf': [['/packages/preview-e', 1, 3]],
    'competition-management-supplement-2025.pdf': [['/packages/preview-f', 1, 16]],
    'pe-electives-experience.pdf': [['/packages/preview-f', 1, 2]],
    'webvpn-guide.pdf': [['/packages/preview-f', 1, 3]],
    'physical-fitness-score-tables.pdf': [['/packages/preview-g', 1, 9]],
    'unified-identity-guide.pdf': [['/packages/preview-g', 1, 6]],
    'carsi-guide.pdf': [['/packages/preview-g', 1, 2]],
    'graduate-registration-form.pdf': [['/packages/preview-g', 1, 8]],
}

manifest = {}
for name, ranges in RANGE_MAP.items():
    manifest[name] = {
        'dir': name.removesuffix('.pdf'),
        'ranges': ranges,
    }

output = ROOT / 'data' / 'previews.js'
output.write_text(
    '// 分包预览 manifest（scripts/gen-manifest.py 生成，勿手改）\n'
    + 'module.exports = '
    + json.dumps(manifest, ensure_ascii=False, indent=2)
    + ';\n',
    encoding='utf-8',
)

existing = 0
missing = []
for name, meta in manifest.items():
    for package_root, start, end in meta['ranges']:
        if start > end:
            missing.append(f'{name}: 起始页 {start} 大于结束页 {end}')
            continue
        for page in range(start, end + 1):
            path = ROOT / package_root.lstrip('/') / meta['dir'] / f'page-{page:02d}.jpg'
            if path.exists():
                existing += 1
            else:
                missing.append(str(path.relative_to(ROOT)))

print(f'manifest 已生成：{len(manifest)} 份文档，{existing} 张图片存在')
if missing:
    print(f'缺失 {len(missing)} 项：')
    for item in missing:
        print('  -', item)
    raise SystemExit(1)
