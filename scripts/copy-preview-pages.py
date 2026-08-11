#!/usr/bin/env python3
# 把 preview 页面复制到每个分包（分包页面引用分包内资源，合法）
import os, shutil

SRC = 'pages/preview'
PAGE_FILES = ['preview.js', 'preview.wxml', 'preview.wxss', 'preview.json']

for root in ['packages/preview-a', 'packages/preview-b', 'packages/preview-c',
             'packages/preview-d', 'packages/preview-e', 'packages/preview-f',
             'packages/preview-g']:
    dst = os.path.join(root, 'pages', 'preview')
    os.makedirs(dst, exist_ok=True)
    for f in PAGE_FILES:
        shutil.copy(os.path.join(SRC, f), os.path.join(dst, f))
    print(f'{root}/pages/preview/ ✅')

print('\n复制完成')
