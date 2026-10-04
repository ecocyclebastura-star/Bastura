import os, re, glob

route_files = {
  'admin-routes.ts': '/api/v1/admin',
  'auth-routes.ts': '/api/v1/auth',
  'tsc-routes.ts': '/api/v1/transaction',
  'anc-routes.ts': '/api/v1/announcements',
  'edu-routes.ts': '/api/v1/education',
  'update-routes.ts': '/api/v1/updates',
  'profile-routes.ts': '/api/v1/users/account',
  'catalog-route.ts': '/api/v1/waste',
  'splitbills-routes.ts': '/api/v1/splitbills',
  'deposit-routes.ts': '/api/v1/deposits'
}

endpoints_code = set()
code_map = {}
for file, prefix in route_files.items():
  path = os.path.join('bastura-api/src/routes', file)
  if not os.path.exists(path): continue
  content = open(path, encoding='utf-8').read()
  for line in content.split('\n'):
    m = re.search(r'\.(get|post|put|patch|delete)\(([\'"])(.*?)\2', line)
    if m:
      method = m.group(1).upper()
      subpath = m.group(3)
      if subpath == '/': subpath = ''
      full = prefix + subpath
      ep = f'{method} {full}'
      endpoints_code.add(ep)
      code_map[ep] = file

endpoints_docs = set()
doc_files = glob.glob('docs/api-test/*.md')
for path in doc_files:
  content = open(path, encoding='utf-8').read()
  lines = content.split('\n')
  for i, line in enumerate(lines):
    # Method 1: `- **Endpoint**: `/api/v1/auth/login``
    if '- **Endpoint**:' in line:
        ep_path = re.search(r'`([^`]+)`', line)
        if ep_path:
            # find the method before it
            for j in range(i, max(-1, i-5), -1):
                if '- **Method**:' in lines[j]:
                    method_match = re.search(r'`([^`]+)`', lines[j])
                    if method_match:
                        endpoints_docs.add(f'{method_match.group(1).upper()} {ep_path.group(1)}')
                    break
    
    # Method 2: `### [DEP-GET-LIST] GET /api/v1/deposits`
    elif line.startswith('### ') and ']' in line:
        m = re.search(r'(GET|POST|PUT|PATCH|DELETE)\s+(/[-/A-Za-z0-9_:]+)', line)
        if m:
            endpoints_docs.add(f'{m.group(1)} {m.group(2)}')


with open('docs-audit/PROGRESS.md', 'w', encoding='utf-8') as f:
    f.write('# Progress Audit API\n\n')
    f.write('## Fase 1: Inventaris (Siap diverifikasi detail)\n\n')
    f.write('### Endpoints di Kode dan Dokumentasi (Match)\n')
    for ep in sorted(endpoints_code & endpoints_docs):
        f.write(f'- [ ] {ep}\n')
        
    f.write('\n### Endpoints HANYA di Kode (Kurang Dokumentasi)\n')
    for ep in sorted(endpoints_code - endpoints_docs):
        f.write(f'- [ ] {ep}\n')
        
    f.write('\n### Endpoints HANYA di Dokumentasi (Kode tidak ditemukan / Salah Tulis)\n')
    for ep in sorted(endpoints_docs - endpoints_code):
        f.write(f'- [ ] {ep}\n')

with open('docs-audit/REPORT.md', 'w', encoding='utf-8') as f:
    f.write('# Laporan Audit Dokumentasi API\n\n')
    f.write('## Ringkasan\n')
    f.write(f'- Total endpoint di kode: {len(endpoints_code)}\n')
    f.write(f'- Total endpoint di dokumentasi: {len(endpoints_docs)}\n')
    f.write(f'- Sesuai (Match): {len(endpoints_code & endpoints_docs)}\n')
    f.write(f'- Hanya di Kode: {len(endpoints_code - endpoints_docs)}\n')
    f.write(f'- Hanya di Dokumentasi: {len(endpoints_docs - endpoints_code)}\n')
    f.write('\n## Laporan Verifikasi Detail\n')
