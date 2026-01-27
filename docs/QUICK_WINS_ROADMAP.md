# Quick Wins Roadmap - TradeSync Feature Development

> **How to use this file**: Start any new chat session with:
> "Let's continue the Quick Wins roadmap" or "Check the roadmap and continue"
>
> Claude will read this file and pick up where we left off.

---

## Current Status: PHASE 1 IN PROGRESS

**Last Updated**: 2025-01-25
**Current Phase**: Phase 1 - Online Quote Acceptance (Code Complete, Needs Migration)
**Next Action**: Run database migration, then test the complete flow

---

## Quick Reference

| Feature | Status | Priority | Complexity |
|---------|--------|----------|------------|
| Online Quote Acceptance | 🟡 In Progress | 1 (DO FIRST) | Low-Medium |
| Email Reminders | 🔴 Not Started | 2 | Medium |
| Recurring Jobs | 🔴 Not Started | 3 | Medium |
| Google Calendar Sync | 🔴 Not Started | 4 | Medium-High |

**Status Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete | ⏸️ Blocked

---

## Phase 1: Online Quote Acceptance

### Overview
Allow customers to accept/decline quotes via a unique shareable link without needing to log in.

### Status: 🟡 IN PROGRESS - Code Complete, Awaiting Migration

### Tasks

#### 1.1 Database Schema
- [x] Add `share_token` column to `quotes` table (UUID, unique, indexed)
- [x] Add `accepted_at` timestamp column
- [x] Add `declined_at` timestamp column
- [x] Add `customer_response_ip` column (for audit trail)
- [x] Add `customer_response_user_agent` column (for audit trail)
- [x] Create migration file
- [ ] **RUN MIGRATION** - `supabase/migrations/20260125_quote_sharing.sql`

#### 1.2 Backend - Supabase RLS
- [x] Create RLS policy for public read access with valid share_token
- [x] Create RLS policy for public update (accept/decline only)
- [x] Create `respond_to_quote` function (SECURITY DEFINER)
- [x] Create `get_quote_by_share_token` function (SECURITY DEFINER)
- [ ] Test policies work without authentication (after migration)

#### 1.3 Share Token Generation
- [x] Add trigger to auto-generate share token when quote is "sent"
- [x] Update `quotesService` with `getShareUrl()`, `getByShareToken()`, `respondToQuote()`
- [x] Add "Copy Share Link" button to QuoteView

#### 1.4 Public Quote Page
- [x] Create `/quote/view/:shareToken` route (public, no auth)
- [x] Create `PublicQuoteView.tsx` component
- [x] Display quote in read-only format with beautiful UI
- [x] Show company branding (logo, name, contact)
- [x] Add Accept/Decline buttons
- [x] Show confirmation screen after action
- [ ] Add optional signature pad component (deferred to later)
- [ ] Add terms & conditions checkbox (deferred to later)

#### 1.5 Accept/Decline Flow
- [x] Create `respond_to_quote` Supabase function for accept/decline
- [x] Update quote status automatically
- [x] Record timestamp and user agent
- [x] Show confirmation screen after action

#### 1.6 Notifications
- [ ] Toast notification for tradesperson when quote accepted/declined (future - needs realtime)
- [ ] Email notification (depends on Phase 2)

#### 1.7 UI Integration
- [x] Add share link button to QuoteView (shows after quote is "sent")
- [x] Show "Accepted Online" / "Declined Online" badge with timestamp
- [ ] Add share button to quote list (optional enhancement)

### Technical Decisions Made
- Using UUIDv4 for share tokens (122 bits entropy - secure)
- Starting WITHOUT signature capture (add later)
- Public route pattern: `/quote/view/:shareToken`
- Using SECURITY DEFINER functions for public access (safer than RLS policies)
- Auto-generate share token via database trigger when status becomes 'sent'

### Files Created/Modified
- `supabase/migrations/20260125_quote_sharing.sql` ✅ (NEW)
- `src/pages/PublicQuoteView.tsx` ✅ (NEW)
- `src/App.tsx` ✅ (MODIFIED - added public route)
- `src/services/dataService.ts` ✅ (MODIFIED - added share methods)
- `src/lib/database.types.ts` ✅ (MODIFIED - added new columns)
- `types.ts` ✅ (MODIFIED - added shareToken, acceptedAt, declinedAt)
- `components/QuoteView.tsx` ✅ (MODIFIED - added share link button)

### Blockers
- **NEEDS MIGRATION RUN**: The database migration must be run before testing

### How to Test (After Migration)
1. Create a new quote
2. Mark it as "Sent" (this auto-generates share_token)
3. Click "Share Link" button to copy URL
4. Open URL in incognito/different browser (not logged in)
5. Verify quote displays correctly with company branding
6. Click "Accept Quote" or "Decline"
7. Verify confirmation screen appears
8. Check back in main app - quote should show "Accepted Online" with date

---

## Phase 2: Quote/Invoice Email Reminders

### Overview
Automated and manual email reminders for quotes awaiting response and invoices approaching/past due date.

### Status: 🔴 NOT STARTED

### Prerequisites
- [ ] Choose email service provider (Recommendation: **Resend**)
- [ ] Set up email service account
- [ ] Configure DNS (SPF, DKIM) for deliverability
- [ ] Add API keys to environment

### Tasks

#### 2.1 Email Service Setup
- [ ] Create Resend account
- [ ] Add domain verification
- [ ] Store API key in Supabase secrets
- [ ] Create Edge Function for sending emails

#### 2.2 Database Schema
- [ ] Create `email_templates` table (type, subject, body_html, body_text)
- [ ] Create `email_log` table (quote_id, type, sent_at, recipient, status)
- [ ] Add `last_reminder_sent` to quotes table
- [ ] Add `reminder_count` to quotes table
- [ ] Create `user_email_settings` table (reminder preferences)

#### 2.3 Email Templates
- [ ] Quote follow-up template ("Your quote is ready for review")
- [ ] Payment reminder template (X days before due)
- [ ] Overdue notice template
- [ ] Quote accepted notification (to tradesperson)
- [ ] Quote declined notification (to tradesperson)

#### 2.4 Manual "Send Reminder" Button
- [ ] Add button to QuoteView for manual reminder
- [ ] Show last reminder sent date
- [ ] Prevent spam (cooldown period)

#### 2.5 Automated Reminders (Cron)
- [ ] Set up Supabase pg_cron or external cron
- [ ] Daily job to find quotes needing reminders
- [ ] Logic: sent quotes > 3 days, invoices 3 days before due, overdue
- [ ] Respect user preferences (enabled/disabled, frequency)

#### 2.6 User Settings
- [ ] Add email reminder settings to SettingsPage
- [ ] Toggle: Enable automatic reminders
- [ ] Configure: Days before due date to remind
- [ ] Configure: Overdue reminder frequency

### Technical Decisions Made
- Email provider: Resend (TBD - confirm)
- Free tier: 3,000 emails/month (sufficient for start)

### Files to Create/Modify
- `supabase/functions/send-email/index.ts` (new)
- `supabase/functions/reminder-cron/index.ts` (new)
- `supabase/migrations/XXXXXX_add_email_system.sql` (new)
- `src/pages/SettingsPage.tsx` - add email settings
- `src/components/QuoteView.tsx` - add reminder button

### Blockers
- Need to choose and set up email provider first

### Notes
- Consider adding unsubscribe link for GDPR
- Track email open rates? (adds complexity)

---

## Phase 3: Recurring Jobs

### Overview
Support for jobs that repeat on a schedule (weekly cleaning, monthly maintenance, etc.)

### Status: 🔴 NOT STARTED

### Tasks

#### 3.1 Database Schema
- [ ] Create `recurring_job_templates` table
- [ ] Add `recurring_template_id` FK to `job_packs`
- [ ] Add `recurrence_index` to `job_packs`
- [ ] Add `is_from_recurrence` flag to `job_packs`

#### 3.2 Recurrence Pattern Definition
- [ ] Define frequency options: weekly, fortnightly, monthly, quarterly, yearly, custom
- [ ] Handle "day of week" for weekly
- [ ] Handle "day of month" for monthly
- [ ] Handle custom interval in days

#### 3.3 Template Management UI
- [ ] "Make Recurring" option when creating/editing job
- [ ] Recurrence settings modal
- [ ] List view of recurring job templates
- [ ] Edit/pause/delete template

#### 3.4 Job Generation Logic
- [ ] Option A: Generate next job when current marked complete
- [ ] Option B: Cron generates jobs X days ahead
- [ ] Decision: Start with Option A (simpler)

#### 3.5 Calendar Integration
- [ ] Show future recurring jobs in calendar (greyed out)
- [ ] Indicate which jobs are from recurrence

#### 3.6 Edit Series vs Single
- [ ] "Edit this occurrence" vs "Edit all future"
- [ ] Breaking a single job from recurrence
- [ ] Pausing recurrence temporarily

### Technical Decisions Made
- None yet

### Files to Create/Modify
- `supabase/migrations/XXXXXX_add_recurring_jobs.sql` (new)
- `src/components/RecurrenceSettings.tsx` (new)
- `src/pages/RecurringJobsPage.tsx` (new) - or integrate into Jobs
- `src/services/dataService.ts` - add recurringJobsService

### Blockers
None currently.

### Notes
- Start simple: weekly and monthly only
- Add complex patterns (2nd Tuesday of month) later

---

## Phase 4: Google Calendar Sync

### Overview
Sync TradeSync schedule entries with user's Google Calendar (one-way initially).

### Status: 🔴 NOT STARTED

### Prerequisites
- [ ] Set up Google Cloud project
- [ ] Enable Google Calendar API
- [ ] Configure OAuth consent screen
- [ ] Add OAuth credentials

### Tasks

#### 4.1 Google OAuth Setup
- [ ] Create Google Cloud project
- [ ] Configure OAuth consent screen
- [ ] Add Calendar API scope
- [ ] Store client ID/secret in Supabase

#### 4.2 User Authentication Flow
- [ ] "Connect Google Calendar" button in Settings
- [ ] OAuth redirect flow
- [ ] Store refresh token securely (encrypted)
- [ ] Handle token refresh

#### 4.3 Database Schema
- [ ] Create `google_calendar_connections` table
- [ ] Store: user_id, refresh_token (encrypted), calendar_id, last_sync
- [ ] Add `google_event_id` to `schedule_entries`

#### 4.4 Sync Logic (One-Way: TradeSync → Google)
- [ ] On schedule entry create → create Google event
- [ ] On schedule entry update → update Google event
- [ ] On schedule entry delete → delete Google event
- [ ] Handle sync failures gracefully

#### 4.5 Edge Function
- [ ] Create `google-calendar-sync` Edge Function
- [ ] Handle token refresh
- [ ] Batch operations where possible

#### 4.6 User Settings
- [ ] Toggle: Enable Google Calendar sync
- [ ] Select which Google calendar to use
- [ ] Manual "Sync Now" button
- [ ] Disconnect option

### Technical Decisions Made
- Starting with one-way sync only (TradeSync → Google)
- Bidirectional sync deferred to future enhancement

### Files to Create/Modify
- `supabase/functions/google-calendar-sync/index.ts` (new)
- `supabase/functions/google-oauth-callback/index.ts` (new)
- `supabase/migrations/XXXXXX_add_google_calendar.sql` (new)
- `src/pages/SettingsPage.tsx` - add Google Calendar section
- `src/services/dataService.ts` - update scheduleService

### Blockers
- Requires Google Cloud project setup
- OAuth adds complexity to auth flow

### Notes
- Consider Supabase's built-in Google OAuth (may simplify)
- Need to handle users without Google accounts gracefully

---

## Shared Dependencies

### Email Service (Phases 1 & 2)
- Provider: Resend (recommended)
- Needed for: Quote notifications, reminders
- Setup required before Phase 2, helpful for Phase 1

### Cron/Scheduled Jobs (Phases 2, 3, 4)
- Options: Supabase pg_cron, Vercel Cron, external service
- Needed for: Automated reminders, recurring job generation, calendar sync

### Public Routes (Phase 1)
- ✅ Implemented via view state in App.tsx
- ✅ Supabase SECURITY DEFINER functions for public access

---

## Environment Variables Needed

```env
# Phase 2: Email
RESEND_API_KEY=

# Phase 4: Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01-25 | Phase order: 1→2→3→4 | Online quote acceptance highest ROI, lowest risk |
| 2025-01-25 | One-way calendar sync first | Avoids conflict resolution complexity |
| 2025-01-25 | Resend for email | Good DX, generous free tier, modern API |
| 2025-01-25 | No signature capture initially | Reduces Phase 1 scope, add later |
| 2025-01-25 | Use SECURITY DEFINER functions | Safer than complex RLS policies for public access |
| 2025-01-25 | Auto-generate share token on 'sent' | Cleaner UX, no extra button click needed |

---

## Session Log

| Date | Session Summary | Next Steps |
|------|-----------------|------------|
| 2025-01-25 | Initial planning complete. Analyzed codebase, created roadmap. | Begin Phase 1.1 - Database Schema |
| 2025-01-25 | Phase 1 code complete! Created migration, PublicQuoteView, updated App.tsx routing, added share link to QuoteView, updated types. | Run migration and test flow |

---

## How to Continue

When starting a new session, say one of:
- "Continue the Quick Wins roadmap"
- "What's next on the roadmap?"
- "Check the roadmap and continue from where we left off"

Claude will:
1. Read this file
2. Check current status
3. Resume from the next uncompleted task

---

## Migration Instructions

To apply the Phase 1 migration:

### Option 1: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260125_quote_sharing.sql`
3. Run the migration

### Option 2: Supabase CLI
```bash
supabase db push
```

### After Migration
1. Test the flow by creating a quote, marking as sent, copying share link
2. Open link in incognito to test public view
3. Test accept/decline functionality
