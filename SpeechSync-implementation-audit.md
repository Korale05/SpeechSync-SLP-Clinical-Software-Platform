# Executive Summary

Overall Completion: 62%

Production Readiness: 4/10

Critical Issues Count: 8

Major Issues Count: 17

Minor Issues Count: 14

SpeechSync has a credible hackathon-MVP frontend and a broad Express/Prisma backend, but it is not production-ready. The React client builds successfully and most required screens exist. The backend has many CRUD routes and a valid Prisma schema. The largest problems are runtime-breaking API/schema mismatches, migration drift, incomplete RBAC/data ownership checks, placeholder integrations, and partial workflow connectivity.

Verification performed:

- `npx prisma validate` in `server`: passed.
- `npm run build` in `client`: passed, with large bundle warning.
- `npm run lint` in `client`: failed because no ESLint config exists.
- `npm test` in `server`: failed because no `test` script exists.
- Seed was not executed because `server/prisma/seed.js` begins by deleting all existing data.

---

# Requirement Coverage Matrix

| Requirement | Status | Completion % | Notes |
| ----------- | ------ | ------------ | ----- |
| React 18 + Vite frontend | ✅ Fully Implemented | 95% | Client builds successfully. |
| Tailwind/shadcn-style UI | ✅ Fully Implemented | 90% | Local UI components exist in `client/src/components/ui`. |
| React Router v6 routing | ✅ Fully Implemented | 90% | Routes defined in `client/src/App.jsx`. |
| Zustand auth state | ✅ Fully Implemented | 85% | `client/src/store/authStore.js`. |
| Recharts dashboards | 🟡 Partially Implemented | 75% | Dashboard/portal/reports use charts, not exhaustive. |
| React Hook Form + Zod | ❌ Not Implemented | 10% | Dependencies exist, but most forms use local state/manual validation. |
| Framer Motion page transitions | 🟡 Partially Implemented | 30% | Dependency exists; limited evidence of meaningful use. |
| Login with demo credentials | ✅ Fully Implemented | 85% | `Login.jsx`, `routes/auth.js`, seed users. |
| JWT + bcrypt auth | 🟡 Partially Implemented | 80% | Works, but fallback secret remains in code and public register exists. |
| Role-based frontend routing | 🟡 Partially Implemented | 80% | `ProtectedRoute.jsx`; teletherapy/invoices are broad protected routes. |
| Backend route-level RBAC | 🟡 Partially Implemented | 60% | `authorize.js` used unevenly; ownership checks incomplete. |
| SLP dashboard | 🟡 Partially Implemented | 75% | Uses live appointments/goals/sessions, but reports/quick flows incomplete. |
| Patient list/profile | 🟡 Partially Implemented | 80% | CRUD/profile tabs exist; documents/uploads incomplete. |
| Patient registration/edit/archive | 🟡 Partially Implemented | 80% | Works in code; migration drift blocks clean deploy. |
| GFTA-3 assessment | 🟡 Partially Implemented | 70% | 47 stimuli and save flow exist; simplified scoring, placeholder images. |
| CELF-5 mini | 🟡 Partially Implemented | 70% | UI and save flow exist; simplified scoring. |
| Azure pronunciation assessment | ❌ Not Implemented | 0% | No Azure Speech integration found. |
| SOAP editor | 🟡 Partially Implemented | 70% | CRUD works; helper chips, searchable ICD, HEP builder incomplete. |
| Groq AI Scribe | 🟡 Partially Implemented | 70% | SSE route/client exist; error handling/JSON parsing brittle. |
| Teletherapy/Daily.co | 🟡 Partially Implemented | 55% | Daily room creation exists with Google Meet mock fallback; UI still says Google Meet. |
| Goals and progress | 🟡 Partially Implemented | 70% | Goals and progress history persist; workflow linkage and auth incomplete. |
| Billing dashboard/claims | ⚠️ Implemented but Broken | 55% | Claim scrubber UI expects different backend response shape. |
| INR invoices/payments | 🟡 Partially Implemented | 75% | Create/view/pay/PDF exist; no delete/refund/discount/currency column. |
| Parent portal | 🟡 Partially Implemented | 55% | Goals/exercises/report links exist; messaging and appointment join incomplete. |
| IEP coordinator view | ⚠️ Implemented but Broken | 45% | UI does not call IEP routes; scheduler/export buttons are not wired. |
| Reports/PDF export | 🟡 Partially Implemented | 55% | IEP and invoice PDFs exist; report links/token handling inconsistent. |
| Secure messaging | ⚠️ Implemented but Broken | 35% | API exists but parent send path references nonexistent Prisma relation. |
| Audit logs | ⚠️ Implemented but Broken | 30% | Frontend path and backend Prisma include are broken. |
| File storage/S3/local uploads | ❌ Not Implemented | 0% | No upload route/storage layer found. |
| Compliance banner/consent | 🟡 Partially Implemented | 60% | Consent modal in `Layout.jsx`; compliance claims are mostly UI-only. |
| Mock data file requirement | ❌ Not Implemented | 0% | No `client/src/data/mockData.js`; seed data exists instead. |
| PostgreSQL + Prisma | 🟡 Partially Implemented | 65% | Schema valid; migrations are stale. |
| Docker deployment | 🟡 Partially Implemented | 55% | Dockerfiles exist; compose uses placeholder secrets and stale migrations. |
| CI/CD | ❌ Not Implemented | 0% | No CI workflow found. |
| Tests | ❌ Not Implemented | 0% | Server has no test script; no test suite found. |
| Linting | ⚠️ Implemented but Broken | 10% | Script exists, config missing. |

---

# Fully Implemented Features

- Frontend production build: `client` builds with Vite.
- Basic Express server bootstrapping: `server/index.js`.
- Prisma schema validation: `server/prisma/schema.prisma` is syntactically valid.
- Basic JWT login with bcrypt password verification: `server/routes/auth.js`.
- Frontend route protection by authentication and selected roles: `client/src/components/ProtectedRoute.jsx`.
- Patient profile loading with tabs for overview, assessments, goals, sessions, billing, documents: `client/src/pages/PatientProfile.jsx`.
- Basic user/admin management screens and APIs: `client/src/pages/UserManagement.jsx`, `client/src/pages/DoctorManagement.jsx`, `server/routes/users.js`.
- Invoice payment recording at the API layer: `server/routes/invoices.js`.

---

# Partially Implemented Features

### Authentication and RBAC

Expected: Secure JWT/bcrypt auth, 4 demo roles, role-specific dashboards/routes, route-level RBAC, parent/school consent.

Actual: Login, password hashing, seed users, frontend protected routes, server `authenticate`/`authorize`, and consent modal exist.

Missing: `/auth/me`, `/auth/logout`, secure registration gating, consistent data ownership checks, strong secret handling, full route-level least privilege.

Files: `server/routes/auth.js`, `server/middleware/authenticate.js`, `server/middleware/authorize.js`, `client/src/store/authStore.js`, `client/src/App.jsx`, `client/src/components/Layout.jsx`.

Completion: 75%.

### Patient Registration and Profile

Expected: Patient CRUD, demographics, guardian/insurance/diagnoses/assigned SLP, parent portal account, history tabs.

Actual: Create/edit/archive/list/profile pages and routes exist. Parent account creation option exists.

Missing: Fresh migrations for current patient columns; stronger validation; hard relation between patient and clinician; document upload/storage.

Files: `client/src/pages/NewPatient.jsx`, `EditPatient.jsx`, `PatientList.jsx`, `PatientProfile.jsx`, `server/routes/patients.js`, `server/prisma/schema.prisma`.

Completion: 80%.

### Scheduling

Expected: Create/edit/delete appointments, view calendar/grid, update statuses, persistent teletherapy link, bulk screenings.

Actual: Appointment create/list/status update exists. Scheduling UI creates appointments and status changes.

Missing: Appointment edit/delete; full calendar/time-grid; session linkage bug; IEP bulk scheduler UI; parent appointment details.

Files: `client/src/pages/Scheduling.jsx`, `server/routes/appointments.js`, `server/routes/iep.js`.

Completion: 60%.

### AI Assessment

Expected: Full GFTA-3/CELF-5 workflows with scoring, report card, save, PDF, link-to-goal, accurate normative lookup.

Actual: GFTA-3 has 47 placeholder stimuli, timer, scoring UI, diacritic helper, save to DB. CELF-5 mini has 6 subtests and save flow.

Missing: Normative lookup tables, real stimulus assets, PDF generation from assessment, goal linking, Azure pronunciation assessment.

Files: `client/src/pages/AssessmentNew.jsx`, `server/routes/assessments.js`.

Completion: 70%.

### SOAP Notes and AI Scribe

Expected: SOAP editor with CPT/ICD suggestions, helper chips, goal linkage, HEP builder, AI streaming, save draft/co-sign/sign-lock.

Actual: SOAP fields, patient context, goal checkbox linkage, Groq SSE, save draft/co-sign/lock exist.

Missing: Helper chips, HEP builder, searchable ICD dropdown, robust streamed JSON parsing, route ownership checks for updates.

Files: `client/src/pages/SOAPNote.jsx`, `client/src/services/aiScribe.js`, `server/routes/sessions.js`, `server/routes/ai.js`.

Completion: 70%.

### Teletherapy

Expected: Daily.co embedded room, controls, stimuli, exercises, notes, whiteboard, end-session SOAP prefill.

Actual: Room creation endpoint exists; fallback URL stored; UI has timer, controls, stimuli, exercise scoring, notes, whiteboard, and end-session creates a draft SOAP session.

Missing: Real embedded Daily iframe in current UI, persisted real-time attempts, persisted whiteboard, recording/media storage, parent join workflow, appointment/session linkage.

Files: `client/src/pages/Teletherapy.jsx`, `server/routes/teletherapy.js`, `server/routes/sessions.js`.

Completion: 55%.

### Goals and Progress

Expected: SMART goal creation, progress chart/history, clickable data points, status badges.

Actual: Goal creation, patient goal list, progress history model/routes, charting in goals page.

Missing: Fine-grained authorization; richer session/SOAP linkage; clickable SOAP snippets not fully verified.

Files: `client/src/pages/Goals.jsx`, `server/routes/goals.js`, `server/prisma/schema.prisma`.

Completion: 70%.

### Billing and Invoicing

Expected: Claim dashboard, CPT reference, Medicare tracker, scrubber, bill CRUD, INR invoices, tax/discount/notes, statuses, payment history, refunds.

Actual: Legacy claim table and scrubber route exist. New invoice system supports create/list/detail/payment/PDF and INR formatting.

Missing: Discount, refund, invoice delete, full invoice edit, stored currency field, assessment-to-billing automation, scrubber response contract fix.

Files: `client/src/pages/Billing.jsx`, `AdminBilling.jsx`, `InvoiceDetails.jsx`, `client/src/components/billing/PatientBillingTab.jsx`, `server/routes/billing.js`, `server/routes/invoices.js`.

Completion: 70%.

### Parent Portal

Expected: Progress, upcoming appointment, join teletherapy, exercises, secure messages, report downloads.

Actual: Child data, goals, exercise list, mark complete, and report links exist.

Missing: Working message UI, real next appointment display, correct teletherapy URL from appointment, tokenized report downloads.

Files: `client/src/pages/Portal.jsx`, `server/routes/exercises.js`, `server/routes/messages.js`, `server/routes/reports.js`.

Completion: 55%.

### IEP Coordinator

Expected: Student list, bulk screening scheduler, milestone timeline, FERPA PDF export.

Actual: IEP page displays school-like data derived from patients. Backend IEP routes exist.

Missing: UI does not call `/api/iep/students`; schedule/export buttons have no handlers; migration drift; nullable patient appointment bug.

Files: `client/src/pages/IEP.jsx`, `server/routes/iep.js`.

Completion: 45%.

### Reports

Expected: Progress reports, IEP exports, billing revenue reports, downloadable PDFs.

Actual: IEP/patient report PDFs and invoice/receipt PDFs exist. Revenue report API/page exists.

Missing: Assessment PDFs, monthly parent reports, consistent token auth in links, polished report generation coverage.

Files: `server/routes/reports.js`, `server/routes/invoices.js`, `client/src/pages/AdminBillingReports.jsx`, `PatientProfile.jsx`, `Portal.jsx`.

Completion: 55%.

---

# Missing Features

- Azure Cognitive Services pronunciation assessment.
- AWS S3/local file uploads for patient documents.
- `client/src/data/mockData.js` as specified in the original prompt.
- CI/CD workflow.
- Automated tests.
- Working ESLint configuration.
- Assessment PDF generation and explicit goal linking.
- Refund workflow.
- Discount field/workflow.
- Stored invoice currency field.
- SMS/email integrations.
- Notification center beyond toasts/static alerts.
- Direct `/auth/me` and `/auth/logout`.
- Appointment edit/delete.
- Full document center with intake/consent/progress files.

---

# Bugs and Issues

## Critical

### Migration drift

- Description: `schema.prisma` defines many models/columns that committed migrations do not create.
- Impact: Fresh `prisma migrate deploy` will create an old database missing appointments, messages, audit logs, IEP, invoices, payments, and many patient columns.
- Files involved: `server/prisma/schema.prisma`, `server/prisma/migrations/*`.
- Recommended fix: Generate a new migration from current schema and validate with a clean database.

### Audit logs route is broken

- Description: `server/routes/auditLogs.js` uses `include: { user: ... }`, but `AuditLog` has no relation to `User`.
- Impact: Admin audit logs page fails at runtime.
- Files involved: `server/routes/auditLogs.js`, `server/prisma/schema.prisma`.
- Recommended fix: Add `user User @relation(...)` to `AuditLog` or remove the include and manually join.

### Audit logs frontend calls wrong URL

- Description: `AuditLogs.jsx` calls `api.get('/api/audit-logs...')`; helper already prepends `/api`.
- Impact: Client requests `/api/api/audit-logs`.
- Files involved: `client/src/pages/AuditLogs.jsx`, `client/src/services/api.js`.
- Recommended fix: Change endpoint to `/audit-logs?...`.

### Parent secure messaging route is broken

- Description: `messages.js` includes `assignedSlp`, but `Patient` has no `assignedSlp` relation.
- Impact: Parent message sending crashes.
- Files involved: `server/routes/messages.js`, `server/prisma/schema.prisma`.
- Recommended fix: Add relation from `Patient.assignedSlpId` to `Clinician.id` or query clinician separately.

### IEP bulk screening can violate schema

- Description: `server/routes/iep.js` may create appointment with `patientId: null`, but schema requires `patientId String`.
- Impact: Bulk screening can fail for IEP students without linked patient.
- Files involved: `server/routes/iep.js`, `server/prisma/schema.prisma`.
- Recommended fix: Make `Appointment.patientId` optional with relation or require/link patients before scheduling.

### Claim scrubber UI/backend contract mismatch

- Description: Backend returns `passed`, `issues`, `suggestedModifiers`; `Billing.jsx` expects `clean`, `flags`, `suggestions`.
- Impact: Scrubber can misreport or throw when processing claims.
- Files involved: `client/src/pages/Billing.jsx`, `server/routes/billing.js`.
- Recommended fix: Align response contract and add tests.

### Secrets and weak deployment defaults

- Description: `.env` exists locally; `docker-compose.yml` hardcodes `production_password` and placeholder `JWT_SECRET`.
- Impact: Unsafe deployment and secret leakage risk.
- Files involved: `.env`, `.gitignore`, `.env.example`, `docker-compose.yml`, `server/routes/auth.js`, `authenticate.js`.
- Recommended fix: Remove committed secrets from git history, rotate keys, require strong envs, remove fallback secret.

### Missing current-schema migrations block Docker deployment

- Description: `server/Dockerfile` runs `npx prisma migrate deploy`, but migrations are stale.
- Impact: Docker stack will start with DB incompatible with current server code.
- Files involved: `server/Dockerfile`, `docker-compose.yml`, `server/prisma/migrations`.
- Recommended fix: Generate and commit migrations before using Docker deploy.

## Major

- Public `/api/auth/register` allows user creation without admin authorization.
- Broad CORS default uses `origin: '*'`.
- `authenticate.js` accepts JWT in query string.
- `InvoiceDetails.jsx` reads `localStorage.getItem('token')`, but auth stores `speechsync_token`.
- Parent portal report link lacks auth token.
- Appointment creation creates a draft session but does not update `Appointment.sessionId`.
- No appointment edit/delete route.
- Sessions update route lacks role restriction and ownership check.
- Assessments/goals GET routes do not enforce patient ownership.
- Billing has two parallel systems: legacy `BillingRecord` claims and newer `Invoice` payments.
- Billing dashboard uses dollar values while invoice system uses INR.
- AI Scribe has weak streamed JSON parsing and minimal user-facing error reporting.
- Teletherapy UI advertises Google Meet despite Daily.co backend route.
- IEP UI bypasses IEP APIs and has unwired schedule/export buttons.
- No file upload/storage layer.
- No automated tests.
- ESLint script exists but config is missing.

## Minor

- Large frontend bundle warning after production build.
- Placeholder images in GFTA-3, teletherapy stimuli, and portal exercises.
- Compliance/security language is stronger than actual implementation.
- No meaningful TODO/FIXME/HACK comments in source; prompt files contain TODO-style checklist text.
- Inconsistent naming between `Billing`, `AdminBilling`, and patient billing components.
- Some pages rely on all-patients/all-sessions fetches rather than scoped endpoints.
- Limited mobile-specific verification; responsive classes exist but not tested.
- Minimal backend request validation and no express-validator usage despite dependency.

---

# Database Audit

Tables:

- `User`: auth users; used.
- `Patient`: clinical patient record; used.
- `Session`: SOAP/session data; used.
- `Assessment`: standardized assessment results; used.
- `Goal`: therapy goals; used.
- `GoalProgress`: progress history; used by routes, missing migration.
- `BillingRecord`: legacy claim billing; used.
- `Clinician`: SLP profile; used.
- `Appointment`: scheduling/teletherapy; used, missing migration.
- `HomeExercise`: parent home program; used, missing migration.
- `Message`: secure messages; used, missing migration and relation gaps.
- `AuditLog`: audit trail; used but broken, missing migration and relation.
- `IepStudent`: school module; backend uses, frontend mostly bypasses, missing migration.
- `Invoice`: INR invoice; used, missing migration.
- `InvoiceItem`: invoice line item; used, missing migration.
- `Payment`: payment history; used, missing migration.

Missing Tables:

- Not missing from `schema.prisma`, but missing from committed migrations: `GoalProgress`, `Appointment`, `HomeExercise`, `Message`, `AuditLog`, `IepStudent`, `Invoice`, `InvoiceItem`, `Payment`.

Migration Issues:

- Only two migrations exist: initial core schema and `Patient.metadata`.
- Current schema has substantially outgrown migrations.
- Docker deploy uses migrations, so clean deploy will not match application code.

Data Integrity Issues:

- Missing FK relations for `Patient.assignedSlpId`, `Session.clinicianId`, `Appointment.clinicianId`, `Message.fromUserId/toUserId`, `AuditLog.userId`, `IepStudent.patientId`, `BillingRecord.sessionId`.
- Very few indexes beyond primary keys and unique constraints.
- `Appointment.patientId` is required, but IEP route may create null patient appointments.
- Currency is not modeled for invoices/payments.
- Refunds/discounts are not modeled.

---

# Backend Audit

Implemented APIs:

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/change-password`.
- Patients: `GET/POST /api/patients`, `GET/PATCH/DELETE /api/patients/:id`, `GET /api/patients/clinicians/all`.
- Sessions: `GET/POST /api/sessions`, `GET/PUT/DELETE /api/sessions/:id`.
- Assessments: `GET/POST /api/assessments`.
- Billing claims: `GET/POST /api/billing`, `GET /api/billing/alerts`, `GET /api/billing/patient/:patientId`, `PUT/DELETE /api/billing/:id`, `POST /api/billing/scrub`.
- Invoices/payments: `POST/GET /api/invoices`, `GET/PATCH /api/invoices/:id`, `POST/GET /api/payments`, PDF routes, revenue report.
- Goals: goals list, patient goals, progress history, create/update progress.
- Appointments: list/today/next/get/create/status update.
- AI: `POST /api/ai/generate-soap`.
- Teletherapy: `POST /api/teletherapy/create-room`.
- Exercises: list/create/complete/status.
- Messages: inbox/history/send/read.
- IEP: students/schedule/report/bulk export.
- Users: admin user and clinician management.
- Reports: IEP/patient progress PDFs.

Missing APIs:

- `/api/auth/me`, `/api/auth/logout`.
- Appointment edit/delete.
- Assessment PDF export and goal-link route.
- File upload/document APIs.
- Refund API.
- Full invoice delete and line-item edit route.
- SMS/email notification APIs.

Broken APIs:

- `GET /api/audit-logs`: invalid Prisma relation include.
- `POST /api/messages` for parent: invalid `assignedSlp` include.
- `POST /api/iep/schedule-screening`: may pass null `patientId`.
- `POST /api/billing/scrub` does not match client contract.

---

# Frontend Audit

Implemented Screens:

- Login, Dashboard, Patient List, New Patient, Edit Patient, Patient Profile, Assessment New, SOAP Note, Teletherapy, Goals, Billing, Parent Portal, IEP, Scheduling, Audit Logs, User Management, Doctor Management, Admin Billing, Invoice Details, Billing Reports.

Missing Screens:

- Settings screen despite sidebar references.
- Dedicated progress report viewer.
- Secure messaging screen/thread UI.
- Document upload/management screen.
- Full reports dashboard outside billing/IEP.

Broken Screens:

- Audit Logs: wrong endpoint plus broken backend.
- Billing claim scrubber: response mismatch.
- IEP: key actions are unwired and data source does not use IEP backend.
- Invoice PDF/receipt download likely auth-broken due token key mismatch.
- Parent portal message button is not wired.

Frontend Quality:

- Loading states exist on most pages.
- Error states exist on some pages, not consistently.
- Forms mostly use local state/manual validation instead of React Hook Form + Zod.
- React Query is used broadly.
- Mobile responsiveness appears partially addressed with Tailwind responsive classes, but not verified with browser screenshots.

---

# Security Audit

Authentication:

- JWT login works.
- Passwords are bcrypt-hashed.
- Token stored in localStorage, which is acceptable for MVP but XSS-sensitive.
- Fallback JWT secret remains in multiple files.

Authorization:

- `authorize()` middleware exists and is used on many write/admin routes.
- Patient ownership checks are incomplete.
- Parent access is checked for some patient/session/invoice routes, but not all goal/assessment/exercise paths.
- Public registration is a serious issue.

Secrets:

- `.env` exists in the workspace.
- `.gitignore` ignores `.env`, but history status was not rewritten.
- `docker-compose.yml` contains hardcoded DB password and placeholder JWT/Groq secrets.

Input Validation:

- Mostly manual, shallow validation.
- `express-validator` is installed but not meaningfully used.
- Many routes trust IDs, arrays, statuses, and amounts.

OWASP concerns:

- Broken access control risk on patient-scoped APIs.
- Sensitive token in query string supported by `authenticate.js`.
- Secret management weakness.
- No CSRF protection, though JWT Authorization header reduces exposure.
- No security headers/helmet.
- No audit immutability despite UI claims.

---

# Technical Debt

- Schema and migrations are out of sync.
- Missing Prisma relations force manual lookups and cause runtime bugs.
- Two billing domains coexist without clear ownership: claims vs invoices.
- Frontend uses mixed API helper styles.
- Several screens rely on broad collection fetches instead of scoped endpoints.
- No automated test harness.
- No lint config.
- Placeholder media and mock video remain in clinical flows.
- Compliance claims exceed implemented technical controls.
- Docker uses placeholder secrets and stale migration path.
- No CI/CD.
- No typed API contract or shared validation schemas.
- Minimal centralized error handling and no structured logging.

---

# TODO/FIXME/HACK Findings

No source-code `TODO`, `FIXME`, or `HACK` markers were found in implementation files.

Prompt/documentation findings:

- `Prompt.md` explicitly permits mock data and placeholder assets for hackathon MVP.
- `new prompt.md` identifies prior gaps such as no `mockData.js`, Google Meet placeholder, static parent portal, missing reports/uploads/messaging.
- `SpeechSync-implementation-audit.md` previously listed several partial/missing features and has now been replaced by this report.

Placeholder/mock implementation findings:

- `server/routes/teletherapy.js`: mock Google Meet fallback when Daily.co is missing or fails.
- `client/src/pages/Teletherapy.jsx`: static stimulus/media placeholders and Google Meet-oriented UI.
- `client/src/pages/AssessmentNew.jsx`: placeholder stimulus images.
- `client/src/pages/Portal.jsx`: placeholder exercise thumbnails.

---

# Recommended Next Tasks (Priority Order)

1. Fix database deployability and runtime-broken APIs.
   - Effort: 2-3 engineering days.
   - Work: generate/commit migration for current schema; add missing Prisma relations; fix audit logs, messages, IEP scheduling, and scrubber contract.

2. Harden authentication, authorization, and secrets.
   - Effort: 2-3 engineering days.
   - Work: remove fallback JWT secrets, disable public registration or make admin-only, rotate/remove committed secrets, restrict CORS, remove query-token auth, enforce patient ownership on all scoped APIs.

3. Complete billing release requirements.
   - Effort: 2-4 engineering days.
   - Work: add invoice delete/full edit, discount, refund, stored currency, payment history in patient timeline, assessment/session billing linkage, INR-only consistency.

4. Wire incomplete user workflows.
   - Effort: 3-5 engineering days.
   - Work: IEP page to `/api/iep/*`, parent secure messaging UI, real upcoming appointment/join link, appointment edit/delete, teletherapy session link persistence.

5. Add quality gates.
   - Effort: 2-3 engineering days.
   - Work: ESLint config, backend tests for critical routes, frontend smoke tests, CI workflow running build/lint/tests/Prisma validation.

6. Replace placeholder integrations/assets where demo-critical.
   - Effort: 3-6 engineering days.
   - Work: Daily.co iframe, file uploads, assessment PDFs, document center, real stimulus assets or locally bundled placeholders.

---

# Final Verdict

- Is MVP complete? No.
- Is project deployable? No, not safely. The frontend builds, but migrations are stale and Docker deploy will not create the current schema.
- Is project production ready? No.
- Exact features blocking release: current-schema migrations, audit logs, parent messaging, IEP scheduling/export wiring, claim scrubber, auth/authorization hardening, secret cleanup, invoice/report token bugs, appointment/session linkage.
- Estimated remaining work: 38%.
- Estimated engineering days required to finish: 14-24 engineering days for a reliable MVP; 30+ days for production-grade security/compliance hardening.
