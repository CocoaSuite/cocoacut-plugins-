# Rebuilds index.json from the headers of the files in plugins/. Run: python3 update-index.py
import hashlib, json, pathlib, re
items = []
for f in sorted(pathlib.Path('plugins').glob('*.cocoa.js')):
    code = f.read_text(encoding='utf-8')
    head = re.search(r'==CocoaCut Plugin==(.*?)==/CocoaCut Plugin==', code, re.S)
    if not head:
        print('skipped (no header):', f); continue
    meta = dict(re.findall(r'@(\w+)\s+(.+)', head.group(1)))
    meta = {k: v.strip() for k, v in meta.items()}
    items.append({
        'id': meta['id'], 'name': meta.get('name', meta['id']), 'version': meta.get('version', '1'),
        'author': meta.get('author', ''), 'description': meta.get('description', ''),
        'access': 'full' if meta.get('access', '').lower() == 'full' else 'safe',
        'permissions': [p for p in re.split(r'[\s,]+', meta.get('permissions', '').lower()) if p],
        'path': f.as_posix(), 'sha256': hashlib.sha256(code.encode('utf-8')).hexdigest()})
pathlib.Path('index.json').write_text(json.dumps({'schema': 1, 'plugins': items}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print('index.json:', len(items), 'plugins')
