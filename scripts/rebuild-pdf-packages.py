#!/usr/bin/env python3
"""Rebuild fixed native-document packages from canonical source files.

Usage:
  python3 scripts/rebuild-pdf-packages.py /path/to/source-documents

Despite the historical filename, this rebuilds PDF/Word/Excel/PPT payloads. Source bytes
are Brotli-compressed losslessly, then Z85-encoded into fixed CommonJS string modules.
"""
from pathlib import Path
import brotli, hashlib, json, sys
PROJECT_ROOT=Path(__file__).resolve().parents[1]
ROOT=PROJECT_ROOT/'miniprogram'
if len(sys.argv)!=2: raise SystemExit('usage: rebuild-pdf-packages.py /path/to/source-documents')
SRC=Path(sys.argv[1]); CFG=json.loads((PROJECT_ROOT/'scripts/pdf-sources.json').read_text(encoding='utf-8'))
PACKAGES=CFG['packages']; MAX=int(1.8*1024*1024); CHUNKS=12
ALPH='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#'
def z85(data):
    data=data+b'\0'*((-len(data))%4); out=[]
    for i in range(0,len(data),4):
        n=int.from_bytes(data[i:i+4],'big'); block=['']*5
        for j in range(4,-1,-1): n,r=divmod(n,85); block[j]=ALPH[r]
        out.extend(block)
    return ''.join(out)
for package_root,docs in PACKAGES.items():
    data_dir=ROOT/package_root/'data'; manifest={}; payload=[]; cursor=0
    for name in docs:
        path=SRC/name
        if not path.exists(): raise SystemExit(f'missing source: {path}')
        raw=path.read_bytes(); ext=path.suffix.lower().lstrip('.')
        packed=brotli.compress(raw,quality=9); text=z85(packed)
        manifest[name]={'offset':cursor,'chars':len(text),'byteLength':len(raw),'compressedLength':len(packed),
            'cacheName':f"syuct-{path.stem}-{hashlib.sha256(raw).hexdigest()[:12]}.{ext}",'fileType':ext}
        payload.append(text); cursor+=len(text)
    all_text=''.join(payload); n=len(all_text); bounds=[round(i*n/CHUNKS) for i in range(CHUNKS+1)]
    for i in range(CHUNKS):
        part=all_text[bounds[i]:bounds[i+1]]
        (data_dir/f'payload-{i+1:02d}.js').write_text("module.exports='"+part+"';\n",encoding='ascii',newline='')
    reqs=',\n  '.join([f"require('./payload-{i+1:02d}.js')" for i in range(CHUNKS)])
    (data_dir/'payload.js').write_text("module.exports = [\n  "+reqs+"\n].join('');\n",encoding='ascii')
    (data_dir/'manifest.js').write_text('module.exports = '+json.dumps(manifest,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    size=sum(p.stat().st_size for p in (ROOT/package_root).rglob('*') if p.is_file())
    if size>=MAX: raise SystemExit(f'{package_root} too large: {size/1048576:.3f} MiB')
    print(f'{package_root}: {size/1048576:.3f} MiB')
