import os

def read_progress():
    content = open('docs-audit/PROGRESS.md', encoding='utf-8').read()
    lines = content.split('\n')
    
    match = []
    only_code = []
    only_docs = []
    
    current = None
    for line in lines:
        if line.startswith('### Endpoints di Kode dan Dokumentasi'):
            current = match
        elif line.startswith('### Endpoints HANYA di Kode'):
            current = only_code
        elif line.startswith('### Endpoints HANYA di Dokumentasi'):
            current = only_docs
        elif line.startswith('- [ ] '):
            ep = line.replace('- [ ] ', '').strip()
            if current is not None:
                current.append(ep)
                
    return match, only_code, only_docs

match, only_code, only_docs = read_progress()

with open('docs-audit/REPORT.md', 'w', encoding='utf-8') as f:
    f.write('# Laporan Audit Dokumentasi API\n\n')
    
    f.write('## 1. Ringkasan\n')
    total_code = len(match) + len(only_code)
    total_docs = len(match) + len(only_docs)
    f.write(f'- Total endpoint di kode: {total_code}\n')
    f.write(f'- Total endpoint di dokumentasi: {total_docs}\n')
    f.write(f'- Sesuai (Match/Terdokumentasi & Ada di Kode): {len(match)}\n')
    f.write(f'- Kurang Dokumentasi (Hanya di Kode): {len(only_code)}\n')
    f.write(f'- Dokumentasi Yatim (Tidak ada di Kode): {len(only_docs)}\n\n')
    
    f.write('## 2. Tabel Ringkas Endpoint (Fase 1)\n')
    f.write('| Method | Path | Status | Temuan Utama |\n')
    f.write('|---|---|---|---|\n')
    
    for ep in sorted(match):
        method, path = ep.split(' ', 1)
        f.write(f'| {method} | {path} | Sesuai | Belum di-audit detail |\n')
        
    for ep in sorted(only_code):
        method, path = ep.split(' ', 1)
        f.write(f'| {method} | {path} | Kurang Dokumentasi | Endpoint ini aktif di kode namun tidak ada di dokumen markdown. |\n')
        
    for ep in sorted(only_docs):
        method, path = ep.split(' ', 1)
        f.write(f'| {method} | {path} | Dokumentasi Yatim | Terdokumentasi namun routing tidak ditemukan di kode! |\n')

    f.write('\n## 3. Detail Temuan Fase 1 (Masalah Struktur Rute)\n\n')
    
    f.write('### A. Endpoint Salah Path / Typo di Dokumentasi\n')
    f.write('- Dokumentasi mencatat `PATCH /api/v1/users/account/warga/promote/:id_user` dan `demote`, padahal implementasi aslinya berada di modul admin yaitu `PATCH /api/v1/admin/promote/:id_user` dan `demote`. Tingkat keparahan: **Tinggi** (URL salah total).\n')
    f.write('- Saran perbaikan: Ubah path di dokumentasi agar menunjuk ke `/api/v1/admin/...`.\n\n')
    
    f.write('### B. Endpoint Fiktif (Tidak Ada di Kode)\n')
    f.write('- `GET /api/v1/announcements/:id` didokumentasikan untuk mengambil 1 pengumuman, namun di `anc-routes.ts` tidak pernah dibuatkan rute `GET /:id`. Tingkat keparahan: **Tinggi** (Client akan mendapat 404).\n')
    f.write('- Saran perbaikan: Hapus dokumentasi endpoint ini, atau buat implementasi kodenya.\n\n')
    
    f.write('## 4. Hal yang Tidak Bisa Dipastikan (Menunggu Fase 2 / Konfirmasi Manusia)\n')
    f.write('- Audit detail (body request, tipe data, dll) untuk 56 endpoint yang *match* belum dilakukan di Laporan Fase 1 ini untuk menghindari informasi yang terlalu padat. Audit Fase 2 akan dilakukan satu per satu setelah laporan inventaris ini disetujui.\n')
