with open('docs-audit/REPORT.md', 'a', encoding='utf-8') as f:
    f.write('\n### C. Hasil Audit Fase 2: Modul Auth\n\n')
    
    f.write('#### 1. POST /api/v1/auth/login\n')
    f.write('- **Lokasi**: `docs/api-test/01-auth.md` | `src/auth/global/login.ts`\n')
    f.write('- **Temuan Body & Params**: Sesuai.\n')
    f.write('- **Temuan Response Sukses**: Di dokumentasi tertulis mengembalikan `user.role` dan `user.id_users`, tetapi di kode hanya mengembalikan `id`, `name`, `email` (tidak ada `role`, dan penamaan ID adalah `id` bukan `id_users`). Di kode juga ada tambahan `token_type` dan `expires_in` di dalam objek `tokens`.\n')
    f.write('- **Temuan Error**: Sesuai.\n')
    f.write('- **Keparahan**: **Sedang** (Perbedaan nama field ID dan hilangnya role bisa membuat client kebingungan).\n\n')

    f.write('#### 2. POST /api/v1/auth/signup\n')
    f.write('- **Lokasi**: `docs/api-test/01-auth.md` | `src/auth/global/signup.ts`\n')
    f.write('- **Temuan Body & Params**: Kode memiliki status `400 DATA_TYPE_INVALID` jika data kosong, dan tidak ada di doc.\n')
    f.write('- **Temuan Response Sukses**: Dokumentasi tidak menyebutkan kembalian data apa-apa selain status dan pesan. Tetapi di implementasi, fungsi mengembalikan *nested object* `data: { data: { user, tokens } }` yang artinya pengguna langsung ter-login setelah mendaftar.\n')
    f.write('- **Keparahan**: **Sedang** (Fitur auto-login tidak terdokumentasi).\n\n')

    f.write('#### 3. POST /api/v1/auth/forgot-password\n')
    f.write('- **Lokasi**: `docs/api-test/01-auth.md` | `src/auth/global/forgotpass.ts`\n')
    f.write('- **Temuan Response Sukses**: Dokumentasi mengatakan hanya mengirim `code: OTP_SENT`. Kenyataannya, API mengembalikan objek `hash` dan `expiresAt` di dalam field `data` (yang sangat krusial untuk endpoint reset password berikutnya).\n')
    f.write('- **Temuan Error**: Kode memiliki validasi format email (`400 EMAIL_FORMAT_INVALID`) yang tidak ada di dokumentasi.\n')
    f.write('- **Keparahan**: **Tinggi** (Klien tidak akan tahu mereka harus menyimpan `hash` dan `expiresAt`).\n\n')

    f.write('#### 4. POST /api/v1/auth/reset-password\n')
    f.write('- **Lokasi**: `docs/api-test/01-auth.md` | `src/auth/global/resetpass.ts`\n')
    f.write('- **Temuan Body & Params**: Di dokumentasi, body hanya perlu `email, otp, new_password, confirm_password`. Namun di KODE, API mengharuskan adanya parameter `hash` dan `expiresAt`! (Dan ironisnya, `confirm_password` malah tidak divalidasi sama sekali di kode).\n')
    f.write('- **Keparahan**: **Tinggi** (Klien yang mengikuti dokumentasi akan selalu ditolak dengan `400 DATA_INCOMPLETE`).\n\n')

    f.write('#### 5. POST /api/v1/auth/refresh\n')
    f.write('- **Lokasi**: `docs/api-test/01-auth.md` | `src/auth/global/tk-refresh.ts`\n')
    f.write('- **Temuan Response Sukses**: Dokumentasi menyebutkan akan menerima `access_token` dan `refresh_token` baru. Kenyataannya kode *hanya* mereturn `access_token` baru dan `expires_in`.\n')
    f.write('- **Keparahan**: **Tinggi** (Klien akan gagal jika mencoba menimpa refresh_token lama dengan `undefined`).\n\n')

    f.write('#### 6. POST /api/v1/auth/logout\n')
    f.write('- **Lokasi**: `docs/api-test/01-auth.md` | `src/auth/global/logout.ts`\n')
    f.write('- **Temuan Body & Params**: Di dokumentasi ditulis key-nya adalah `refresh_token`. Kenyataannya di KODE, key yang dicari adalah `rf_token` (`const reqToken = body.rf_token`).\n')
    f.write('- **Temuan Error**: Kode mereturn `400 REFRESH_TOKEN_NOT_FOUND`, sementara doc `REFRESH_TOKEN_REQUIRED`.\n')
    f.write('- **Keparahan**: **Tinggi** (Klien yang mengikuti doc tidak akan pernah berhasil logout karena salah nama parameter).\n\n')
