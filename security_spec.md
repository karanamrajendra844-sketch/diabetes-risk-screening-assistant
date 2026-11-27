# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Owner-Only Access**: Every user document, private PII document, and screening record is strictly scoped to `request.auth.uid == userId` and requires a verified identity (`email_verified == true` or verified `phone_number`).
2. **PII Isolation**: Email addresses and phone numbers are never stored in `users/{userId}`; they are isolated in `users/{userId}/private/info`.
3. **Strict Schema & Bounds**: Health inputs (`age` 18-120, `glucose` 40-600, `bmi` 10-80, `bloodPressure` 40-250) and string lengths are enforced on every write.
4. **Immutable Audit Trail**: Screening records cannot be altered after creation (`allow update: if false`), only created or deleted by the owner.
5. **Temporal Integrity**: `createdAt` and `updatedAt` must strictly equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Create**: Creating `/users/u1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Creating `/users/u1` with `email_verified: false` and no `phone_number` -> `PERMISSION_DENIED`.
3. **Identity Spoofing**: User `u1` creating `/users/u2` or setting `uid: "u2"` -> `PERMISSION_DENIED`.
4. **Cross-User PII Read**: User `u1` reading `/users/u2/private/info` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: Creating `/users/u1` with extra ghost field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **ID Poisoning**: Creating `/users/u1/screenings/bad$id!with.dots` or >128 chars -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: Setting `createdAt` to a client-chosen past timestamp -> `PERMISSION_DENIED`.
8. **Out-of-Range Clinical Input**: Submitting `glucose: 9999` or `age: 5` -> `PERMISSION_DENIED`.
9. **Unbounded Array Attack**: Submitting `topFactors` with 10 elements or non-string first element -> `PERMISSION_DENIED`.
10. **Immutable Field Tampering**: Updating `/users/u1` trying to change `uid` or `createdAt` -> `PERMISSION_DENIED`.
11. **Screening Record Mutation**: Attempting to `update` a saved screening record to change `riskCategory` -> `PERMISSION_DENIED`.
12. **Blanket List Query**: User `u1` attempting to list `/users/u2/screenings` -> `PERMISSION_DENIED`.
