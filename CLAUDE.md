# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start            # Start Expo dev server (scan QR with Expo Go)
npm run android      # Start on Android emulator / device
npm run ios          # Start on iOS simulator
```

**Build for Android:**
```bash
npx expo run:android          # Build and run on Android (generates android/ folder)
npx eas build -p android      # Cloud build via EAS (requires eas-cli)
```

## Architecture

This is a **React Native / Expo SDK 56** loan collection ERP for Indian micro-finance, targeting Android (package: `com.collection.erp`). Uses **expo-router** (file-based routing) for navigation.

### Data flow

All data lives in a separate backend at `http://localhost:8000`. There is no global state library — each screen fetches its own data via `fetch()` in `useEffect`. The backend must be running locally for the app to function.

### Route structure (expo-router file-based)

Navigation uses **expo-router** with a Stack + Tab structure. Entry is `app/index.jsx` (login); after auth it navigates to `/(tabs)`.

| File | Route | Notes |
|---|---|---|
| `app/index.jsx` | `/` | Login screen |
| `app/(tabs)/index.jsx` | `/(tabs)` | Dashboard — matches the design mockup |
| `app/(tabs)/parties.jsx` | `/(tabs)/parties` | Party list with search |
| `app/(tabs)/loans.jsx` | `/(tabs)/loans` | Loan list with status filter |
| `app/(tabs)/collections.jsx` | `/(tabs)/collections` | Collection register |
| `app/party/[id].jsx` | `/party/new`, `/party/:id` | Create/edit/delete party |
| `app/loan/[id].jsx` | `/loan/new`, `/loan/:id` | Create/edit loan; auto-calculates installment & close date |
| `app/collection/[id].jsx` | `/collection/new`, `/collection/:id` | Record/edit collection; loan dropdown filtered by party |

### Domain models

**Party** — a customer/borrower. Fields: `Id`, `PartyName`, `ContactPerson`, `Phone`, `Email`, `Address`, `GstNumber`, `Balance`.

**Loan** — a loan issued to a party. Fields: `Id`, `PartyId`, `LoanAmount`, `LoanStartDate`, `NoOfInstallments`, `InstallmentAmount` (auto-derived), `InstallPeriod` (`day`/`week`/`month`), `InstallmentDate` (day-of-month/week offset), `LoanCloseDate` (auto-derived), `Status` (`Active`/`Closed`/`Overdue`), `Notes`.

**Collection** — a payment collected against a loan installment. Fields: `Id`, `PartyId`, `LoanId`, `CollectionDate`, `Amount`, `PaymentMode` (`Cash`/`UPI`/`Online`/`Cheque`), `ReferenceNo` (required for non-cash), `Status` (`Received`/`Pending`/`Bounced`), `Notes`.

### API endpoints

Base URL: `https://collection-api-production-cbad.up.railway.app`

- `GET/POST /api/parties` — list / create
- `GET/PUT/DELETE /api/parties/:id`
- `GET /api/loans?party_id=<id>` — filter by party for collection form dropdowns
- `GET/POST /api/loans`, `GET/PUT/DELETE /api/loans/:id`
- `GET/POST /api/collections`, `GET/PUT/DELETE /api/collections/:id`

### Styling conventions

All styles use `StyleSheet.create()` co-located at the bottom of each file. Global design tokens (colors, spacing, border-radius) live in `constants/theme.js`.

### Icons

All icons come from `lucide-react-native` (requires `react-native-svg` peer dep). No other icon library is used.

### Key packages

- `expo-linear-gradient` — purple gradient header on Dashboard
- `@react-native-picker/picker` — dropdowns in loan/collection forms
- `react-native-safe-area-context` — safe area padding in all screens
- `components/Avatar.jsx` — colored circle with initials (deterministic color from name)
- `components/ScreenHeader.jsx` — shared header with back + save/delete buttons for stack screens
