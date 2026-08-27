/**
 * Seluruh isi Pusat Bantuan. Sengaja hardcode di frontend: kontennya jarang
 * berubah, tidak ada endpoint-nya di backend, dan halaman bantuan justru
 * paling dibutuhkan waktu aplikasi sedang bermasalah -- jadi tidak boleh ikut
 * gagal kalau jaringannya mati.
 */

export type FaqItem = { question: string; answer: string };

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "Bagaimana cara menyetor sampah?",
    answer:
      "Pilah dulu sampah di rumah sesuai jenisnya, lalu bawa ke bank sampah pada jadwal yang diumumkan pengurus RT. Petugas akan menimbang setoran Anda, dan hasilnya masuk ke saldo di aplikasi setelah dicatat.",
  },
  {
    question: "Bagaimana cara menarik saldo?",
    answer:
      "Tekan tombol Tarik Saldo pada kartu saldo di halaman Beranda, lalu ikuti langkah yang muncul. Penarikan diproses oleh pengurus bank sampah, jadi saldo tidak langsung berkurang saat itu juga.",
  },
  {
    question: "Mengapa hasil scan tidak sesuai?",
    answer:
      "Scan mengenali jenis sampah dari foto, jadi hasilnya bisa meleset kalau fotonya buram, kurang cahaya, atau beberapa jenis sampah tertumpuk dalam satu bingkai. Coba foto ulang satu jenis sampah saja dengan cahaya yang cukup. Hasil scan sifatnya membantu memilah, bukan penentu akhir -- petugas tetap memeriksa saat Anda menyetor.",
  },
  {
    question: "Mengapa saldo saya belum bertambah?",
    answer:
      "Saldo baru bertambah setelah setoran Anda ditimbang dan dicatat oleh pengurus, jadi ada jeda antara menyetor dan saldo berubah. Selain itu aplikasi menyimpan data secara lokal supaya tetap bisa dibuka saat offline, dan angkanya disegarkan setelah perangkat kembali terhubung. Kalau setelah beberapa waktu saldo tetap tidak berubah, hubungi pengurus lewat menu Hubungi kami.",
  },
  {
    question: "Jenis sampah apa saja yang diterima?",
    answer:
      "Umumnya sampah anorganik kering yang masih bisa didaur ulang, seperti plastik, kertas dan kardus, logam, serta kaca. Pastikan sampahnya sudah bersih dan kering supaya nilainya tidak turun. Jenis yang diterima bisa berbeda antar bank sampah, jadi sebaiknya dipastikan lagi ke pengurus RT setempat.",
  },
  {
    question: "Bagaimana cara mengubah data profil?",
    answer:
      "Buka Profil, pilih Edit Profil, lalu ubah nama, nomor HP, atau foto profil Anda. Tekan Simpan supaya perubahannya tersimpan. Untuk mengganti kata sandi, gunakan menu Ganti Password di halaman yang sama.",
  },
  {
    question: "Apakah saya bisa menghapus akun?",
    answer:
      "Bisa, lewat Profil lalu Nonaktifkan Akun. Setelah dinonaktifkan, akun tidak dapat lagi digunakan untuk masuk dan saldo maupun riwayat transaksi tidak bisa Anda akses. Perlu diketahui, akun dinonaktifkan dan bukan dihapus seketika dari sistem. Kalau Anda ingin datanya benar-benar dihapus permanen, sampaikan permintaan itu ke pengurus lewat menu Hubungi kami. Selesaikan dulu penarikan saldo yang sedang berjalan sebelum menonaktifkan akun.",
  },
  {
    question: "Bagaimana jika aplikasi berkendala?",
    answer:
      "Tutup aplikasi lalu buka kembali, dan pastikan perangkat Anda terhubung ke internet supaya datanya bisa disegarkan. Kalau masalahnya masih berlanjut, hubungi kami lewat menu Hubungi kami dan sebutkan nomor versi aplikasi yang tertera di bagian bawah halaman Profil.",
  },
];

export const ABOUT_INTRO =
  "Bastura adalah aplikasi Bank Sampah di Batu Ratna yang membantu warga mengelola sampah dengan lebih mudah. Mulai dari menyetor sampah, memantau saldo, hingga mendapatkan informasi terbaru dari lingkungan sekitar, semuanya dapat dilakukan dalam satu aplikasi.";

export const ABOUT_FEATURES: readonly { title: string; body: string }[] = [
  {
    title: "Setor Sampah,",
    body: "Kelola setoran sampah dengan lebih praktis. Sampah yang telah dipilah dapat disetorkan sesuai jadwal, sementara riwayat setoran dan saldo dapat dipantau langsung melalui aplikasi.",
  },
  {
    title: "Scan AI,",
    body: "Kenali jenis sampah hanya dengan mengambil foto. Fitur AI membantu mengidentifikasi jenis sampah sehingga proses pemilahan menjadi lebih mudah dan akurat.",
  },
  {
    title: "Informasi RT,",
    body: "Dapatkan pengumuman, jadwal kegiatan, dan informasi penting dari pengurus RT tanpa khawatir ketinggalan kabar.",
  },
  {
    title: "Edukasi,",
    body: "Pelajari cara memilah sampah dengan benar melalui informasi jenis sampah dan berbagai tips sederhana yang bisa diterapkan dalam kehidupan sehari-hari.",
  },
];

export const ABOUT_OUTRO =
  "Bersama Bastura, mari wujudkan lingkungan yang lebih bersih, sehat, dan berkelanjutan. \u{1F331}";

/**
 * Kontak pengurus. Nilai di bawah diambil apa adanya dari mockup dan tampaknya
 * masih contoh -- ganti dengan nomor dan email asli sebelum rilis.
 */
export const CONTACT_PHONE = "+62 834-2323-9589";
export const CONTACT_EMAIL = "Admin@gmail.com";
