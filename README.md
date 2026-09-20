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
