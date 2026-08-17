#!/usr/bin/env python3
from pathlib import Path
import brotli, json, re, sys
PROJECT_ROOT=Path(__file__).resolve().parents[1]
ROOT=PROJECT_ROOT/'miniprogram'
CFG=json.loads((PROJECT_ROOT/'scripts/pdf-sources.json').read_text(encoding='utf-8'))
THRESH=CFG['thresholdBytes']; MAX=int(1.8*1024*1024)
ALPH='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#'; MAP={c:i for i,c in enumerate(ALPH)}
def fail(msg): print('FAIL:',msg); raise SystemExit(1)
def z85dec(text,length):
    if len(text)%5: fail('Z85 length invalid')
    out=bytearray()
    for i in range(0,len(text),5):
        n=0
        for c in text[i:i+5]: n=n*85+MAP[c]
        out.extend(n.to_bytes(4,'big'))
    return bytes(out[:length])
previews_text=(ROOT/'data/previews.js').read_text(encoding='utf-8')
previews=json.loads(previews_text.split('module.exports = ',1)[1].rsplit(';',1)[0])
restored=0
for pkg,names in CFG['packages'].items():
    p=ROOT/pkg; size=sum(x.stat().st_size for x in p.rglob('*') if x.is_file())
    if size>=MAX: fail(f'{pkg} >= 1.8 MiB')
    manifest=json.loads((p/'data/manifest.js').read_text(encoding='utf-8').split('module.exports = ',1)[1].rsplit(';',1)[0])
    payload=''
    for i in range(1,13):
        s=(p/f'data/payload-{i:02d}.js').read_text(encoding='ascii')
        payload+=s.split("'",1)[1].rsplit("'",1)[0]
    for name in names:
        m=manifest.get(name)
        if not m: fail(f'{name} missing manifest')
        part=payload[m['offset']:m['offset']+m['chars']]
        packed=z85dec(part,m['compressedLength']); raw=brotli.decompress(packed)
        if len(raw)!=m['byteLength']: fail(f'{name} byteLength mismatch')
        if name not in previews: fail(f'{name} missing previews')
        restored+=1
for d in CFG['documents']:
    name=d['file']; size=d['sourceBytes']; internal=d['internal']
    if size<=THRESH and not internal: fail(f'{name} <= 3 MiB should be internal')
    if size>THRESH and internal: fail(f'{name} > 3 MiB should be external')
    if internal and name not in previews: fail(f'{name} internal but absent from previews')
    if (not internal) and name in previews: fail(f'{name} external but present in previews')
print(f'OK: {restored} native documents restore successfully; 3 MiB routing is correct')
