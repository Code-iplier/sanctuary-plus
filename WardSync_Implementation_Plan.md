# WardSync — Implementation Plan

## Device & Ward Deterioration Correlation Module for Sanctuary+

> **WardSync is a ward-level intelligence layer that continuously maintains patient device state, computes explainable NEWS2 from general-ward observations, tracks physiological trends, and correlates the two to surface patients whose current care state deserves human review.**

This implementation plan translates the final WardSync pitch into a buildable Sanctuary+ feature. It is intentionally scoped as an **independent ward-level module** that integrates with the existing platform without taking ownership of Queue, Documentation, Medications, Risk, or Chronos.

---

# 1. Product goal

WardSync should answer one question:

> **"Is there a meaningful mismatch or convergence between the patient's current physiological trend and the state of their invasive devices that a clinician should review now?"**

The module has three independent layers:

```text
Patient
   │
   ├───────────────┐
   ↓               ↓
Device State    Ward Vitals
   │               │
   ↓               ↓
Device Rules     NEWS2 + Trend
   │               │
   └───────┬───────┘
           ↓
      Correlation
           ↓
   Explainable Flag
           ↓
      Human Review
```

WardSync is **not** a diagnostic system and does not independently choose treatment.

---

# 2. Explicit scope boundaries

These boundaries should be treated as implementation requirements, not optional design guidance.

## WardSync owns

- General-ward device state
- Device insertion/removal lifecycle
- Device indication/purpose
- Device review state
- Active device connections at a category level
- Manual ward vital observations
- NEWS2 computation
- Per-parameter NEWS2 attribution
- NEWS2 trend detection
- Staleness-aware reassessment prioritization
- Correlation rules between device state and physiological trend
- Explainable review flags
- Patient-level WardSync view
- Ward-level WardSync worklist
- WardSync audit trail

## WardSync does not own

### Chronos

Chronos remains responsible for ICU/acute deterioration intelligence.

WardSync is:

- general ward
- pre-ICU
- intermittent/manual vitals
- trend and correlation based

Chronos is:

- ICU
- continuous monitoring
- acute deterioration / early warning

WardSync must never attempt to become an alternative ICU monitor.

### Medications

WardSync may reference whether a medication connection is active so that it can reason about device purpose.

It must not:

- create prescriptions
- change prescriptions
- calculate doses
- run drug-drug interaction checks
- run allergy checks
- recommend medications

### Risk

WardSync computes a short-horizon ward monitoring signal.

It must not become:

- ASCVD risk
- CKD risk
- readmission risk
- chronic disease risk
- generic composite patient risk

### Queue

WardSync does not reorder the patient queue or determine triage priority.

Its worklist is an **attention/review list for ward staff**, not a patient-flow queue.

### Documentation

WardSync produces structured events and evidence trails. It does not generate or replace clinical notes.

---

# 3. MVP strategy

The MVP should be built in three phases.

## Phase 1 — Core data and rules

Deliver:

- Device CRUD
- Device lifecycle
- Device indication
- Device review status
- Manual vital entry
- NEWS2 scoring
- NEWS2 parameter attribution
- Trend calculation
- Review-due detection

## Phase 2 — Correlation

Deliver:

- Explainable correlation rules
- Combined review flags
- Evidence trail
- Flag acknowledgement
- Flag resolution
- Re-evaluation after device/vital changes

## Phase 3 — Ward intelligence

Deliver:

- Patient combined view
- Ward-level worklist
- Device/vitals overview
- Staleness-aware reassessment priority
- Basic analytics

ML is explicitly **not required for MVP**.

---

# 4. Recommended repository structure

The current Sanctuary+ frontend uses one page per feature, and the existing Queue backend establishes a `module/controller/service/store/types` pattern. WardSync should follow the same conventions.

## Backend

```text
apps/backend/src/wardwatch/
├── wardwatch.module.ts
├── wardwatch.controller.ts
├── wardwatch.service.ts
├── wardwatch.store.ts
├── wardwatch.types.ts
├── wardwatch.rules.ts
├── wardwatch.scoring.ts
├── wardwatch.scheduler.ts
└── wardwatch.analytics.ts
```

### File responsibilities

#### `wardwatch.module.ts`

NestJS module definition.

Imports/provides WardSync dependencies.

#### `wardwatch.controller.ts`

REST endpoints only.

No clinical/business logic should live here.

#### `wardwatch.service.ts`

Orchestrates:

- device operations
- vital ingestion
- score generation
- rule evaluation
- flag lifecycle

#### `wardwatch.store.ts`

Persistence abstraction.

For MVP this can be an in-memory store if the rest of Sanctuary+ is still operating similarly, but the interface should be designed so PostgreSQL can replace it without rewriting business logic.

#### `wardwatch.types.ts`

Shared domain types.

#### `wardwatch.rules.ts`

All deterministic review and correlation rules.

#### `wardwatch.scoring.ts`

NEWS2 implementation.

Keep score logic isolated and unit-testable.

#### `wardwatch.scheduler.ts`

Periodic tasks such as:

- re-evaluating stale device reviews
- checking stale vitals
- refreshing open correlation flags
- generating overdue/reassessment items

#### `wardwatch.analytics.ts`

Ward-level aggregates such as:

- active devices
- review-due devices
- NEWS2 distribution
- rising-trend patients
- open correlation flags

---

# 5. Frontend structure

```text
apps/frontend/src/pages/
└── WardWatchPage.tsx
```

The current pitch uses `WardWatch` as the implementation placeholder. If the final product name becomes `WardSync`, the file can later be renamed to `WardSyncPage.tsx` without changing the architecture.

Recommended components:

```text
apps/frontend/src/components/wardwatch/
├── DeviceCard.tsx
├── DeviceInventory.tsx
├── DeviceReviewDialog.tsx
├── DeviceTimeline.tsx
├── News2ScoreCard.tsx
├── News2Breakdown.tsx
├── News2Chart.tsx
├── VitalEntryForm.tsx
├── CombinedFlagCard.tsx
├── EvidencePanel.tsx
├── WardOverviewBoard.tsx
├── RecheckQueue.tsx
└── PatientCombinedView.tsx
```

---

# 6. Domain model

## 6.1 PatientDevice

```typescript
export type DeviceType =
  | 'PERIPHERAL_IV'
  | 'CENTRAL_LINE'
  | 'URINARY_CATHETER'
  | 'SURGICAL_DRAIN';

export type DeviceStatus =
  | 'ACTIVE'
  | 'REVIEW_DUE'
  | 'REMOVED';

export interface PatientDevice {
  id: string;
  patientId: string;

  type: DeviceType;
  location?: string;

  indication?: string;

  insertedAt: Date;
  removedAt?: Date;

  status: DeviceStatus;

  lastReviewedAt?: Date;
}
```

### Design rule

Do not use duration alone to decide whether a device is inappropriate.

A device becomes review-due because of a **state inconsistency**, such as:

- indication missing
- indication no longer supported
- associated connection ended
- patient moved to a care state where the indication should be reassessed
- review overdue

Duration is supporting context.

---

# 7. Device connections

The module needs enough information to understand device purpose without duplicating the medication system.

```typescript
export type DeviceConnectionType =
  | 'FLUID'
  | 'MEDICATION'
  | 'BLOOD'
  | 'NUTRITION'
  | 'DRAINAGE';

export interface DeviceConnection {
  id: string;
  deviceId: string;

  type: DeviceConnectionType;

  referenceId?: string;

  startedAt: Date;
  endedAt?: Date;
}
```

### Integration rule

`referenceId` may point to another Sanctuary+ domain object.

Example:

```text
Medication module
    |
    | medication infusion active
    ↓
LineGuard / WardWatch
    |
    ↓
Peripheral IV still has active purpose
```

WardSync reads the **existence/state** of the connection.

It does not own the medication.

---

# 8. Vital observations

Implement the seven NEWS2 inputs defined in the pitch.

```typescript
export interface VitalsReading {
  id: string;
  patientId: string;

  takenAt: Date;

  respiratoryRate: number;

  spo2: number;
  spo2Scale: 1 | 2;

  temperature: number;

  systolicBP: number;

  heartRate: number;

  consciousness:
    | 'ALERT'
    | 'CONFUSION'
    | 'VOICE'
    | 'PAIN'
    | 'UNRESPONSIVE';

  supplementalOxygen: boolean;
}
```

The `spo2Scale` field is required because the pitch explicitly supports NEWS2 Scale 2 for patients with a prescribed lower target range.

---

# 9. NEWS2 scoring model

Keep the NEWS2 implementation completely isolated from WardSync correlation logic.

```typescript
export interface News2ParameterScores {
  respiratoryRate: number;
  spo2: number;
  temperature: number;
  systolicBP: number;
  heartRate: number;
  consciousness: number;
  supplementalOxygen: number;
}

export interface News2Score {
  id: string;
  readingId: string;

  totalScore: number;

  perParameterScore: News2ParameterScores;

  trend: 'RISING' | 'STABLE' | 'FALLING';
}
```

## Critical implementation requirements

### Attribution

Every score must answer:

```text
Why is the score 6?
```

Example:

```text
NEWS2 = 6

Temperature      +2
Heart rate       +2
Respiratory rate +1
Oxygen           +1
```

Never expose only:

```text
NEWS2 = 6
```

### Trend

At minimum compare recent scores:

```text
2 → 4 → 6
```

Classify:

```text
RISING
STABLE
FALLING
```

Do not attempt a sophisticated time-series model in MVP.

---

# 10. Trend calculation

Implement a simple, explainable trend engine first.

Example:

```typescript
function calculateTrend(
  scores: News2Score[],
): 'RISING' | 'STABLE' | 'FALLING' {
  if (scores.length < 2) return 'STABLE';

  const previous = scores.at(-2)!.totalScore;
  const current = scores.at(-1)!.totalScore;

  if (current > previous) return 'RISING';
  if (current < previous) return 'FALLING';

  return 'STABLE';
}
```

A later iteration may use:

- slope
- rolling window
- acceleration
- volatility

but MVP should remain transparent.

---

# 11. Device review rules

The device rules engine should answer:

> **"Does the current device state deserve human review?"**

Example rules:

```typescript
if (!device.indication) {
  return 'REVIEW_DUE';
}
```

```typescript
if (device.indication === 'POST_OP_MONITORING' && careState.postOpMonitoringComplete) {
  return 'REVIEW_DUE';
}
```

```typescript
if (device.type === 'PERIPHERAL_IV' && allConnectionsEnded && noOtherPurpose) {
  return 'REVIEW_DUE';
}
```

These rules must produce an explanation.

Example:

```json
{
  "status": "REVIEW_DUE",
  "reason": "Documented indication is no longer supported by the current care state."
}
```

---

# 12. Correlation layer

This is the core differentiator.

Do not calculate an opaque "combined risk score".

Instead detect explicit conditions.

Initial correlation rule:

```text
IF

NEWS2 trend = RISING
AND
NEWS2 trend is driven by relevant changing parameters
AND
patient has an active device
AND
device = REVIEW_DUE

THEN

create CombinedFlag
```

A more implementation-oriented version:

```typescript
if (
  news2.trend === 'RISING' &&
  hasRelevantDrivers(news2) &&
  device.status === 'REVIEW_DUE'
) {
  return createCorrelationFlag({
    patientId,
    reason: 'Rising ward score with concurrent unreviewed device',
    evidence: {
      vitalsTrendSummary,
      deviceReviewReason,
    },
  });
}
```

---

# 13. Evidence-first output

Every flag must contain the evidence used to create it.

```typescript
export interface CorrelationFlag {
  id: string;
  patientId: string;

  raisedAt: Date;

  reason: string;

  evidence: {
    vitalsTrendSummary: string;
    deviceReviewReason: string;
  };

  status:
    | 'OPEN'
    | 'ACKNOWLEDGED'
    | 'RESOLVED';
}
```

Example:

```text
COMBINED FLAG

Reason:
Rising NEWS2 with concurrent unreviewed urinary catheter

Evidence:
• NEWS2: 2 → 4 → 6
• Trend drivers: temperature + heart rate
• Urinary catheter: day 3
• Original indication: post-operative monitoring
• Indication resolved: 13 hours ago
• Device review: not completed
```

The UI should never show a combined flag without showing **why it exists**.

---

# 14. Flag lifecycle

Flags should behave like workflow objects.

```text
OPEN
  ↓
ACKNOWLEDGED
  ↓
RESOLVED
```

Resolution can occur because:

```text
device retained with updated purpose
device removed
vitals reviewed and trend normalized
false positive / dismissed with reason
```

Recommended extension:

```typescript
export type FlagResolution =
  | 'DEVICE_RETAINED'
  | 'DEVICE_REMOVED'
  | 'PURPOSE_UPDATED'
  | 'CLINICAL_REVIEW_COMPLETE'
  | 'DISMISSED';
```

This creates a useful audit trail.

---

# 15. Reassessment priority

This is a stretch feature but a valuable one.

The pitch explicitly proposes:

> current score + observation freshness

Example:

```text
Patient A
NEWS2 = 3
last observation = 20 minutes ago

Patient B
NEWS2 = 3
last observation = 90 minutes ago
```

Patient B should be surfaced higher for reassessment.

Implement a simple priority formula first:

```text
priority =
  normalizedCurrentScore
  +
  normalizedObservationAge
```

Later, improve it to:

```text
priority =
    risk
  + staleness
  + trend
  + uncertainty
```

Do not let this become another clinical score.

It is only a **recheck ordering mechanism**.

---

# 16. API surface

## Device APIs

```http
GET  /wardwatch/patients/:id/devices
POST /wardwatch/devices
PATCH /wardwatch/devices/:id
POST /wardwatch/devices/:id/review
POST /wardwatch/devices/:id/remove
```

## Vitals APIs

```http
POST /wardwatch/vitals
GET  /wardwatch/patients/:id/vitals
GET  /wardwatch/patients/:id/news2
GET  /wardwatch/patients/:id/news2-trend
```

## Flag APIs

```http
GET  /wardwatch/flags
GET  /wardwatch/patients/:id/flags

POST /wardwatch/flags/:id/acknowledge
POST /wardwatch/flags/:id/resolve
```

## Dashboard APIs

```http
GET /wardwatch/dashboard
GET /wardwatch/dashboard/review-due
GET /wardwatch/dashboard/rising-trends
GET /wardwatch/dashboard/recheck-priority
```

---

# 17. Example API responses

## Patient combined view

```json
{
  "patientId": "P-1024",
  "news2": {
    "total": 6,
    "trend": "RISING",
    "drivers": [
      "temperature",
      "heartRate"
    ]
  },
  "devices": [
    {
      "type": "URINARY_CATHETER",
      "status": "REVIEW_DUE",
      "reason": "Post-operative indication resolved 13 hours ago"
    }
  ],
  "flags": [
    {
      "type": "COMBINED",
      "severity": "HIGH",
      "reason": "Rising NEWS2 with concurrent unreviewed device"
    }
  ]
}
```

---

# 18. Patient UI

The primary patient screen should visually combine the two independent streams.

```text
┌──────────────────────────────────────────────┐
│ P-1024                                       │
│ General Ward • Bed 14                        │
├──────────────────────────────────────────────┤
│ NEWS2                                        │
│ 6  ↑ RISING                                  │
│                                              │
│ RR          1                                │
│ SpO2        0                                │
│ Temp        2                                │
│ BP          0                                │
│ HR          2                                │
│ Conscious   0                                │
│ O₂          1                                │
│                                              │
│ Trend: 2 → 4 → 6                             │
├──────────────────────────────────────────────┤
│ DEVICES                                      │
│                                              │
│ Urinary Catheter                             │
│ Day 3 • Post-op monitoring                   │
│ ⚠ REVIEW DUE                                 │
│ Reason: indication resolved                   │
├──────────────────────────────────────────────┤
│ COMBINED FLAG                                │
│                                              │
│ Rising NEWS2 + unreviewed urinary catheter   │
│                                              │
│ [View Evidence] [Acknowledge]                │
└──────────────────────────────────────────────┘
```

---

# 19. Ward-level UI

The ward screen should not be another giant dashboard.

Its job is to answer:

> **"Which patients need attention first?"**

Example:

```text
WARD WardSync

12 open items

HIGH
────────────────────────────
P-1024
NEWS2 6 ↑
Urinary catheter review due
Combined flag

P-1088
NEWS2 5 ↑
Central line review due
Combined flag

MEDIUM
────────────────────────────
P-1102
NEWS2 3 ↑
Device state normal
Vitals reassessment due

P-1140
NEWS2 2 →
Device review due
```

This screen is a nursing/ward attention surface.

It does not replace the Queue.

---

# 20. Device inventory UI

Each patient should have a device inventory:

```text
ACTIVE DEVICES

Peripheral IV
Left forearm
Day 2
Purpose: IV access
Status: ACTIVE

Central Line
Right IJ
Day 5
Purpose: Medication infusion
Status: ACTIVE

Urinary Catheter
Day 3
Purpose: Post-op monitoring
Status: REVIEW DUE
```

A device card should show:

- type
- location
- age
- indication
- active connections
- last review
- status
- review reason

---

# 21. Device handoff view

A useful secondary view:

```text
PATIENT DEVICE SUMMARY

Active:
4

Review due:
1

Devices:
• Peripheral IV
• Central line
• Urinary catheter ⚠
• Surgical drain

Recent change:
Peripheral IV connection ended 3h ago
```

This is particularly useful during transfer between wards.

It should be read-only during handoff; device changes still happen through the main workflow.

---

# 22. Scheduler behaviour

The scheduler should periodically evaluate:

```text
1. Devices
2. Open flags
3. Stale observations
```

Pseudo-flow:

```text
Every N minutes
      ↓
Load active ward patients
      ↓
Re-evaluate device state
      ↓
Re-evaluate NEWS2 trends
      ↓
Evaluate correlation rules
      ↓
Create/update/resolve flags
      ↓
Refresh ward worklist
```

For MVP, N can be 5–15 minutes.

Do not make this a high-frequency real-time stream.

The actual clinical observations are still entered at ward-check intervals.

---

# 23. Event-driven integration

Later, WardSync can subscribe to Sanctuary+ domain events.

Examples:

```text
MEDICATION_DISCONTINUED
DEVICE_INSERTED
DEVICE_REMOVED
PATIENT_TRANSFERRED
PROCEDURE_COMPLETED
PATIENT_DISCHARGED
```

Example:

```text
MEDICATION_DISCONTINUED
        ↓
WardSync receives event
        ↓
Check affected device connections
        ↓
Does device still have another purpose?
        ↓
If not → REVIEW_DUE
```

This is preferable to periodically re-reading every module once the platform grows.

---

# 24. Integration with existing Sanctuary+

## Medications

Read:

```text
medication connection active/inactive
```

Do not read or manipulate:

```text
dose
choice
DDI
allergy
prescription
```

## Documentation

Potential future input:

```text
procedure completed
post-op period complete
indication updated
```

WardSync should consume structured signals where possible, not parse free-text notes in MVP.

## Queue

No direct write access.

WardSync should not modify queue position.

## Risk

No shared risk score.

Keep the data models separate.

## Chronos

The strongest integration is eventually:

```text
WardSync:
general ward → rising warning

       ↓ escalation / transfer

Chronos:
ICU → continuous acute deterioration monitoring
```

The handoff is conceptual and can remain manual in MVP.

---

# 25. App integration

The current frontend navigation already has:

```text
Dashboard
Queue
Documentation
Medications
Risk
Chronos
```

Add:

```text
WardSync
```

to the navigation in `apps/frontend/src/App.tsx`.

Recommended position:

```text
Dashboard
Queue
Documentation
Medications
Risk
WardSync
Chronos ICU
```

Keeping WardSync immediately before Chronos visually reinforces the:

```text
General ward
     ↓
WardSync
     ↓
ICU
     ↓
Chronos
```

clinical-intelligence progression.

---

# 26. AppModule integration

Add `WardWatchModule` to:

```text
apps/backend/src/app/app.module.ts
```

Expected pattern:

```typescript
@Module({
  imports: [
    QueueModule,
    WardWatchModule,
  ],
})
export class AppModule {}
```

Do not put WardSync logic into `QueueModule` or `Chronos` bridge code.

---

# 27. Storage strategy

The repository README describes PostgreSQL/Redis as the target platform architecture, while the current concrete backend branch has the queue module as the established implementation. WardSync should therefore be persistence-agnostic from day one.

## MVP

A `store` abstraction can use in-memory storage for rapid implementation.

Example:

```typescript
export interface WardWatchStore {
  getDevice(id: string): Promise<PatientDevice | undefined>;
  saveDevice(device: PatientDevice): Promise<void>;

  addVital(reading: VitalsReading): Promise<void>;
  getVitals(patientId: string): Promise<VitalsReading[]>;

  saveNews2(score: News2Score): Promise<void>;
  saveFlag(flag: CorrelationFlag): Promise<void>;
}
```

## Production direction

Replace implementation with PostgreSQL repositories.

Suggested tables:

```text
patient_devices
device_connections
vital_readings
news2_scores
correlation_flags
device_reviews
```

---

# 28. Testing plan

This module requires unusually strong unit testing because the main value is deterministic reasoning.

## NEWS2 tests

Test every scoring boundary for:

- respiratory rate
- SpO2 Scale 1
- SpO2 Scale 2
- temperature
- systolic BP
- heart rate
- consciousness
- supplemental oxygen

For every test, verify:

```textinput
→ per-parameter score
→ total score
```

## Trend tests

```text
2 → 4 → 6 = RISING
6 → 6 → 6 = STABLE
7 → 5 → 2 = FALLING
```

## Device rules

```text
missing indication → REVIEW_DUE
active valid purpose → ACTIVE
ended connection + no other purpose → REVIEW_DUE
explicit removal → REMOVED
```

## Correlation tests

```text
RISING + REVIEW_DUE → combined flag
RISING + ACTIVE → no combined flag
STABLE + REVIEW_DUE → standalone device flag only
FALLING + REVIEW_DUE → standalone device flag only
```

## Flag lifecycle tests

```text
OPEN → ACKNOWLEDGED → RESOLVED
```

No invalid transitions.

---

# 29. Frontend testing

Test:

- device creation
- device review
- device removal
- vital submission
- NEWS2 display
- attribution display
- trend graph
- flag acknowledgement
- flag resolution
- ward worklist filtering
- patient combined view

The patient page should never show a combined flag without its evidence.

---

# 30. Demo data

Create a small synthetic ward, for example:

```text
15 patients
```

Use several categories:

### Patient A — baseline

```text
NEWS2 stable
devices valid
→ no alert
```

### Patient B — device-only issue

```text
NEWS2 stable
catheter indication resolved
→ device review
```

### Patient C — trend-only issue

```text
NEWS2 2 → 4 → 6
no device problem
→ physiological trend flag
```

### Patient D — combined signal

```text
NEWS2 2 → 4 → 6
urinary catheter review due
→ combined flag
```

### Patient E — stale data

```text
NEWS2 3
last reading 90 minutes old
→ high reassessment priority
```

This proves the system is not just generating alerts for everyone.

---

# 31. Demo timeline

Use the pitch scenario directly.

## Initial state

```text
Patient: P-1024
NEWS2: 2
Urinary catheter: ACTIVE
```

No flag.

## Step 1 — indication resolves

Update device state:

```text
Purpose:
Post-operative monitoring

Care state:
Monitoring complete

Device:
REVIEW_DUE
```

Still no combined flag.

## Step 2 — new vitals

```text
14:00
Temp 37.6
HR 88

18:00
Temp 37.9
HR 96

22:00
Temp 38.3
HR 104
```

NEWS2 changes:

```text
2 → 4 → 6
```

Trend becomes:

```text
RISING
```

## Step 3 — correlation

WardSync detects:

```text
RISING physiological trend
+
REVIEW_DUE device
```

Create:

```text
COMBINED FLAG
```

## Step 4 — human action

User chooses:

```text
Review device
```

Then:

```text
Remove
```

or:

```text
Update purpose
```

and marks vitals reviewed.

## Step 5 — flag resolution

Combined flag moves:

```text
OPEN → ACKNOWLEDGED → RESOLVED
```

Then show the ward board.

---

# 32. Observability

Log every major state transition.

Examples:

```text
DEVICE_CREATED
DEVICE_REVIEW_DUE
DEVICE_REVIEWED
DEVICE_REMOVED

VITAL_RECORDED
NEWS2_CALCULATED
NEWS2_TREND_CHANGED

CORRELATION_MATCHED
FLAG_CREATED
FLAG_ACKNOWLEDGED
FLAG_RESOLVED
```

This makes debugging and demo tracing much easier.

---

# 33. Error handling

The backend should distinguish:

### Invalid clinical input

```text
SpO2 < 0
SpO2 > 100
negative respiratory rate
invalid temperature
```

→ `400 Bad Request`

### Missing patient/device

→ `404 Not Found`

### Invalid state transition

Example:

```text
REMOVED → ACTIVE
```

→ `409 Conflict`

### Duplicate event

Use idempotent handling where possible.

Example:

```text
same device-review event received twice
```

should not generate two flags.

---

# 34. Security and access control

MVP can remain simple, but structure endpoints for later RBAC.

Possible roles:

```text
NURSE
DOCTOR
WARD_ADMIN
HOSPITAL_ADMIN
```

Example:

- Nurse: enter vitals, review devices, acknowledge flags
- Doctor: view/resolve flags, update clinical purpose
- Ward admin: view ward analytics
- Hospital admin: view aggregate trends

Do not let a ward role modify unrelated patient records through WardSync.

---

# 35. Auditability

Every clinically meaningful action should record:

```text
who
what
when
before
after
```

Example:

```json
{
  "userId": "N-104",
  "action": "DEVICE_REMOVED",
  "deviceId": "DEV-441",
  "timestamp": "2026-09-08T22:18:00Z",
  "previousStatus": "REVIEW_DUE",
  "newStatus": "REMOVED"
}
```

For a hackathon this can be a simple event log.

---

# 36. Performance target

This module should be lightweight.

A single ward demo may only contain:

```text
15–100 patients
```

But design for:

```text
500+ active inpatients
```

The main queries should be indexed by:

```text
patientId
wardId
status
takenAt
insertedAt
raisedAt
```

Avoid recalculating the entire hospital whenever one vital is entered.

Only recompute:

```text
affected patient
affected device
affected flags
```

---

# 37. What should be hard-coded for the demo

Acceptable:

- synthetic patients
- synthetic vitals
- synthetic device data
- configured ward
- configured test scenarios

Not acceptable as permanent logic:

- hard-coded combined flags
- hard-coded NEWS2 values
- "fake AI" output that never comes from input
- UI-only state with no backend model

The demo should visibly change when the underlying data changes.

---

# 38. Future enhancements

These should remain out of MVP.

## ML prioritization

Learn which combinations of:

```text
trend
device type
duration
patient context
observation staleness
```

are most useful for review.

## Better trend engine

Replace simple adjacent-score comparison with:

- rolling windows
- slope
- change-point detection
- trajectory classification

## Structured care-state inputs

Consume:

```text
procedures
transfers
medication status
discharge status
```

from Sanctuary+ modules.

## Device burden analytics

Track:

```text
number of active devices
duration
device changes
device density
```

## Ward-level pattern detection

Identify:

```text
ward with unusual increase in review-due devices
ward with increasing physiological deterioration signals
```

These are future enhancements, not core WardSync.

---

# 39. Implementation order

Recommended sequence for the development team:

```text
1. Create WardWatch/WardSync module skeleton
       ↓
2. Create domain types
       ↓
3. Implement in-memory store
       ↓
4. Implement device CRUD
       ↓
5. Implement device review rules
       ↓
6. Implement vital ingestion
       ↓
7. Implement NEWS2 scorer
       ↓
8. Implement NEWS2 attribution
       ↓
9. Implement trend calculation
       ↓
10. Implement correlation rules
       ↓
11. Implement flag lifecycle
       ↓
12. Implement patient combined API
       ↓
13. Implement ward dashboard API
       ↓
14. Build frontend patient view
       ↓
15. Build ward worklist
       ↓
16. Add scheduler
       ↓
17. Add integration hooks
       ↓
18. Add tests
       ↓
19. Connect to Dashboard
       ↓
20. Demo hardening
```

---

# 40. Suggested Git workflow

Keep WardSync isolated from Queue and other major work.

Suggested branches:

```text
feat/WardSync-core
feat/WardSync-news2
feat/WardSync-correlation
feat/WardSync-ui
feat/WardSync-integration
```

Or, for a smaller team:

```text
feat/wardwatch
```

with commits grouped by layer.

Recommended commit progression:

```text
feat(WardSync): scaffold wardwatch module
feat(WardSync): add device lifecycle
feat(WardSync): add device review rules
feat(WardSync): implement NEWS2 scoring
feat(WardSync): add trend detection
feat(WardSync): add correlation flags
feat(WardSync): add patient view
feat(WardSync): add ward dashboard
feat(WardSync): add scheduler
test(WardSync): add scoring and rule coverage
```

---

# 41. Definition of done for MVP

WardSync is MVP-complete when all of the following are true:

## Device state

- [ ] A patient can have multiple active devices
- [ ] Each device has insertion time
- [ ] Each device has an indication
- [ ] Each device can have connections
- [ ] Each device can be reviewed
- [ ] Each device can be removed
- [ ] Review-due status is rule-derived

## NEWS2

- [ ] All required parameters are captured
- [ ] NEWS2 score is calculated correctly
- [ ] Every score is attributable to parameters
- [ ] Score trend is calculated
- [ ] Stale observations are visible

## Correlation

- [ ] Device and NEWS2 data remain independent
- [ ] Correlation rules operate on both
- [ ] Combined flags contain evidence
- [ ] Flags can be acknowledged
- [ ] Flags can be resolved

## UI

- [ ] Patient combined view works
- [ ] Ward worklist works
- [ ] Evidence is visible
- [ ] Device status is visible
- [ ] NEWS2 trend is visible

## Integration

- [ ] WardSync is reachable from App navigation
- [ ] WardSync module is registered in AppModule
- [ ] No WardSync code modifies Queue
- [ ] No WardSync code modifies Medications
- [ ] No WardSync code modifies Chronos
- [ ] Dashboard can eventually consume WardSync summary

---

# 42. Final architecture

The intended final architecture is:

```text
                         SANCTUARY+

 ┌───────────┐   ┌───────────────┐   ┌───────────────┐
 │   Queue   │   │ Documentation │   │  Medications  │
 └───────────┘   └───────────────┘   └───────────────┘

 ┌───────────┐   ┌───────────────┐   ┌───────────────┐
 │    Risk   │   │   WardSync    │   │   Chronos ICU │
 │            │   │               │   │               │
 │ long-term  │   │ general ward  │   │ acute ICU     │
 │ risk       │   │ correlation   │   │ deterioration │
 └───────────┘   └───────┬───────┘   └───────────────┘
                         │
                ┌────────┴────────┐
                │                 │
          DEVICE STATE       WARD VITALS
                │                 │
                └────────┬────────┘
                         ↓
                  CORRELATION
                         ↓
                 EXPLAINABLE FLAG
                         ↓
                  HUMAN REVIEW
```

---

# 43. The core engineering principle

The most important implementation rule for the entire module is:

> **Do not build another black-box risk score. Build two independently explainable state models and make the correlation between them the product.**

The device engine should be useful by itself.

The NEWS2 engine should be useful by itself.

The WardSync differentiator appears when both say:

```text
"Something deserves attention."
```

for **different, independently observable reasons**.

That is the feature the rest of Sanctuary+ does not currently provide.

---

# 44. Final product definition

### WardSync

**Ward-Level Device & Physiological Correlation System**

**Inputs**

```text
Devices
Indications
Connections
Device lifecycle
Ward vitals
```

**Processing**

```text
Device state engine
NEWS2 scoring engine
Trend engine
Correlation engine
```

**Outputs**

```text
Device review
NEWS2 trend
Reassessment priority
Combined evidence-backed flag
Ward attention board
```

**Human decision**

```text
Retain
Remove
Update purpose
Acknowledge
Escalate
Resolve
```

**Hard boundary**

```text
Not diagnosis
Not treatment
Not prescription
Not queue management
Not ICU monitoring
```

---

# 45. First implementation milestone

The first coding milestone should be deliberately small:

> **Build one patient end-to-end.**

That means:

```text
Create patient
   ↓
Add urinary catheter
   ↓
Mark indication
   ↓
Resolve indication
   ↓
Enter 3 vitals readings
   ↓
Calculate NEWS2
   ↓
Detect rising trend
   ↓
Detect device review due
   ↓
Generate correlation flag
   ↓
Show evidence
   ↓
Acknowledge
   ↓
Resolve
```

Do not start with the ward dashboard.

Do not start with ML.

Do not start with PostgreSQL.

Do not start with five different device types.

Get the **single-patient state transition** correct first. Once that works, everything else is aggregation and integration.
