# CoalGuard: Violations, Corrective Actions, Audit Trail

## What exists today (kept untouched)
- Roles: `admin`, `officer`, `inspector`, `viewer` in a separate roles table, checked via `has_role()`.
- Complaints: filed by any signed-in user, AI analysis stored on the complaint (status open / analysed / in progress / resolved).
- Hazard check: snapshot analysis is shown on screen only and **is not saved anywhere**. Something has to persist a human-confirmed hazard before it can become a violation.
- Nav is a pill list in the top header; pages use `glass-card`, `PageTitle`, `SeverityBadge`, `btnPrimary`, `inputCls`.
- Rules knowledge base: the bundled regulation chunks the AI already searches.
- No storage buckets yet.

## Flow
```text
Complaint (analysed) ─┐
Hazard check result ──┤→ human "Confirm" → Violation → Corrective action
                      │   → officer evidence upload → Submitted for verification
                      │   → inspector Verify (→ Closed) or Reject w/ reason (→ In progress)
                      └→ every step written to audit log by DB triggers
```

## Phase 1: Database (additive only)
New tables:
- `hazard_reports`: saved snapshot analysis; `confirmed_by/confirmed_at` set only by a human click. Needed so violations can link to "confirmed camera hazards".
- `violations`: location, description, severity, source (complaint/camera/manual), complaint_id, hazard_report_id, rule_refs jsonb (each ref: rule, source, `kb` or `manual` + verified_by), likelihood, responsible_officer, status (open / under action / closed), created_by.
- `corrective_actions`: violation_id, title, description, assigned_to, due_date, priority, status (open, in_progress, submitted, verified, closed, rejected), rejection_reason, verified_by/at, closed_at.
- `action_evidence`: action_id, storage path, file name, mime, size, uploaded_by.
- `action_status_history`: action_id, from/to status, reason, actor.
- `audit_logs`: at, actor, actor_role, action, table, record_id, location, before jsonb, after jsonb.

Access rules (RLS):
- Read: admin/officer/inspector see all; viewers see violations/actions on complaints they filed.
- Create/edit violations and actions: admin, officer.
- Assigned officer: move own action Open → In progress → Submitted, upload evidence.
- Inspector only: Verify, Reject (reason required), Close (only after Verified).
- `audit_logs` and `action_status_history`: no insert/update/delete from the app; written only by triggers.
- A trigger on `corrective_actions` blocks any invalid status change and checks the actor's role, so the rules hold even outside the UI.
- Audit triggers on violations, actions, evidence, hazard confirmations and role changes, so entries can't be skipped.
- Private storage bucket `action-evidence` (10 MB, images + PDF). Assigned officer/admin upload; staff read; nobody deletes.

## Phase 2: Corrective actions (top priority)
- "Confirm and create violation" button on analysed complaints and on hazard check results. AI output never creates records by itself.
- New **Actions** page: list with filters, create form, detail drawer with evidence upload (type/size checked), status buttons shown by role, rejection reason box, status history.
- Dashboard: overdue actions list plus open / pending verification counts in the current card style.

## Phase 3: Violation register and risk score
- New **Violations** page: register, detail, rule references. KB rules are picked from the existing knowledge base search; manual rules need a "verified by" name; otherwise it shows "No verified rule reference". No invented citations.
- One shared risk function: severity weight × likelihood + recurrence at the same location (90 days) + overdue penalty, capped at 100. A "How is this calculated?" panel shows inputs and weights, labelled "default weights, pending safety-officer approval".

## Phase 4: Audit and reports
- New **Audit** page (admin, inspector, officer): filters for date range, actor, action type, location and record, 25 per page, CSV export of the filtered rows (only what the user's role can read).
- Mine-wise summary: violations, open/closed actions, overdue, average closure time, average risk.

## Checks after each phase
Run the app in a browser as admin: sign-in, overview, cameras, hazard check, complaint analysis, rule assistant, sensors, plus the new flow. Report results and give manual end-to-end test steps.

## Technical notes
- One migration per phase through the migration tool; GRANTs plus RLS on every new table.
- Status changes and verification go through a security-definer `transition_action(id, to, reason)` RPC; direct status updates are rejected by the trigger.
- Risk score lives in `src/lib/risk.ts` and is used by both the list and the panel.
- Nav gets Violations, Actions and Audit pills in the existing style.
