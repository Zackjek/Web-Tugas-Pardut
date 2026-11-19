# RuangJeda Web

RuangJeda adalah aplikasi check-in mahasiswa berbasis HTML, CSS, dan JavaScript. Versi web bisa dipasang dari browser yang mendukung aplikasi web. Isi `public/` dapat dilayani langsung oleh hosting statis.

## Deploy melalui GitHub dan Netlify

1. Ekstrak ZIP dan buat repositori GitHub, misalnya `ruangjeda`.
2. Unggah folder `public/`, `netlify.toml`, dan `README.md` ke root repositori.
3. Di Netlify, pilih **Add new project → Import a Git repository**. Pilih GitHub, beri Netlify akses ke repositori tersebut, lalu pilih repositori `ruangjeda`.
4. Gunakan branch yang memuat kode, biasanya `main`. Biarkan **Base directory** dan **Build command** kosong. **Publish directory** adalah `public`, sesuai `netlify.toml`.
5. Pilih **Publish** atau **Deploy**, lalu buka URL yang ditampilkan di Netlify. Perubahan yang didorong ke branch produksi akan memicu deployment baru.

[Panduan deploy dari repositori](https://docs.netlify.com/start/quickstarts/deploy-from-repository/)

Untuk deploy manual, unggah folder `public/` yang sudah diekstrak ke [Netlify Drop](https://app.netlify.com/drop).

## Uji sebelum presentasi

- Isi check-in dan buka ulang halaman untuk melihat apakah catatan tersimpan.
- Buka **Data → Tampilkan data contoh** untuk melihat grafik tujuh hari.
- Buka tautan HTTPS di perangkat sasaran untuk memasang aplikasi dari browser.

Check-in dan riwayat versi web tersimpan di browser pada perangkat dan alamat yang dipakai. Jika pindah dari tautan lama ke URL Netlify, catatan lama masih berada di alamat sebelumnya. Versi web menerima durasi layar yang dimasukkan pengguna dari pengaturan perangkat. Pembacaan otomatis dari Android tersedia melalui APK dengan akses penggunaan.

Untuk menjalankan secara lokal, buka terminal di root proyek dan jalankan `python -m http.server 8080 --directory public`. Buka `http://localhost:8080`.
