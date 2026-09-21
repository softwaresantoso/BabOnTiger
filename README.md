# Barber Online

**Custom Barber Operations PWA** — React + Vite + TypeScript + Firebase Authentication + Cloud Firestore + Cloudinary.

Stage 3 refactors the original BabOn Tiger Mark I foundation into a generic, multi-business-ready Barber Online architecture.

## Stack

- GitHub — source control
- Cloudflare Pages — hosting
- React + Vite + TypeScript — frontend
- Firebase Auth — authentication
- Firestore — database
- Cloudinary — media/images
- PWA — installable mobile experience

## Stage 3 foundation

- Branding: Barber Online
- Role: `owner`, `barber`, `customer`
- Business context and tenant ID
- Branch context and branch selector
- Owner routing under `/owner/*`
- Legacy `/admin/*` redirects to `/owner`
- Role-aware login redirects
- Multi-branch-ready data models
- Cloudinary unsigned-upload foundation
- Netlify configuration removed
- Firebase Storage is not used
- No service-account JSON is required by the frontend

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local`
3. Fill Firebase variables.
4. Set `VITE_BUSINESS_ID` and `VITE_BUSINESS_NAME` for the client.
5. Optional: configure Cloudinary unsigned upload preset.
6. `npm run dev`
7. `npm run build`

## Demo seed

The seed script is for development only and requires `GOOGLE_APPLICATION_CREDENTIALS` pointing to a Firebase service-account JSON. Never commit that JSON.

Demo roles:

- Owner: `owner@barberonline.demo` / `ChangeMe123!`
- Barber: `raka@barberonline.demo` / `ChangeMe123!`
- Customer: `customer@barberonline.demo` / `ChangeMe123!`

## Target Firestore shape

```text
users/{uid}
businesses/{businessId}
  branches/{branchId}
  barbers/{barberId}
  services/{serviceId}
  products/{productId}
  promos/{promoId}
  bookings/{bookingId}
  queues/{queueId}
  transactions/{transactionId}
  attendance/{attendanceId}
  stockMovements/{movementId}
  promoUsages/{promoUsageId}
  bookingLocks/{lockId}
  schedules/{scheduleId}
  specialSchedules/{scheduleId}
  settings/{settingId}
```

Critical rule: all business data must remain scoped by `businessId`; branch-specific operations must also be scoped by `branchId`.

## Next stage

Stage 4 will refactor Firestore data access and security rules for Business → Branch → User → Barber → Service, then Stage 5 will rebuild Booking + Queue on top of that foundation.


## Step 4 — Firestore Architecture & Security

This version establishes the multi-tenant Firestore foundation for Barber Online.

### Tenant model
- Root user profile: `users/{uid}`
- Tenant root: `businesses/{businessId}`
- Branches: `businesses/{businessId}/branches/{branchId}`
- Operational collections are nested below the tenant: `barbers`, `services`, `products`, `promos`, `bookings`, `queues`, `transactions`, `attendance`, `stockMovements`, `promoUsages`, `bookingLocks`, `schedules`, `specialSchedules`, and `settings`.

### Security model
Firestore rules now distinguish owner, barber, and customer access. Staff access is constrained by `businessId`; barber operational access is additionally constrained by `branchId`. Customer booking/transaction visibility is limited to their own records. Public storefront reads are limited to active public records where applicable.

### Important implementation rule
The frontend must not be treated as the security boundary. Every future write service must include tenant and branch identifiers in its payload, while Firestore rules enforce the same constraints.

### Indexes
`firestore/firestore.indexes.json` includes the core queries planned for booking, queue, transaction, attendance, inventory, service, barber, and user screens. Additional indexes should only be added when Firestore returns a concrete index requirement.


## STEP 5 — Booking + Queue Engine

- Branch-aware online booking foundation.
- Customer can book without a registered account by using Firebase Anonymous Authentication (enable Anonymous provider in Firebase Auth).
- Customer data: name + WhatsApp.
- Select a specific barber or `Barber mana saja`.
- Slot availability uses barber schedule, special schedule, service duration, breaks, 30-minute lead time, and booking locks.
- Booking creates a daily branch queue number through a Firestore counter.
- Queue lifecycle: `BOOKED → WAITING → CALLED → IN_SERVICE → COMPLETED`; exceptions include `NO_SHOW` and `CANCELLED`.
- Walk-in queue creation service foundation is included for the next operational UI stage.
- Public queue board route: `/queue/:branchId` (current Firestore rules keep operational queue records authenticated; a sanitized public queue projection should be added before exposing live queue data publicly).

### Important

Queue numbering is currently implemented with a Firestore counter document. For production-grade anti-abuse guarantees, the counter mutation should eventually move to a trusted backend/Cloudflare Worker or Firebase callable backend.

## STEP 6 — Owner Dashboard & Operational Control

- Branch-aware Owner dashboard.
- Daily booking and queue metrics.
- Current/next queue visibility.
- Owner queue actions: call, start service, complete, no-show.
- Automatic dashboard refresh every 15 seconds.

## STEP 7 — Barber Workspace

This stage turns the barber route into an operational workspace instead of a booking-status editor.

### Barber workspace
- Barber account is scoped to its assigned `branchId` and `barberId`.
- Daily queue board for the barber's branch.
- `Semua` and `Saya` queue filters.
- Barber can claim an unassigned queue/customer for themselves, supporting the rule that a barber may serve a customer who was not originally assigned to them.
- Queue workflow: call → start → complete.
- No-show action for a called customer.
- Barber sees assigned bookings for the current business date.
- Daily summary: bookings, own queues, completed, no-show, and branch completed count.

### Attendance foundation
- Manual barber check-in/check-out is implemented.
- Attendance uses a deterministic daily document: `{barberId}_{date}`.
- Business timezone is respected when calculating the daily key.
- QR check-in is intentionally left for the Attendance + QR stage; the Step 7 UI identifies this explicitly.

### Security
- Barber queue updates are constrained by Firestore rules to the barber's own branch and `barberId`.
- Barber attendance reads/writes are constrained to the barber's branch.
- Owner retains operational control.

### Not included yet
- Transaction creation/finalization and barber revenue.
- Product stock operations.
- QR scanner/generator.
- WhatsApp notification automation.
- Excel reports.

## STEP 7 — Barber Workspace

- Dedicated barber workspace under `/barber`.
- Barber sees branch queue, own bookings, attendance status, and daily operational summary.
- Barber can take unassigned queue entries when permitted by branch workflow.
- Queue actions: call, start service, complete, and no-show.
- Manual attendance check-in/check-out foundation is included; QR check-in remains in the dedicated Attendance + QR stage.
- Barber access remains branch-scoped by Firestore rules.

## STEP 8 — Customer Experience

- Public branch discovery and branch detail pages under `/branch/:branchId`.
- Customer booking flow is branch-first and supports multiple services in one booking.
- Booking total duration and total price are calculated from all selected services.
- Barber selection supports a specific barber or `Barber mana saja`.
- Customer dashboard separates active bookings and booking history.
- Customer can cancel eligible bookings and see branch, barber, service, schedule, queue code, and status.
- Customer account page supports profile updates and password reset.
- Login page includes password-reset flow.
- Public home now exposes active branch cards for easier customer discovery.
- Existing guest booking remains available; login is not required to submit an online booking.

### Step 8 data compatibility

Existing single-service bookings remain readable. New bookings may include `serviceItems[]` while retaining the primary `serviceId`, `serviceName`, `durationMinutes`, and `price` fields for compatibility with existing operational screens.


## Step 12 — Reports + Excel
- Owner report dashboard at `/owner/reports`.
- Date range and branch filters.
- Transaction/revenue summary.
- Barber and branch performance.
- Product and stock report.
- Attendance included in report export.
- Multi-sheet `.xlsx` export using SheetJS (`xlsx`).

## STEP 13 — Cloudinary Media

- Cloudinary is used for business logo, barber photo, service image, product image, and promo image.
- Browser uploads use only `VITE_CLOUDINARY_CLOUD_NAME` and an unsigned `VITE_CLOUDINARY_UPLOAD_PRESET`.
- No Cloudinary API secret is included in Vite client variables.
- Client-side validation accepts JPG, PNG, and WEBP and limits files to 5 MB.
- Upload folders are tenant-scoped under `barber-online/{businessId}/...`.
- Owner can configure the business logo and branding at `/owner/settings`.
- Owner can upload media directly from Service, Barber, Product, and Promo management screens.
- Public/customer screens display the uploaded logo, service images, barber photos, and promo images where available.

### Cloudinary security boundary

For the Rp0 MVP, use an unsigned upload preset configured in Cloudinary with restrictive upload settings such as allowed formats and a maximum file size. Never add `CLOUDINARY_API_SECRET` or another privileged Cloudinary credential to `.env` variables prefixed with `VITE_`. The browser should only receive the cloud name and unsigned preset name. For a higher-security production setup, replace direct unsigned uploads with a trusted server/worker that signs uploads and validates authorization.
