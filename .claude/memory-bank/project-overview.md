# Collection ERP — Project Overview

## What this app is

A mobile-first loan management ERP for informal/personal money lending in India. The operator (admin) lends money to people ("parties"), tracks loans with installment schedules, and records collections (repayments). Think micro-finance bookkeeping.

**Who uses it:** A single operator (`admin` / `admin123`). Single-user, no role complexity today.

**Platforms:** Web (React) + Android (via Capacitor wrapping the same web build).

**Backend:** FastAPI on Railway — `https://collection-api-production-cbad.up.railway.app`. No auth token/session — login just validates credentials and the app navigates to `/dashboard`. User data is not persisted in localStorage currently (that line is commented out).

---

## Three core entities and how they relate

```
Party (customer/borrower)
  └── Loan (money lent to that party)
        └── Collection (each repayment installment against a loan)
```

**Party** fields: `Id`, `PartyName`, `ContactPerson`, `Phone`, `Email`, `Address`, `GstNumber`, `Balance` (auto-maintained by API), `LastPayment` (auto-maintained).

**Loan** fields: `Id`, `PartyId`, `LoanAmount`, `LoanStartDate`, `NoOfInstallments`, `InstallmentAmount` (auto-calc in UI: amount ÷ installments), `InstallPeriod` (`day`/`week`/`month`), `InstallmentDate` (day of month 1–31 for monthly loans), `LoanCloseDate` (auto-calc in UI from start + period × count), `Status` (`Active`/`Closed`/`Overdue`), `Notes`.

**Collection** fields: `Id`, `PartyId`, `LoanId`, `CollectionDate`, `Amount`, `PaymentMode` (`Cash`/`UPI`/`Bank Transfer`/`Cheque`), `ReferenceNo` (required for non-cash), `Status` (`Received`/`Pending`/`Bounced`), `Notes`.

**Side effects the API handles automatically:**
- Creating a Loan → `Party.Balance += LoanAmount`
- Creating a Collection → `Party.Balance -= Amount`, `Party.LastPayment = CollectionDate`
- Deleting a Loan → restores balance; Deleting a Collection → restores balance

---

## Screen-by-screen breakdown

### Login (`/`)
- Full-screen, no sidebar/navbar
- Animated blob background, logo, username + password fields
- On success → navigates to `/dashboard`
- Currently no session persistence (commented out)

### Dashboard (`/dashboard`)
- 3 KPI cards (Party Today / Collections Today / New Loan) — **hardcoded placeholder data**
- Quick Actions: New Party button (navigates), Schedule (no route), Collection (no route)
- Recent Activity — **hardcoded placeholder**
- Weekly Performance mini bar chart — **hardcoded placeholder**

### Party List (`/parties`)
- Desktop: table — Party Name (avatar + name + contact person), Phone, Address, Balance (green/grey badge), Last Payment date
- Mobile: card grid showing same info
- Search by name or contact person
- Refresh button, party count
- Clicking edit icon → `/party/:id`

### Party Details (`/party/new` or `/party/:id`)
- Create / Edit / Delete a party
- Fields: PartyName\*, ContactPerson, Phone\*, Email, Address, GstNumber
- Balance is auto-managed by API — not shown in form

### Loan List (`/loans`)
- 4 stat cards: Total Loans count, Active count, Total Disbursed (₹), Overdue count
- Desktop: table — Party (avatar), Loan Amount, Period tag, Installment amount, Installment count, Start Date, Close Date, Status badge
- Mobile: cards
- Filter by status (All / Active / Closed / Overdue), search by party name
- Clicking any row → `/loan/:id`

### Loan Details (`/loan/new` or `/loan/:id`)
- Live summary cards appear once amount is entered (Loan Amount / Per Installment / Total Repayable / Installments × Period)
- Section 1: Party dropdown (all parties), Loan Amount, Status
- Section 2: Loan Start Date, Loan Close Date (auto-calculated, editable)
- Section 3: No. of Installments, Installment Amount (auto-calculated), Install Period (radio: Daily/Weekly/Monthly), Day of Month/Week field
- Section 4: Notes textarea
- Auto-calculations: `InstallmentAmount = LoanAmount / NoOfInstallments`, `LoanCloseDate = StartDate + N × period`

### Collection List (`/collections`)
- 4 stat cards: Total Collections (lifetime), This Month, Today's Collection, Mode Breakdown (Cash vs Bank/UPI)
- Desktop: table — Date, Party Name, Loan Amount, Collected Amount, Mode badge, Reference No, Status badge
- Mobile: cards
- Filter by mode (All / Cash / UPI / Bank Transfer / Cheque), search by party or reference
- Clicking edit → `/collection/:id`

### Collection Details (`/collection/new` or `/collection/:id`)
- Two-column layout on desktop
- Left column:
  - Account Information card: Party dropdown (shows Balance), then Loan dropdown (filters via `GET /api/parties/:id/loans`, auto-populates Amount from InstallmentAmount)
  - Payment Details card: Date, Amount, Payment Mode (radio: Cash/UPI/Bank Transfer/Cheque), Reference No (shown only for non-Cash), Status
- Right column:
  - Notes textarea
  - Active Loan Summary panel (shown once loan selected: Ref #, Loan Amount, Start/Close dates, installments, installment amount)
- On edit mode: Party and Loan fields are locked (disabled)

### Outstanding (`/outstanding`) and Settings (`/settings`)
- Both render `<UnderProcess>` placeholder with a "coming soon" card

---

## App shell

**Sidebar** (collapsible on desktop, drawer on mobile):
- Logo + "COLLECTION ERP" brand name
- Nav items: Dashboard, Party, New Loan, Collection, Outstanding, Settings
- Collapse toggle button
- On mobile: overlay backdrop closes the drawer

**Navbar** (top bar):
- Hamburger icon (mobile only) → opens sidebar
- Page title derived from current route via `getPageTitle()` in `App.js`

---

## Current UI state & known gaps

| Area | Current state |
|---|---|
| Styling | Plain CSS per screen — no Tailwind, no component library, no design token system |
| Icons | `lucide-react` exclusively |
| Responsive | Every screen has desktop table + mobile card view toggled by CSS |
| Toasts | Implemented in LoanDetails and CollectionDetails. PartyDetails uses `window.alert()` |
| Dashboard data | Fully hardcoded — not wired to API |
| Auth guard | None — any route is accessible without logging in |
| Session | Login response not stored; navigates to dashboard on success |
| Pagination | API supports `skip`/`limit` but frontend fetches all records |
| Outstanding | Placeholder only |
| Settings | Placeholder only |
| Quick Actions | "Schedule" and "Collection" on dashboard have no routes |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 (Create React App) |
| Routing | React Router v7 |
| Icons | lucide-react |
| Mobile wrapper | Capacitor v8 (Android, `com.collection.erp`) |
| Styling | Plain CSS, co-located per screen |
| State | React `useState` / `useEffect` — no global store |
| HTTP | Native `fetch` — no axios or query library |
| Backend | FastAPI on Railway |
