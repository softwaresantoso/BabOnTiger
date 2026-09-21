# Barber Online — Step 15 Security Matrix

## Role model

| Resource | Public | Customer | Barber | Owner |
|---|---|---|---|---|
| Business | Read active | Read active | Read active | Read/update own business |
| Branch | Read active | Read active | Read own branch + public active | Full own business |
| Barber | Read active | Read active | Read own branch + public active | Full own business |
| Service | Read active | Read active | Read own branch + public active | Full own business |
| Product | Read active | Read active | Read own branch + public active | Full own business |
| Promo | Read active | Read active | Read own business | Full own business |
| Schedule | Read | Read | Read | Full own business |
| Special Schedule | Read | Read | Read | Full own business |
| Booking | — | Create own / cancel own | Read/update own branch | Full own business |
| Queue | Read active queue | Own queue/cancel | Own branch | Full own business |
| Attendance | — | — | Own attendance | Full own business |
| Transaction | — | Own transactions | Own branch | Full own business |
| Stock Movement | — | — | Own branch | Full own business |
| Promo Usage | — | Own usage | Own branch | Full own business |
| Booking Lock | — | Own business locks | Same business | Same business |
| Settings | — | — | — | Full own business |

## Hardening rules

1. User self-registration is customer-only.
2. A client cannot promote itself to `owner` or `barber` through `/users`.
3. `businessId` is immutable across normal user/booking/queue/transaction updates.
4. Barber access is restricted by the barber's assigned `branchId` and `barberId`.
5. Customer booking cancellation is restricted to the authenticated customer's own booking.
6. Customer queue cancellation is restricted to the authenticated customer's own queue.
7. Barber cannot start service unless today's attendance document is `PRESENT`.
8. Product master data is Owner-controlled; stock operations are represented through stock movements.
9. Transaction creation records `createdBy` and a barber cannot create a transaction as another barber.
10. Public queue reads are restricted to active queue states and use a dedicated filtered query.
11. Booking creation validates the target branch, service, and selected barber against the same business.
12. Stock movement creation validates product ownership and branch scope.

## Known MVP limitation

The queue counter is still incremented from the client. Firestore Rules enforce monotonic increments and business/branch scope, but a fully tamper-resistant queue allocator requires a trusted backend transaction/function.
