# Owner Job & Estimate Workbench Reconciliation Manifest

Generated: 2026-08-19 (America/Chicago)

## 1. Purpose and disposition

This manifest reconciles the Owner Job & Estimate Workbench application, its saved source, the current workspace fork, and its live Teable data/workflow dependencies. It is intended to be the handoff for placing the correct application source in the base where the operational data lives.

### Current disposition

- Application: `Owner Job & Estimate Workbench`
- App ID: `appcvbM0BkLWv7uMSrk`
- Observed base: `bse7bbdbrcd6YfA8YpU`
- Published version: `22`
- Publish status: `success`
- Public URL: `https://appcvbm0bklwv7umsrk.teable.app`
- Saved app description: `a6f4efc Fix estimate deletion requests`
- Current workspace revision: `46893e49a897c0da4f501587ba0cc4b7ccbb9d14` (`sync workspace baseline`)
- Saved app source snapshot checksum: `9a5094e6f348bc7cdf7ec5ec3e2bc205cac2942635fde88e75993de82cb5acbb`

### Primary reconciliation finding

The app node and all nine direct data tables are currently registered in base `bse7bbdbrcd6YfA8YpU`. If this is the intended data-owning base, no table move is required. The required operation is to reconcile the forked workspace with the saved app source, then update or replace the app in this base.

Do not use current workspace Git `HEAD` as the only migration source. Git history was grafted/squashed by workspace synchronization, and the workspace differs from the saved app in `lib/request.ts`.

### Canonical source decision

Use the latest saved source downloaded from app `appcvbM0BkLWv7uMSrk` as the canonical migration source, subject to verification against this manifest. The saved app contains the array query serialization required by Teable batch deletion. The current workspace baseline does not.

Canonical behavior for query arrays:

```ts
if (Array.isArray(value)) {
  value.forEach((item) => searchParams.append(key, String(item)));
}
```

This must be retained. Without it, deleting multiple estimate lines sends `recordIds` as one string and Teable returns HTTP 400.

## 2. Application capability inventory

### Stage 1: Price work

- Cost inputs: crew size, hours, labor rate, equipment, fuel/travel, materials, disposal, subcontractor, target margin, final price override, acreage, visits, frequency, terrain, condition, and season.
- Price Book services and custom service lines.
- Searchable contact selector.
- Whole-number service quantities with minimum `1`; server validation rejects decimal quantities.
- Reorderable service lines with quantity, unit price, description, and calculated totals.
- Pricing summary with service cost, adjusted direct cost, total cost, total price, and projected margin.
- Three outcomes: pricing only, create active job, or create estimate-gated job.
- Crew, date, priority, and job type assignment when creating work.
- Estimate photo/video upload directly below service lines; maximum file size is 250 MB.
- Recent pricing list, archive control, and promotion of saved pricing into a job or estimate.
- Polling of the routing workflow until terminal status.

### Stage 2: Build estimates

- Shows draft estimates linked to jobs in `Waiting for Estimate`.
- Edit estimate name, dates, Price Book/custom lines, notes, discount, tax, and totals.
- Whole-number quantities; existing decimal quantities are normalized when opened.
- Customer preview with contact, address, dates, selected media, service lines, and totals.
- Add photo/video media from the linked pricing record.
- Select customer-facing photos; videos remain internal.
- Save as draft or mark/queue for QuickBooks draft creation.
- Status controls: `Sent`, `Viewed`, `Declined`, and `Expired`.
- Permanent draft estimate deletion, including estimate line deletion, job hold/unlink, and pricing unlink.

### Stage 3: Approve and schedule

- Waiting-for-approval queue for jobs in `Waiting for Estimate`.
- Manager confirmation sets `Release to Pipeline` and polls the release workflow.
- Expected successful transition: estimate `Accepted`, job `Active`.
- Active job queue for crew, scheduled date, priority, and job type updates.
- Job cancellation retains history; waiting estimate jobs also mark the linked estimate `Declined`.

### UX and operational changes retained

- Harris & Sharp logo (`public/main-logo-grey-moss.svg`) and branded header.
- Guided three-stage workflow with live counts and next-stage status cues.
- Plain client-facing labels instead of internal routing terminology.
- Responsive mobile/desktop forms, tables, dialogs, and action bars.
- Cost/pricing section appears before service-line entry.
- Error isolation by data section and actionable toast/alert messages.
- Read caching: workbench data revalidates every 10 seconds; owner access every 30 seconds.
- Safe record deletion request handling for one or multiple IDs.

## 3. Recovered change ledger

The following change descriptions and commit IDs were observed before workspace history was grafted into the current baseline. They are useful reconciliation evidence but are not all reachable from current Git `HEAD`.

| Commit | Reconciled change |
|---|---|
| `d9ebd3c` | Added custom services to job and estimate editors |
| `883756d` | Added contact search |
| `31df392` | Added estimate status and delete controls |
| `19c0b9c` | Corrected estimate deletion behavior |
| `f39b935` | Replaced internal workflow terms with client-facing language |
| `a0a329e` | Added guided visual workflow hierarchy |
| `7646eaf` | Corrected workflow navigation spacing |
| `e3172c0` | Added Harris & Sharp branding and logo |
| `32fd2a8` | Added standalone pricing and later promotion to jobs/estimates |
| `12501a2` | Added protection against Teable read traffic spikes |
| `06fab5b` | Made pricing outcome controls fill their panel |
| `744a250` | Added safe archive and job cancellation controls |
| `8803ea8` | Moved cost and pricing above service lines |
| `fa5947c` | Made the workbench responsive |
| `ed218a5` | Added estimate photo/video uploads and optional customer photo delivery |
| `8e52442` | Placed estimate media directly below service lines |
| `fdc795c` | Changed quantity steppers to whole-unit increments |
| `1f8856a` | Enforced whole-number quantities in UI and server validation |
| `a6f4efc` | Corrected Teable estimate deletion request formats |

Two baseline-sync commits subsequently obscured the linear history. Current source and live resources, rather than commit reachability, are therefore the acceptance authority.

## 4. Runtime and app configuration

- Framework: Next.js `16.2.9`, App Router.
- UI: shadcn/ui, Tailwind CSS v4, lucide-react.
- Package manager: pnpm.
- Authentication is enabled and platform-managed.
- Login user table: `Stakeholder Users` (`tbl04vMl52pc7cErYz6`).
- Login email field: `Email` (`fldRJYiuhWdCTYK7iJ8`).
- Access is additionally restricted in application code to `Status = Active` and `Role = Admin`.
- Observed login UI/runtime supports email OTP and Google. Reconfirm provider configuration on the destination app before cutover.
- No custom app-scoped environment variables are configured.
- Platform-injected variables required at runtime: `TEABLE_API_URL`, `TEABLE_APP_TOKEN`, `TEABLE_APP_ID`, and `TEABLE_BASE_ID`.
- Session cookie: `app_session`, seven-day maximum age, CHIPS/partitioned when embedded.
- Authority configuration returned `null`; no separate advanced authority manifest is active.

## 5. Direct table inventory

Counts are a reconciliation snapshot from 2026-08-19. They are not migration totals after that time.

| Role | Table | ID | Fields | Records | Use |
|---|---|---:|---:|---:|---|
| Contact source | Contacts | `tbldDs2u3Nj0KR8mZ0c` | 49 | 67 | Active customer/property identity and address |
| Service source | Price Book (Services) | `tbl9zU4PkhGggW7Dc9R` | 17 | 6 | Active service, cost, unit price, QuickBooks item mapping |
| Crew source | Employees | `tbl1gyEIJuVKcV6pKR1` | 42 | 8 | Active crew names and roles |
| Pricing header | Pricing Calculator | `tbl2rkKy5VQucVWwANM` | 55 | 51 | Pricing inputs, outcomes, media, and routing state |
| Pricing detail | PC Line Items | `tblzbMYZf6lqd3CpkxR` | 8 | 6 | Pricing service snapshot lines |
| Job header | Job List | `tblYoERyR6AmuNXt9fK` | 52 | 72 | Waiting/active work, assignment, approval release |
| Estimate header | Estimates | `tblLu0d0Hn2YawgvFOI` | 32 | 31 | Draft/customer estimate, totals, QBO state, selected photos |
| Estimate detail | Estimate Line Items | `tblg2El8ltcSA18Avwk` | 9 | 2,109 | Estimate service snapshot lines |
| App access | Stakeholder Users | `tbl04vMl52pc7cErYz6` | 5 | 4 | Login identity and owner/admin authorization |

### Required read-only source fields

Contacts: `First Name`, `Last Name`, `Apartment Name`, `Company`, `Email`, `Phone`, `Address`, `City`, `State`, `Zip`, `Status`.

Price Book: `Service Name`, `Category`, `Unit`, `Cost`, `Unit Price`, `Description`, `QBO Item ID`, `Active`.

Employees: `Full Name`, `Role`, `Status`.

Stakeholder Users: `Name` (`flddVGqRQZTS4FymHyu`), `Email` (`fldRJYiuhWdCTYK7iJ8`), `Role` (`fldZ7pl2bBSSoZ2dI2D`), and `Status` (`fldeuIyFe3lGSk8P2YF`).

### Pricing Calculator write contract

```text
Estimate Name=fldZiK5j84hal67rBbJ
Status=fldknJgGFbLScTQauTJ
Contact=fld7cKgjWVP8ODABgkS
Service=fldmt57556dMKqtCezc
Requires Estimate=fldDRT1dCOUwLXtliWB
Assigned Crew=fldFIDzSohqhjXg8wuv
Scheduled Date=fldpbIaqJEYue6vurAH
Priority=fldIpFWEz5idEoof0LC
Job Type=fld0F0ErwJNkErIHsAM
Notes=fld7ykoS08KqHjGsoW7
Crew Size=fldoDMdtWr3U8h6btj3
Estimated Hours=fldIfaE81b6AQvV5KbF
Labor Rate=fldSsXkiif0J1JhkTbx
Equipment Cost=fldjwKkNIBAJCDLSWOm
Fuel/Travel Cost=fldkQ0Zz9BpmE3yYtnW
Materials Cost=fldhy1eSz9I2JcWRuLu
Disposal/Dump Fees=fldmQmofbeW5muPsVXa
Subcontractor Cost=fldvwIv5abW0YUpXVwR
Target Margin=fldHEz4AVaJ76nEeYTx
Final Price Override=fldxoD9TSRD0qyC03m0
Acreage=fld5MWqKmXPGQujotm3
Visits per Season=fldWiGzKj2uCpnwy2gS
Frequency=fldWyPva0BGUgfIX2SL
Terrain Difficulty=fldl6oKYNbblDnvnPdw
Grass Condition=fld2rnEWSVRvmwWuGbf
Season=fld2EDcwlG33ManHWjH
Category=fldmol54RwBstoAZdPJ
Archive=fldlYp01gCLvLnz0m4l
Routing Status=fldTxirEHdWspVXx1vJ
Routing Error=fldugMFE3Ti6kFpLpfV
Routed At=fldrxL9msiBbG3guRod
Job=fldAVF8a8mk3RDa2FS1
Estimate=fldEZjt8n8wfwgZ44dp
Estimate Photos=fld1AHqEKV4wh3CD66b
```

### PC Line Items write contract

```text
Line Item=fldvGfwizqG2xV6HDbz
Pricing Calculator=fldFT3ZrdF2nXVIOvrD
Service=fld9xgdrWv5bzEKfUPJ
Quantity=fldHiruBQezbC2IIkyE
Unit Price=fldFjaAMYZSABoJU1zC
Description=fld5YhTV4yUr9iIcRFy
Line Order=fldCzFThzQmQOgTLFt8
```

### Job List write contract

```text
Job #=fld9Np9fGRGpothuMNU (auto number)
Job Name=fldUCvA2NhDBwwC6vM0
Status=fldQ6ZWSYprYZkDQtIO
Contact=fldUwIRjAWUMGs78YSp
Estimate=fldZvoJFTUWqDWH3pzM
Assigned Crew=fldCFM0k913xpJZPCyl
Scheduled Date=fldZk6IuygPaD05sNVd
Priority=flddIJ21uKWGZkNSHCh
Job Type=fld1ujMxByfaN5LZcAK
Release to Pipeline=fld0zjPt44GhGTkpqYP
Activated At=fldwQSZgT6Tl3B8UnHA
Activated By=fldqzwt88Io2KEeAtEs
```

### Estimates write contract

```text
Estimate #=fldMjDPMxPekGdU8JN0 (auto number)
Estimate Name=fld7yS1h1gM6PK5UK8e
Status=fldrsrFhScdIOBZ8lCG
Contact=fldS7ZFfBWqnQGrOoB6
Assigned To=fldOZubmmeu0J38nmpg
Subtotal=fldWNkEzYleX9U8S4rx
Discount=fldsosZJFjNsIzDx5tl
Tax %=fld0yR6850QegP1gC5A
Tax Amount=fldW5AqOGvK5WorxBow
Total=fldWkSDl5Qo0hnJhZQ8
Notes=fldlOzysvXfq4YegSXx
Internal Notes=fldH66x6wTsy89lZqWy
Estimate Date=flddhn3V2LkfVRWMXJB
Expiration Date=fldTH12qlne85JqkiFU
Create QBO Draft=fld7PWGNHhJRdLbThRi
QBO Sync Status=fldJPu823Kxo1pMcSbR
QBO Sync Error=fldJ2gDzguGdRqBAZ8Q
QBO Estimate ID=fldnJcGBTLKwjSyoOxL
QBO Doc Number=fldr0LQd5WdgOUig5Db
QBO Sync Token=fldnTZk1EKaaGVRsUeH
QBO Last Synced=fldoDzjl7FMxxCzWgvQ
Manager Approved At=fldOSjRcDsfAhk2KDSG
Manager Approved By=fldlDKjzCu1Ddh0yVwG
Photos to Send=fldpygGut7ugki2OFqB
```

### Estimate Line Items write contract

```text
Line Item=fldeCOcL8tAttZ52PZv
Estimate=fldVUkcNMUDRAoc1KB1
Service=fld9OvFBlZiIBYldoTP
Description=fldQDRClbCKit57CL9v
Quantity=fldX2JUOslgXPaSzkEs
Unit Price=fldosdWIdTpDqLywNAd
Total=fldwpZLGnlVCISY27VW
Line Order=fldpzAgrpE45naeunvG
```

## 6. Required links and state machines

### Required links

- Pricing Calculator -> Contacts, Employees, Job List, Estimates, Price Book.
- PC Line Items -> Pricing Calculator and Price Book.
- Job List -> Contacts, Employees, and Estimates.
- Estimates -> Contacts, Employees, Job List, Pricing Calculator, and Estimate Line Items.
- Estimate Line Items -> Estimates and Price Book.

Link field IDs and generated SQL foreign-key names are base-specific. Cross-base migration requires recreating links before copying records and remapping every `__fk_fld...` SQL reference.

### Pricing routing states

`Draft` -> `Ready to Route` -> `Routing` -> one of:

- `Pricing Saved`
- `Job Active`
- `Waiting for Estimate`
- `Error`

### Job states used by the app

- `Waiting for Estimate`
- `Active`
- `On Hold`
- `Cancelled`

### Estimate states used by the app

- `Draft`
- `Sent`
- `Viewed`
- `Accepted`
- `Declined`
- `Expired`

The exact select options must exist in the destination fields. Display labels may be friendlier, but stored values must not change.

## 7. Automation dependencies

| Workflow | ID | Active | Trigger | Required outcome |
|---|---|---:|---|---|
| Route Pricing Request -> Job and Optional Estimate | `wfl4X6uZzlu9FH8l7SI` | Yes | Pricing `Routing Status = Ready to Route` | Idempotently creates/links a job and optional estimate, snapshots lines, records routing result |
| Manager Release -> Activate Waiting Job | `wflYDDDTpo2mNR9TOXd` | Yes | Job `Release to Pipeline = true` and `Status = Waiting for Estimate` | Accepts estimate, activates existing job, records manager audit fields |
| Estimate Sent -> Email Client | `wfldwrqEbVeArLqQPhE` | Yes | Estimate `Status = Sent` | Sends estimate email with line items and only selected customer photos |

Script hashes observed:

- Pricing router code hash: `8d8a4ea8cf3e1dfb40fed4a7ef1dc67abddf275d52edea0959f68c3052f6e75f`
- Manager release code hash: `84d104e60999a6f75fd76a076a7e45795bd7ad3ad107c7967873622eb2b59d08`
- Estimate email code hash: `5fda3ed6a39114aaa3e8ff4502a84353fe408d3d4266f1575397023617c80178`

The app does not replace these workflows. It writes trigger fields and polls for their results. A destination without these workflows will leave records in intermediate states.

## 8. Base-bound source locations

The following must be remapped for a different base:

- `app/actions.ts`: hardcoded `BASE_ID`, SQL-qualified table names, table IDs, field IDs, and generated `__fk_fld...` names.
- `app/api/estimate-media/route.ts`: hardcoded base, Pricing Calculator table, and attachment field.
- `schema/*.json`: snapshots are for base `bse7bbdbrcd6YfA8YpU` and are not portable IDs.
- Active workflow triggers and scripts: table IDs, field IDs, link fields, and generated FK names.
- Login configuration: app ID plus Stakeholder Users table/email field.
- Attachment tokens in Pricing Calculator and Estimates: safe for a same-base app move; do not assume portability across bases.

The platform-injected runtime variables follow the destination app automatically, but they do not override the hardcoded base IDs above.

## 9. Reconciliation gaps and risks

### Blocking before cutover

1. Destination base ID and destination app ID have not been identified in this session.
2. Confirm whether `bse7bbdbrcd6YfA8YpU` is the intended data home. All observed production data currently lives here.
3. Use saved app source, not workspace Git `HEAD`, unless `lib/request.ts` array serialization is restored first.
4. Reconfirm destination login providers and access table configuration.
5. Confirm the three workflows above are present and active in the destination data base.

### Known implementation limits

- Workbench queries are capped at 100 records per section.
- Draft estimate line loading uses one `LIMIT 100` across all currently loaded draft estimates. The table contains 2,109 lines overall. A set of draft estimates with more than 100 combined lines can be truncated in the editor. Resolve or explicitly accept this before migration sign-off.
- Contacts, services, employees, pricing, jobs, and estimates also use fixed limits of 100.
- Media files are limited to 250 MB each.
- QuickBooks fields are queue/state fields; actual outbound behavior depends on external automation/configuration.
- Dashlane or another password manager can mutate the generated login form before hydration. This is a browser-extension issue, not an app/data migration issue.

## 10. Recommended move procedure

### Scenario A: destination app is in the same data base

This is the recommended path when the data remains in `bse7bbdbrcd6YfA8YpU`.

1. Freeze edits to both forked app sources during reconciliation.
2. Download the latest saved source for `appcvbM0BkLWv7uMSrk` and compare its checksum and key files to this manifest.
3. Select the destination app ID in base `bse7bbdbrcd6YfA8YpU`; do not create or copy tables.
4. Apply the canonical source to the destination app.
5. Configure login against `tbl04vMl52pc7cErYz6` / `fldRJYiuhWdCTYK7iJ8` with the intended providers.
6. Confirm the three active workflow IDs remain active in this base.
7. Verify app writes with a controlled pricing-only record, then a job, then an estimate-gated job.
8. Verify estimate save, multi-line deletion, permanent draft deletion, status change, approval release, cancellation, scheduling, and media upload.
9. Publish the destination, validate its public URL, and retire/unpublish the fork only after acceptance.

### Scenario B: destination is a different base

A direct app copy is insufficient.

1. Export schemas and data from the source base.
2. Recreate tables in dependency order: Contacts/Employees/Price Book/Stakeholder Users, Pricing Calculator/Jobs/Estimates, then line-item tables.
3. Recreate all links and select options before importing linked records.
4. Import records while maintaining a source-to-destination record ID map.
5. Recreate the three workflows and remap their table/field IDs and script constants.
6. Remap all app constants, SQL identifiers, generated link FK names, and media field IDs.
7. Reconfigure login for the destination app and Stakeholder Users table.
8. Re-upload or validate attachments; do not rely on source-base tokens.
9. Run the full acceptance matrix below before cutover.

## 11. Acceptance matrix

| Test | Expected result |
|---|---|
| Login as active Admin | Workbench loads |
| Login as inactive/non-Admin | Access denied |
| Load source lists | Active contacts, services, and employees appear |
| Save pricing only | Pricing header and all PC lines persist; status reaches `Pricing Saved` |
| Promote saved pricing | Existing pricing routes without duplicate records |
| Create direct job | One linked job reaches `Active` |
| Create estimate job | One job reaches `Waiting for Estimate`; one linked draft estimate and snapshot lines exist |
| Quantity control | Displays/saves positive whole numbers only |
| Upload media | Pricing attachment persists and previews after refresh |
| Select customer photos | Only selected image tokens persist to `Photos to Send`; videos remain internal |
| Save estimate | Lines, totals, dates, notes, tax, discount, and QBO queue fields reconcile |
| Delete multiple lines | Teable receives repeated `recordIds`; all selected lines are removed |
| Delete draft estimate | Estimate and its lines are deleted; job is held/unlinked; pricing link is cleared |
| Send estimate | Status changes and email workflow completes with selected photos |
| Confirm approval | Estimate becomes `Accepted`; job becomes `Active`; release flag/audit fields reconcile |
| Update active job | Crew/date/priority/type persist |
| Cancel waiting job | Job `Cancelled`, estimate `Declined`, records retained |
| Cancel active job | Job `Cancelled`, related pricing/estimate retained |
| Responsive smoke test | No overlap or clipped primary controls on mobile and desktop |
| Production build | Lint, TypeScript, and Next build pass |

## 12. Cutover evidence to append

Complete these values during the actual move:

```text
Destination base ID:
Destination app ID:
Destination app name:
Canonical source checksum:
Destination login table ID:
Destination login email field ID:
Destination provider list:
Pricing workflow ID/status:
Release workflow ID/status:
Estimate email workflow ID/status:
Pre-cutover record counts:
Post-cutover record counts:
Acceptance test operator/date:
Published version/public URL:
Fork retired/unpublished date:
Rollback owner and deadline:
```

## 13. Rollback rule

Do not delete either app or any source tables during cutover. If a blocking test fails, unpublish the destination app, restore user traffic to the last successful published app, and leave the data base unchanged. Retire the fork only after the destination passes the complete acceptance matrix and record/link counts reconcile.
