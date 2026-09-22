# Barber Online — Step 16 Testing Plan

## Tujuan

Step 16 memvalidasi aplikasi setelah Security Rules + Indexes selesai. Testing dibagi menjadi:

1. Static validation — dapat dijalankan tanpa Firebase Emulator.
2. Build validation — TypeScript + Vite production build.
3. Manual functional testing — browser/mobile.
4. Security/authorization testing — menggunakan akun dengan role berbeda.
5. Regression testing — memastikan fitur Step 3–15 tidak rusak.

## A. Static validation

Jalankan:

```powershell
npm run test:static
```

Expected:

```text
Static validation completed with 0 failure(s).
```

## B. Build validation

```powershell
npm install
npm run build
```

Expected:

- TypeScript tanpa error.
- Vite menghasilkan `dist/`.
- Tidak ada import/module yang hilang.

## C. Authentication

| ID | Scenario | Expected |
|---|---|---|
| AUTH-01 | Customer login valid | Masuk Customer Dashboard |
| AUTH-02 | Password salah | Login ditolak + pesan error |
| AUTH-03 | User logout | Session berakhir |
| AUTH-04 | Owner login | Masuk `/owner` |
| AUTH-05 | Barber login | Masuk `/barber` |
| AUTH-06 | Customer membuka Owner route | Ditolak oleh route protection |
| AUTH-07 | Barber membuka Owner route | Ditolak oleh route protection |
| AUTH-08 | Forgot password | Firebase reset password flow berjalan |

## D. Public / Branch / Queue

| ID | Scenario | Expected |
|---|---|---|
| PUB-01 | Buka homepage tanpa login | Berhasil |
| PUB-02 | Lihat branch aktif | Berhasil |
| PUB-03 | Lihat service aktif | Berhasil |
| PUB-04 | Lihat barber aktif | Berhasil |
| PUB-05 | Lihat public queue | Hanya status public yang tampil |
| PUB-06 | Branch nonaktif | Tidak tampil sebagai branch publik |

## E. Customer Booking

| ID | Scenario | Expected |
|---|---|---|
| BOOK-01 | Pilih branch | Branch tersimpan pada flow |
| BOOK-02 | Pilih beberapa service | Total durasi + harga benar |
| BOOK-03 | Barber tertentu | Slot mengikuti barber |
| BOOK-04 | Barber mana saja | Sistem dapat menerima booking tanpa barber tertentu jika didukung UI |
| BOOK-05 | Slot bentrok | Booking kedua ditolak |
| BOOK-06 | Booking berhasil | Booking + queue terkait terbentuk sesuai flow |
| BOOK-07 | Customer membatalkan booking sendiri | Berhasil |
| BOOK-08 | Customer mencoba membatalkan booking customer lain | Ditolak |
| BOOK-09 | Booking branch lain | Ditolak oleh authorization |
| BOOK-10 | Customer mengubah harga booking | Ditolak |

## F. Owner Operations

| ID | Scenario | Expected |
|---|---|---|
| OWN-01 | Dashboard hari ini | Metrics tampil |
| OWN-02 | Call queue | Status berubah |
| OWN-03 | Start service | Status menjadi in-service bila authorization/attendance terpenuhi |
| OWN-04 | Complete queue | Queue selesai |
| OWN-05 | No-show | Queue menjadi no-show |
| OWN-06 | CRUD branch | Owner dapat mengelola branch sendiri |
| OWN-07 | CRUD barber | Owner dapat mengelola barber sendiri |
| OWN-08 | CRUD service | Owner dapat mengelola service sendiri |
| OWN-09 | CRUD product | Owner dapat mengelola product sendiri |
| OWN-10 | CRUD promo | Owner dapat mengelola promo sendiri |

## G. Barber Operations

| ID | Scenario | Expected |
|---|---|---|
| BAR-01 | Barber login | Workspace barber tampil |
| BAR-02 | Check-in | Attendance dibuat |
| BAR-03 | Check-out | Attendance selesai |
| BAR-04 | Start service sebelum check-in | Ditolak |
| BAR-05 | Claim queue unassigned di branch sendiri | Berhasil |
| BAR-06 | Claim queue branch lain | Ditolak |
| BAR-07 | Mengambil queue barber lain | Ditolak |
| BAR-08 | Complete queue sendiri | Berhasil |
| BAR-09 | Mengubah product master | Ditolak |
| BAR-10 | Membuat transaction di branch sendiri | Sesuai permission |

## H. Transaction + Inventory

| ID | Scenario | Expected |
|---|---|---|
| TX-01 | Transaction service | Subtotal benar |
| TX-02 | Transaction product | Stock berkurang |
| TX-03 | Multi-item service + product | Total benar |
| TX-04 | Cash | Payment method tersimpan |
| TX-05 | QRIS | Payment method tersimpan |
| TX-06 | Transfer | Payment method tersimpan |
| TX-07 | Stock tidak cukup | Sale ditolak |
| TX-08 | Stock movement | Previous/new stock konsisten |
| TX-09 | Refund | Status refund sesuai flow |
| TX-10 | Customer mencoba membuat transaction | Ditolak |

## I. Promo

| ID | Scenario | Expected |
|---|---|---|
| PROMO-01 | Promo aktif dalam periode | Dapat digunakan |
| PROMO-02 | Promo expired | Ditolak |
| PROMO-03 | Minimum transaction tidak terpenuhi | Ditolak |
| PROMO-04 | Branch restriction | Hanya branch yang sesuai |
| PROMO-05 | Service restriction | Hanya service yang sesuai |
| PROMO-06 | Product restriction | Hanya product yang sesuai |
| PROMO-07 | Customer usage limit | Limit dihormati |
| PROMO-08 | Promo code salah | Ditolak |

## J. Attendance + QR

| ID | Scenario | Expected |
|---|---|---|
| ATT-01 | Scan QR branch sendiri | Check-in berhasil |
| ATT-02 | Scan QR branch lain | Ditolak |
| ATT-03 | User customer scan QR | Ditolak |
| ATT-04 | Check-out | Attendance selesai |
| ATT-05 | Start service tanpa attendance | Ditolak |

## K. Reports + Export

| ID | Scenario | Expected |
|---|---|---|
| REP-01 | Filter tanggal | Data sesuai periode |
| REP-02 | Filter branch | Data hanya branch tersebut |
| REP-03 | Revenue | Sesuai transaction PAID |
| REP-04 | Barber performance | Sesuai transaction |
| REP-05 | Stock report | Sesuai inventory |
| REP-06 | Excel export | `.xlsx` berhasil dibuat |

## L. Security / Privilege Escalation

Uji dengan minimal 3 akun:

- Owner Business A
- Barber Business A / Branch A
- Customer Business A

Dan jika tersedia:

- Owner Business B
- Barber Branch B

### Harus ditolak

1. Customer membaca data internal owner.
2. Customer mengubah booking milik customer lain.
3. Customer membuat dirinya menjadi owner/barber.
4. Barber membaca/mengubah data branch lain.
5. Barber mengubah product master.
6. Barber mengubah promo.
7. Barber mengubah attendance barber lain.
8. Barber memindahkan dirinya ke business lain.
9. Owner Business A membaca/mengubah data Business B.
10. Client mengubah `businessId` dokumen ke business lain.
11. Client mengubah `createdBy`/identitas transaksi secara tidak sah.
12. Client menulis status operasional yang tidak diizinkan.

## M. PWA

| ID | Scenario | Expected |
|---|---|---|
| PWA-01 | Manifest valid | Install prompt tersedia bila browser mendukung |
| PWA-02 | Install Android | App tampil standalone |
| PWA-03 | Reload route deep link | SPA tetap bekerja pada hosting yang dikonfigurasi |
| PWA-04 | Offline shell | Shell aplikasi tetap dapat dibuka |
| PWA-05 | Offline Firestore | UI tidak mengklaim data server tersedia jika koneksi putus |
| PWA-06 | Business logo | Favicon/manifest mengikuti branding bila logo tersedia |

## N. Regression checklist

Sebelum release, pastikan kembali:

- [ ] Step 5 Booking + Queue
- [ ] Step 6 Owner Dashboard
- [ ] Step 7 Barber Workspace
- [ ] Step 8 Customer Experience
- [ ] Step 9 Transaction + Inventory
- [ ] Step 10 Promo
- [ ] Step 11 Attendance + QR
- [ ] Step 12 Reports + Excel
- [ ] Step 13 Cloudinary
- [ ] Step 14 PWA + Branding
- [ ] Step 15 Security Rules + Indexes

## O. Known limitations to record, not hide

- Queue numbering is still client-generated in the MVP; trusted backend numbering is recommended for production.
- Promo usage limits can still require trusted backend enforcement to eliminate race conditions.
- Offline support is application-shell oriented; it is not a full offline Firestore synchronization system.
- Business date/time helpers should eventually consistently use the configured business timezone rather than UTC-only shortcuts.

## Release gate

Step 16 is considered PASS only when:

1. `npm run test:static` passes.
2. `npm run build` passes.
3. Authentication scenarios pass.
4. Booking/queue scenarios pass.
5. Owner/barber/customer permission scenarios pass.
6. Transaction/inventory scenarios pass.
7. Promo scenarios pass.
8. Attendance/QR scenarios pass.
9. Reports/export scenarios pass.
10. No privilege-escalation scenario succeeds.
11. PWA smoke tests pass.
