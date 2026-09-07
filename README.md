# BabOn Tiger mark I

**Barber Shop Online Booking PWA** — React + Vite + Firebase Authentication + Cloud Firestore + Netlify.

BabOn Tiger mark I adalah starter/MVP yang sudah mencakup customer booking, admin dashboard, barber workspace, PWA, Firestore rules/indexes, seed data, dan konfigurasi Netlify.

> Catatan: paket ini tidak dapat melakukan push langsung ke akun GitHub/Firebase/Netlify Anda. Setelah project Firebase dibuat dan environment variable diisi, project ini siap di-push ke GitHub dan dideploy ke Netlify.

## 1. Fitur yang tersedia

### Customer
- Landing page
- Register/login
- Pilih layanan
- Pilih barber
- Pilih tanggal
- Slot waktu otomatis
- Durasi layanan diperhitungkan
- Jadwal kerja & break barber diperhitungkan
- Booking code
- Riwayat booking
- Batalkan booking
- PWA installable

### Admin
- Dashboard
- Daftar booking + ubah status
- Kelola layanan
- Aktif/nonaktif layanan
- Kelola barber
- Aktif/nonaktif barber
- Database pelanggan

### Barber
- Dashboard jadwal hari ini
- Daftar customer hari ini
- Update status: PENDING → CONFIRMED → CHECKED_IN → IN_SERVICE → COMPLETED / NO_SHOW

### Booking engine
- Slot 15 menit
- Service duration
- Weekly schedule
- Break
- Special schedule hook
- Booking lock deterministic
- Firestore transaction untuk mencegah dua customer mengambil slot yang sama secara bersamaan

Firestore transactions bersifat atomik dan akan retry ketika terjadi konflik; pola ini digunakan pada pembuatan booking dan lock slot. Lihat dokumentasi resmi Firebase untuk detail transaksi. 

## 2. Struktur Firestore

```text
/users/{uid}
  businessId
  name
  phone
  role
  barberId
  active

/businesses/{businessId}
  name
  timezone
  currency
  bookingSlotMinutes
  minBookingLeadMinutes
  maxAdvanceDays

/businesses/{businessId}/services/{serviceId}
/businesses/{businessId}/barbers/{barberId}
/businesses/{businessId}/schedules/{scheduleId}
/businesses/{businessId}/specialSchedules/{scheduleId}
/businesses/{businessId}/bookings/{bookingId}
/businesses/{businessId}/bookingLocks/{lockId}
/businesses/{businessId}/transactions/{transactionId}
```

Model ini sengaja memakai `businessId` supaya nantinya engine BabOn bisa dikembangkan menjadi multi-tenant/SaaS PARDI.

## 3. Persiapan Firebase

1. Buat project baru di Firebase.
2. Aktifkan **Authentication → Email/Password**.
3. Buat **Cloud Firestore** dalam Production/Locked mode.
4. Tambahkan Web App.
5. Copy Firebase Web Config.
6. Buat `.env` dari `.env.example`.

Contoh:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=nama-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nama-project
VITE_FIREBASE_STORAGE_BUCKET=nama-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_BUSINESS_ID=demo-barbershop
VITE_BUSINESS_NAME=BabOn Tiger mark I
VITE_TIMEZONE=Asia/Jakarta
```

## 4. Install & jalankan lokal

```bash
npm install
npm run dev
```

Buka URL yang diberikan Vite.

## 5. Deploy Firestore Rules & Indexes

Install Firebase CLI jika belum ada:

```bash
npm install -g firebase-tools
firebase login
```

Hubungkan project:

```bash
firebase use --add
```

Pilih Firebase Project yang benar.

Deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

**Jangan** mengganti rules menjadi `allow read, write: if true` di production. Firebase sendiri memperingatkan bahwa rules terbuka dapat mengekspos dan mengubah seluruh database. 

## 6. Seed data demo

Untuk menjalankan seed, buat Service Account dari Firebase/Google Cloud dan simpan JSON secara lokal. Jangan commit file JSON tersebut ke GitHub.

Windows PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\service-account.json"
npm run seed
```

macOS/Linux:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/service-account.json"
npm run seed
```

Seed akan membuat:
- Business `demo-barbershop`
- 3 barber
- 4 layanan
- jadwal mingguan
- akun admin
- akun barber
- akun customer

### Akun demo

```text
Admin:
admin@babontiger.demo
ChangeMe123!

Barber:
raka@babontiger.demo
ChangeMe123!

Customer:
customer@babontiger.demo
ChangeMe123!
```

**Segera ganti password akun demo setelah testing.**

## 7. Deploy ke GitHub

```bash
git init
git add .
git commit -m "Initial BabOn Tiger mark I"
git branch -M main
git remote add origin https://github.com/USERNAME/bab-on-tiger-mark-i.git
git push -u origin main
```

Jangan commit:
- `.env`
- service account JSON
- private key
- credential file

## 8. Deploy ke Netlify

Di Netlify:

1. Add new project → Import from Git.
2. Pilih repository GitHub.
3. Build command:

```text
npm run build
```

4. Publish directory:

```text
dist
```

5. Tambahkan environment variables yang sama dengan `.env`.
6. Deploy.

`netlify.toml` sudah menyediakan SPA redirect:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 9. PWA

PWA menggunakan:
- `manifest.webmanifest`
- service worker `/sw.js`
- icon 192×192
- icon 512×512
- standalone display
- theme color BabOn Tiger

Service worker hanya didaftarkan pada production build agar development tetap mudah.

## 10. Keamanan booking

Booking memakai Firestore transaction dan deterministic lock document.

Contoh lock:

```text
/businesses/demo-barbershop/bookingLocks/
2026-09-07_raka_0900
```

Jika service berdurasi 45 menit mulai 09:00, sistem mengunci:

```text
09:00
09:15
09:30
```

Jika customer lain mencoba mengambil slot yang bertabrakan, transaction akan gagal dan user diminta memilih slot lain.

Security Rules juga memvalidasi user, role, businessId, ownership booking, dan ownership lock.

### Hardening production yang disarankan

Untuk deployment komersial PARDI, tahap berikutnya sebaiknya menambahkan:

1. Firebase App Check
2. Cloud Functions/server-side booking endpoint
3. Rate limiting
4. Audit log
5. WhatsApp API
6. Payment/QRIS
7. Walk-in & queue
8. Promo/voucher
9. Membership/loyalty
10. Multi-tenant onboarding
11. Automated reminder
12. Automated cleanup untuk booking locks
13. Emulator test untuk Security Rules

Client-side Firestore Security Rules tetap harus dipertahankan. Server/Admin SDK memiliki jalur otorisasi tersendiri dan tidak bergantung pada Firestore Security Rules.

## 11. Catatan penting untuk pengembangan berikutnya

BabOn Tiger mark I adalah fondasi MVP. Struktur `businesses/{businessId}` sengaja disiapkan agar bisa dikembangkan menjadi:

```text
PARDI Engine
├── Barber Shop
├── Klinik
├── Bengkel
├── Kuliner
└── UMKM lainnya
```

Dengan satu core:
- authentication
- role/permission
- booking
- schedule
- customer
- notification
- reporting
- PWA

dan konfigurasi per bisnis.

## 12. Troubleshooting

### `Missing or insufficient permissions`
Periksa:
- user sudah login
- dokumen `/users/{uid}` sudah dibuat
- `businessId` sama dengan `VITE_BUSINESS_ID`
- Firestore Rules sudah dideploy

### Tidak ada slot
Periksa:
- barber aktif
- service aktif
- schedule barber ada
- dayOfWeek benar (`0 = Minggu`)
- tanggal bukan hari libur/special closed
- tidak ada booking lock yang bentrok

### Netlify 404 ketika refresh
Pastikan `netlify.toml` ikut ter-push.

### PWA belum muncul
Test pada production HTTPS/Netlify, bukan hanya dev server. Pastikan manifest dan icon dapat diakses.

## 13. Referensi resmi

- Firebase Firestore Transactions: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firestore Security Rules: https://firebase.google.com/docs/rules
- Firestore Security Rules conditions: https://firebase.google.com/docs/firestore/security/rules-conditions
- Secure Firestore queries: https://firebase.google.com/docs/firestore/security/rules-query
