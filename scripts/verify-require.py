#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证小程序所有相对 require 路径都能解析到真实文件。
用法: python3 scripts/verify-require.py
背景: 微信小程序 require 规则与 Node 一致（自动补 .js/.json/index.js），
      路径错误会导致编译失败、页面白屏；node --check 查不出来。
"""
import os, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'data', 'utils', 'components', 'node_modules', '.git', 'assets'}
# 这些是未注册的孤儿页面（app.json 主包/分包都没有），微信不编译，允许路径错误
KNOWN_ORPHANS = {'pages/preview/preview.js'}


def resolve_like_node(from_dir, req):
    base = os.path.normpath(os.path.join(from_dir, req))
    candidates = [base, base + '.js', base + '.json',
                  os.path.join(base, 'index.js'), os.path.join(base, 'index.json')]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


def load_registered_pages():
    """从 app.json 解析所有已注册页面路径（主包 + 分包）"""
    with open(os.path.join(ROOT, 'app.json'), encoding='utf-8') as f:
        cfg = json.load(f)
    registered = set()
    for p in cfg.get('pages', []):
        registered.add(p)
    for sub in cfg.get('subpackages', []) or cfg.get('subPackages', []):
        root = sub.get('root', '')
        for p in sub.get('pages', []):
            registered.add(os.path.join(root, p))
    return registered


def main():
    registered = load_registered_pages()
    bad = 0
    checked = 0
    for base in ('pages', 'packages'):
        for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, base)):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if not fn.endswith('.js'):
                    continue
                rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
                rel_no_ext = rel[:-3]
                if rel_no_ext not in registered and rel not in registered:
                    continue  # 只检查已注册页面
                full = os.path.join(dirpath, fn)
                with open(full, encoding='utf-8') as f:
                    src = f.read()
                for m in re.finditer(r"require\(['\"]([^'\"]+)['\"]\)", src):
                    req = m.group(1)
                    if req.startswith('.'):
                        checked += 1
                        if not resolve_like_node(dirpath, req):
                            print('❌ {} -> {}'.format(rel, req))
                            bad += 1
    print('共检查 {} 个相对 require'.format(checked))
    if bad == 0:
        print('✅ 所有已注册页面的 require 路径均可解析')
        return 0
    print('❌ {} 个路径错误'.format(bad))
    return 1


if __name__ == '__main__':
    import re
    sys.exit(main())
