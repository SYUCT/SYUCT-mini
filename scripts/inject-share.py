#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给小程序页面注入分享功能 (onShareAppMessage / onShareTimeline)
用法: python3 scripts/inject-share.py
说明: 为所有未注入的页面添加 withShare() 包装。
      相对路径层数 = rel_path.count('/')（注意：从页面文件所在目录到项目根目录）
"""
import os, re, subprocess, sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(PROJECT_ROOT, 'miniprogram')
sys.path.insert(0, ROOT)


def collect_pages():
    """扫描 pages/ 和 packages/ 下所有 .js 页面文件（排除 data/、utils/、components/）"""
    pages = []
    for base in ('pages', 'packages'):
        for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, base)):
            dirnames[:] = [d for d in dirnames if d not in ('data', 'utils', 'components', 'node_modules')]
            for fn in filenames:
                if fn.endswith('.js') and fn not in ('app.js',):
                    pages.append(os.path.relpath(os.path.join(dirpath, fn), ROOT))
    return pages


def share_require(rel_path):
    # 从文件所在目录到项目根目录需要多少层 ../  = rel_path 里的目录段数 = count('/')
    depth = rel_path.count('/')
    prefix = '../' * depth
    return "const { withShare } = require('{}utils/share');".format(prefix)


def process(rel_path):
    path = os.path.join(ROOT, rel_path)
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    if 'withShare' in src:
        return rel_path, 'SKIP(already)', src

    orig = src
    reqs = list(re.finditer(r"require\([^\)]*\);\n", src))
    if reqs:
        last_req_end = reqs[-1].end()
        inject = '\n' + share_require(rel_path) + '\n'
        src = src[:last_req_end] + inject + src[last_req_end:]
    else:
        inject = share_require(rel_path) + '\n'
        src = inject + src

    idx = src.find('Page({')
    if idx == -1:
        return rel_path, 'FAIL(no Page({)', src
    src = src[:idx] + 'Page(Object.assign({' + src[idx + len('Page({'):]

    last_close = src.rfind('\n});')
    if last_close == -1:
        return rel_path, 'FAIL(no closing)', src
    src = src[:last_close] + '\n}, withShare()));' + src[last_close + len('\n});'):]

    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)

    r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
    if r.returncode != 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(orig)
        return rel_path, 'FAIL(syntax: ' + r.stderr.strip()[:120] + ')', src
    return rel_path, 'OK', src


if __name__ == '__main__':
    for rel in collect_pages():
        status = process(rel)[1]
        print('{:8s} {}'.format(status, rel))
