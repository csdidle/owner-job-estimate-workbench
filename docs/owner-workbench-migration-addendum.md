# Owner Job & Estimate Workbench Migration Addendum

Generated: 2026-08-23 (America/Chicago)

## 1. Scope and evidence

This addendum reconciles:

- Source app: `Owner Job & Estimate Workbench` (`appcvbM0BkLWv7uMSrk`)
- Source base: `bse7bbdbrcd6YfA8YpU`
- Destination app: `Owner Pricing & Estimates` (`appsMyhy1MddCNb0iMK`)
- Destination base: `bserpnTFR1mwjN09gUZ`
- The raw session preserved in `docs/owner-workbench-build-chat-history.md`
- Current source and destination app snapshots
- Live source and destination base resource trees
- `docs/owner-workbench-reconciliation-manifest.md`

The raw transcript available here begins on 2026-08-16. The original earlier build chat is unavailable, so requirements predating that boundary are supported by source code, live resources, memory records, and recovered commit descriptions rather than a verbatim request.

No runtime code, table, field, record, workflow, login configuration, environment variable, or publish state was changed while creating this addendum.

## 2. Chronological requirement ledger

| Requirement | Original request reference | Later correction/revision | Superseded? | Final intended behavior | Implementation evidence | Verification evidence | Known gap |
|---|---|---|---|---|---|---|---|
| Use client-facing language | Earlier chat unavailable; recovered commit `f39b935` | Persistent feedback says avoid routing/gate/pipeline jargon | No | Visible UI describes outcomes in plain language while stored states remain unchanged | Source workbench labels and `lib/workbench-contract.ts` | Source UI inspection | Exact original wording request unavailable |
| Add guided visual hierarchy | Earlier chat unavailable; recovered commit `a0a329e` | Styling reused for Invoice Workbench on 2026-08-16 | No | Three visually distinct stages, live counts, emphasized next actions | `components/workbench/workbench.tsx` | Preview and source inspection | Destination currently uses five operational tabs instead |
| Add Harris & Sharp branding | Earlier chat unavailable; recovered commit `e3172c0` | Reused in Invoice Workbench | No | Logo in header/login, restrained moss/emerald treatment | `public/main-logo-grey-moss.svg`, `app/page.tsx`, login page | Preview smoke tests | Destination snapshot has no matching logo asset |
| Support standalone pricing and later promotion | Earlier chat unavailable; recovered commit `32fd2a8` | None | No | Save pricing without a job, then later promote it to job or estimate | `savePricingJob`, `promoteSavedPricing` | Source inspection | No accessible end-to-end promotion test |
| Put cost/pricing before service lines | Earlier chat unavailable; commit `8803ea8` | None | No | Cost and pricing inputs precede service scope entry | `price-jobs-tab.tsx` | Source inspection | Destination layout differs |
| Responsive workbench | Earlier chat unavailable; commit `fa5947c` | Continued responsive fixes in later UI work | No | Mobile and desktop forms/tables/actions do not overlap | All three source workbench tabs | Lint/type checks and preview smoke tests | No Playwright viewport evidence in accessible chat |
| Put estimate media under service lines | Earlier chat unavailable; commits `ed218a5`, `8e52442` | Memory confirms initial capture under service lines and later access in builder | No | Upload photos/videos while defining scope; review/add later in Estimate Builder; selected photos can be customer-facing | Source media API and both pricing/estimate editors | Attachment rendering/source inspection | Destination has no estimate media route or UI |
| Keep Invoice Workbench independent | 2026-08-16 request applied similar styling to Invoice Workbench | User clarified to apply directly, but no request to merge apps | No | Styling may match, but app code, SQL, auth, workflows, deployment, and commits remain independent | Invoice updated through separate app ID `appSHXTt2Tb0hGXeNnb`; source app not edited for that request | Separate app generation, build, and preview checks | Destination base has its own Invoice Workbench `appxZLV3BjrLoiySinT`; do not share source modules |
| Quantity increases by one | 2026-08-17: “QTY should go up by 1 not .01” | 2026-08-17 screenshot: “there should be no decimals '1'” | First step-only fix superseded | Quantity is a positive whole number, minimum 1; existing decimal estimate values normalize to whole units; server rejects decimals | Commits `fdc795c`, then `1f8856a`; source uses `wholeQuantity` and integer Zod validation | TypeScript, lint, preview compile | Destination still allows `0`, decimals, and step `0.01`; must reconcile |
| Permanent draft estimate deletion | Earlier request/commit `31df392`; deletion corrections `19c0b9c` | 2026-08-17 API 400 exposed array serialization bug | No | Delete draft estimate and lines from Teable, put linked job on hold/unlink it, clear pricing link | `deleteDraftEstimate`, `deleteRecords` | Record `recqUBMCAYzxpLGcMb0` later confirmed absent; line/job/pricing link counts all zero | Latest source version 23 regressed multi-ID query serialization |
| Confirm table deletion | 2026-08-17 user asked whether deleted estimate was removed from table | None | No | Deletion is physical, not view-only | SQL checks against estimate, line, job, and pricing tables | All four relevant counts returned zero | Test covered one estimate; multi-line deletion serializer remains regressed in latest source |
| Treat Dashlane hydration mismatch correctly | 2026-08-19 runtime error report | Diagnosed as extension-injected attributes and span | No | Do not suppress genuine hydration errors or edit generated login code; disable extension for preview | Error showed `data-dashlane-*` and generated `<span>` | Server logs showed normal login flow | Browser-specific; not a migration blocker |
| Produce migration reconciliation manifest | 2026-08-19 user reported fork and need to move app to data | Destination IDs supplied 2026-08-23 | No | Reconcile capabilities against destination data, not merely copy source IDs | Commit `edf984a`, manifest file | Source/destination inspection | Earlier manifest assumed source base could be data home; destination is now known |
| Preserve exact build chat | 2026-08-23 attached handoff prompt | Raw session discovered locally | No | Preserve available session verbatim; clearly mark unavailable earlier chat | `owner-workbench-build-chat-history.md` | JSONL boundary and event counts checked | Original pre-August-16 build chat still unavailable |
| Move capabilities, not records | 2026-08-19 “app needs to be moved to where the data lives”; destination supplied 2026-08-23 | Handoff explicitly says do not move/modify records | No | Reconcile application behavior onto destination-native tables/workflows; do not migrate source operational records | Destination already has corresponding operational tables and workers | Destination node tree and app source inspection | Final production cutover still requires destination acceptance testing |

## 3. Feature disposition

### Required

- Plain client-facing wording and guided workflow hierarchy.
- Harris & Sharp branding and responsive layout.
- Pricing-only save, direct job route, and estimate-required route.
- Price Book and custom lines, contact selection/search, crew/date/priority/type assignment.
- Positive whole-number quantities with minimum `1` in UI and server validation.
- Estimate editing, reorderable lines, dates, notes, discount, tax, totals, and customer preview.
- Estimate media capture below service lines, downstream review, and selected customer photo delivery.
- Waiting approval and assignment/scheduling workflows.
- Safe archive, cancellation, status changes, and permanent draft estimate deletion.
- Role/auth checks against destination Stakeholder Users.
- Destination-native routing and QuickBooks workflows.
- Correct array query serialization for multi-record deletion.
- Strict isolation from Invoice Workbench.

### Optional

- Technical QuickBooks IDs visible in secondary diagnostic areas.
- Pricing promotion after a pricing-only save, if destination workflow supports it without duplicate routing.
- Customer estimate email delivery from this app; destination currently records manual QuickBooks sending instead.

### Experimental

- QuickBooks draft queue controls where external workers and credentials are present.
- Customer-facing selected-photo delivery until destination attachment/email workflow is explicitly validated.

### Superseded

- Quantity step `1` while retaining `min=0.01`; superseded by integer-only quantity behavior.
- The initial request to prepare a “new chat” handoff for Invoice Workbench; superseded by direct update in that session.
- Treating current workspace Git `HEAD` as canonical; saved snapshots/live resources must be compared because baseline syncs rewrote history and code.

### Obsolete

- Source-base table IDs and generated `__fk_fld...` names when implementing against destination base.
- Source workflow IDs in destination runtime.
- Source app login table/field IDs in destination runtime.

### Unknown

- Exact requirements from the original pre-August-16 build chat.
- Whether destination should retain its broader role model (`Executive`, `Admin`, `Operations`, `Finance`) unchanged or narrow to source Admin-only access.
- Whether destination should send estimate emails itself or retain manual “Mark Estimate Sent” behavior.
- Whether destination intentionally omits permanent estimate header deletion and pricing archive.

## 4. Source and destination intentional differences

These differences are observed. “Intentional” means they are architectural choices in the destination snapshot, not necessarily approved final behavior.

| Area | Source app | Destination app | Reconciliation decision |
|---|---|---|---|
| Data binding | Source base/table/field IDs | Destination-native IDs | Keep destination-native IDs |
| Navigation | Three guided stages | Pricing, Estimates, Waiting Approval, Assignments, Exceptions | Preserve destination operational tabs but apply source guidance/branding where compatible |
| Authorization | Active `Admin` only | Role permissions for Executive/Admin/Operations/Finance | Do not overwrite without Chris confirming role policy |
| Pricing outcomes | Pricing only, create job, create estimate; later promotion | Draft pricing then submit Direct Job or Estimate Required | Preserve destination worker contract; add pricing-only/later promotion only if mapping is safe |
| Quantity | Positive integers, min 1 | Nonnegative decimals, default step .01 | Destination must adopt source whole-number rule |
| Contacts | Searchable command selector | Basic select | Source search is required UX parity |
| Estimate creation | Primarily routed draft estimates linked to waiting jobs | Supports standalone new estimates | Preserve destination standalone capability unless business rules reject it |
| Media | Photo/video upload, internal video, selected customer photos | No media API/UI | Source media capability is missing and requires destination-native field/workflow mapping |
| Estimate sending | Source `Sent` status triggers active email workflow with selected photos | Manual “Mark Estimate Sent”; app states it does not email | Requires explicit product decision before enabling email |
| Approval | Set release trigger and poll automation; estimate Accepted/job Active | Direct server action validates QBO estimate ID and updates gate/job | Preserve destination QBO validation and audit contract |
| QBO | Queue fields plus source workflow dependency | Dedicated active destination QBO worker and retry UI | Use destination worker IDs/contracts |
| Deletion | Archive pricing, cancel jobs, delete draft estimate header and lines | Line removal present; no observed estimate-header deletion/archive equivalent | Required parity gap; implement only after destination referential checks |
| Exceptions | Errors embedded in stages | Dedicated Exceptions tab | Preserve destination Exceptions tab |
| Branding | Harris & Sharp logo and moss styling | Quiet neutral operational UI; no matching logo asset observed | Add branding without replacing destination workflow structure |
| Deployment | Published source version 23 | Destination version 2, status idle, unpublished | Keep independent deployment histories |

## 5. Work after the latest saved source

At the time of this addendum, the latest downloaded source app contains 121 files and already includes `docs/owner-workbench-reconciliation-manifest.md`. The two files created by this handoff are present only in the current workspace until this documentation-only commit is saved.

No runtime implementation after source version 23 was performed in this handoff.

The only known behavior that was implemented historically but is no longer present in latest source is array query serialization for batch delete, detailed below.

## 6. `lib/request.ts` contradiction resolved

### Observed history

1. Estimate deletion failed with Teable HTTP 400: `recordIds` expected an array but received a string.
2. The app action already passed `string[]` to `deleteRecords`.
3. `lib/request.ts` converted arrays with `String(value)`, producing one comma-separated query value.
4. Commit `a6f4efc` changed serialization to repeated query parameters and made one-record batches use the single-record endpoint.
5. Live smoke tests returned HTTP `200` for both repeated batch parameters and the single-record endpoint.
6. Baseline sync commit `46893e4` later changed `lib/request.ts` back to `searchParams.set(key, String(value))`.
7. Source app version 23 now contains the reverted serializer.

### Classification

The fix was implemented, tested, committed, then overwritten by a workspace baseline sync. It was not implemented elsewhere. `lib/teable.ts` still retains the one-record special case, so one-line/one-record deletion works, but deletion of two or more records is again defective.

### Required exact behavior

```ts
Object.entries(params).forEach(([key, value]) => {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item !== undefined && item !== null) {
        searchParams.append(key, String(item));
      }
    });
  } else if (value !== undefined && value !== null) {
    searchParams.set(key, String(value));
  }
});
```

Keep the `deleteRecords` one-record shortcut as well. Destination must independently verify how its request helper serializes arrays before relying on batch deletion.

## 7. Tested workflows and user paths

### Tested directly in the accessible session

- Invoice Workbench styling update was generated, linted, type-checked, built, and preview-smoked, but it is a separate app and not evidence for Owner Workbench behavior.
- Owner quantity controls: lint completed with no app errors, TypeScript passed, preview compiled. Commit `1f8856a` enforced positive integers.
- Estimate deletion API formats: repeated `recordIds` and single-record delete endpoints returned HTTP `200` using non-existent IDs.
- Actual estimate deletion: `deleteDraftEstimate("recqUBMCAYzxpLGcMb0")` completed after the fix.
- Post-delete SQL reconciliation for `recqUBMCAYzxpLGcMb0`:
  - estimate count: `0`
  - estimate line count: `0`
  - linked job count: `0`
  - linked pricing count: `0`
- Protected preview: login route returned HTTP `200` after redirect and rendered `Welcome` / `Sign in to continue`.
- Hydration report: diagnosed Dashlane-injected DOM attributes; no application data defect found.
- Manifest validation: all nine source schema snapshots existed; saved source/workspace drift was compared.

### Workflow evidence, not end-to-end tests from this chat

- Source pricing router `wfl4X6uZzlu9FH8l7SI` was active and had successful recent runs dated 2026-08-16.
- Source manager release `wflYDDDTpo2mNR9TOXd` was active.
- Source estimate email `wfldwrqEbVeArLqQPhE` was active.
- Destination `Owner Pricing Route Worker` (`wflo7b4k2XwFi51q988`) is active.
- Destination `QuickBooks Estimate Draft Worker` (`wflbzWPtgX0he6rtLGc`) is active.

No accessible transcript evidence proves a full destination pricing -> estimate -> QBO -> customer approval -> scheduling path was executed end to end. That remains an acceptance requirement.

## 8. Known bugs, limits, and incomplete work

- **Open regression:** latest source version 23 breaks multi-record query serialization.
- **Destination parity bug:** quantity allows zero/decimals and uses step `0.01`.
- **Source limit:** draft estimate line load applies one `LIMIT 100` across loaded drafts despite 2,109 source line records.
- **Destination limit:** pricing lines and estimate lines each use `LIMIT 100`; verify completeness for active records.
- Destination has no observed estimate media upload/customer-photo selection capability.
- Destination has no observed permanent draft estimate header deletion.
- Destination contact selector is not searchable.
- Destination is unpublished (`status: idle`, version 2).
- Original pre-August-16 transcript is unavailable.
- No full browser viewport test suite is recorded.
- No full destination end-to-end migration acceptance run is recorded.

## 9. Records versus capabilities

The historical request is to move/reconcile the application where the operational data lives, not to migrate operational records from source base to destination base.

Destination base `bserpnTFR1mwjN09gUZ` already contains destination-native Contacts, Employees, Price Book, Pricing Calculator, PC Line Items, Job List, Estimates, Estimate Line Items, Stakeholder Users, and relevant workers. Therefore:

- Do not copy source operational records.
- Do not overwrite destination table IDs, field IDs, links, workflows, or QBO state.
- Reconcile capabilities and final behavior against destination-native contracts.
- Use controlled destination test records for acceptance, then remove only those test records under an approved cleanup plan.

## 10. Invoice Workbench isolation

Owner Pricing & Estimates and Invoice Workbench must remain independent in all of these areas:

- App source modules and UI components
- SQL queries and table constants
- Authentication configuration and app sessions
- Workflow triggers and worker IDs
- Environment variables and secrets
- Preview/publish/deployment state
- Git/app-builder commits and rollback history

Shared operational tables do not justify shared runtime code or coupled deployment. The destination Invoice Workbench is `appxZLV3BjrLoiySinT`; no files or configuration from that app were modified here.

## 11. Latest source and destination identity

### Source

- App ID: `appcvbM0BkLWv7uMSrk`
- Base ID: `bse7bbdbrcd6YfA8YpU`
- Saved source file count: `121`
- Saved source snapshot checksum: `811f2ef36f8ecfc353a1ad3ee3656d7a68903d3989c4797a7bded43df771237d`
- `lib/request.ts` checksum: `498a70c3c7c5cd74d465bc4e2aeb51f47eeb9ee2c0f8b08e874119e8d5db087c`
- Latest workspace commit before this handoff: `edf984a Document the owner workbench migration requirements`
- Publish status checked 2026-08-23: `success`
- Published version: `23`
- Public URL: `https://appcvbm0bklwv7umsrk.teable.app`

### Destination

- App ID: `appsMyhy1MddCNb0iMK`
- Base ID: `bserpnTFR1mwjN09gUZ`
- Saved source file count: `112`
- Saved snapshot checksum: `040975e6943af014248d674e78c6d5d93dec3c1f4cd11dfa7231ceacb111756b`
- App description: `5630ea4 Prevent stale sessions from crashing Owner Pricing`
- Status checked 2026-08-23: `idle`
- Version: `2`
- Published: no

## 12. Required next reconciliation pass

1. Restore repeated array query serialization in the destination helper if its batch API path requires it.
2. Enforce positive whole-number quantities in destination UI and server schemas.
3. Add searchable contacts, branding, guided hierarchy, media upload/selection, archive/cancel/delete parity where compatible with destination contracts.
4. Decide explicitly between source email-on-Sent behavior and destination manual Mark Sent behavior.
5. Preserve destination role permissions, QBO validation, Exceptions tab, standalone estimate support, and native worker contracts unless Chris explicitly supersedes them.
6. Run destination acceptance tests without moving source records.
7. Publish only after Chris approves behavior and all independent Invoice Workbench checks remain unaffected.
