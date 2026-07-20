# API Details

**Base URL:** `https://collection-api-production-cbad.up.railway.app`

All request/response bodies are JSON. All dates use ISO 8601 (`YYYY-MM-DD`).

**Swagger UI:** `https://collection-api-production-cbad.up.railway.app/docs`

**Default credentials:** `admin` / `admin123`

---

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/api/auth/login` | Login |
| GET | `/api/parties` | List all friends |
| GET | `/api/parties/{id}` | Get a friend |
| POST | `/api/parties` | Add a friend |
| PUT | `/api/parties/{id}` | Update a friend |
| DELETE | `/api/parties/{id}` | Delete a friend |
| GET | `/api/parties/{id}/loans` | List loans for a friend |
| GET | `/api/loans` | List all loans |
| GET | `/api/loans/{id}` | Get a loan |
| POST | `/api/loans` | Create a loan (new lending) |
| PUT | `/api/loans/{id}` | Update a loan |
| DELETE | `/api/loans/{id}` | Delete a loan |
| GET | `/api/collections` | List all repayments |
| GET | `/api/collections/{id}` | Get a repayment |
| POST | `/api/collections` | Record a repayment |
| PUT | `/api/collections/{id}` | Update a repayment |
| DELETE | `/api/collections/{id}` | Delete a repayment |

---

## GET `/`

Health check.

**Response `200`**
```json
{ "message": "Welcome to Collection ERP API" }
```

---

## POST `/api/auth/login`

Authenticates a user. Passwords stored and compared as plain text.

**Request**
```json
{
  "Username": "admin",
  "Password": "admin123"
}
```

**Response `200`**
```json
{
  "Id": 1,
  "Username": "admin",
  "Role": "Admin"
}
```

**Response `400`** — wrong credentials
```json
{ "detail": "Invalid username or password" }
```

---

## Parties

A party is a friend you have lent money to. `Balance` is automatically maintained — it increases when a loan is created and decreases when a repayment is recorded. Do not set it manually unless importing historical data.

### GET `/api/parties`

Returns all parties ordered by Id ascending.

**Query params**

| Param | Type | Default |
|-------|------|---------|
| skip | int | 0 |
| limit | int | 100 |

**Response `200`**
```json
[
  {
    "Id": 1,
    "PartyName": "Ravi Kumar",
    "ContactPerson": "Ravi",
    "Phone": "9876543210",
    "Email": "ravi@example.com",
    "Address": "Chennai, TN",
    "GstNumber": null,
    "Balance": 45000.00,
    "LastPayment": "2026-06-01"
  }
]
```

---

### GET `/api/parties/{party_id}`

**Response `200`** — same shape as list item

**Response `404`** `{ "detail": "Party not found" }`

---

### POST `/api/parties`

**Request**
```json
{
  "PartyName": "Ravi Kumar",
  "Phone": "9876543210",
  "ContactPerson": "Ravi",
  "Email": "ravi@example.com",
  "Address": "Chennai, TN",
  "GstNumber": null,
  "Balance": 0.0,
  "LastPayment": null
}
```

| Field | Type | Required |
|-------|------|----------|
| PartyName | string | yes |
| Phone | string | yes |
| ContactPerson | string | no |
| Email | string | no |
| Address | string | no |
| GstNumber | string | no |
| Balance | float | no — default `0.0` |
| LastPayment | date | no |

**Response `200`** — party object with generated `Id`

---

### PUT `/api/parties/{party_id}`

Same body as POST. Only fields included in the request are updated.

**Response `200`** — updated party

**Response `404`** `{ "detail": "Party not found" }`

---

### DELETE `/api/parties/{party_id}`

**Response `200`** `{ "ok": true }`

**Response `404`** `{ "detail": "Party not found" }`

> FK constraint blocks deletion if the party has linked loans or collections.

---

## Loans

A loan represents money you lent to a friend. Creating a loan **increases** `PartyDetails.Balance` by `LoanAmount`. Deleting a loan **restores** the balance.

### GET `/api/parties/{party_id}/loans`

All loans for a specific friend. Used to populate the loan dropdown on the repayment form.

**Response `200`** — same shape as `GET /api/loans`

---

### GET `/api/loans`

All loans across all friends, with `PartyName` joined in.

**Query params**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| party_id | int | null | Filter by friend |
| skip | int | 0 | |
| limit | int | 100 | |

**Response `200`**
```json
[
  {
    "Id": 1,
    "PartyId": 1,
    "PartyName": "Ravi Kumar",
    "LoanAmount": 50000.00,
    "LoanStartDate": "2026-01-01",
    "NoOfInstallments": 12,
    "InstallmentAmount": 4500.00,
    "InstallPeriod": "month",
    "InstallmentDate": 1,
    "LoanCloseDate": null,
    "Status": "Active"
  }
]
```

---

### GET `/api/loans/{loan_id}`

Single loan without joined fields.

**Response `200`**
```json
{
  "Id": 1,
  "PartyId": 1,
  "LoanAmount": 50000.00,
  "LoanStartDate": "2026-01-01",
  "NoOfInstallments": 12,
  "InstallmentAmount": 4500.00,
  "InstallPeriod": "month",
  "InstallmentDate": 1,
  "LoanCloseDate": null,
  "Status": "Active",
  "Notes": null
}
```

**Response `404`** `{ "detail": "Loan not found" }`

---

### POST `/api/loans`

Records a new lending event. **Side effect:** `PartyDetails.Balance += LoanAmount`.

**Request**
```json
{
  "PartyId": 1,
  "LoanAmount": 50000.00,
  "LoanStartDate": "2026-01-01",
  "NoOfInstallments": 12,
  "InstallmentAmount": 4500.00,
  "InstallPeriod": "month",
  "InstallmentDate": 1,
  "LoanCloseDate": null,
  "Status": "Active",
  "Notes": "Furniture loan"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| PartyId | int | yes | Must be a valid party Id |
| LoanAmount | float | yes | Total amount lent |
| LoanStartDate | date | yes | |
| NoOfInstallments | int | yes | |
| InstallmentAmount | float | yes | Per-installment amount |
| InstallPeriod | string | yes | `"day"`, `"week"`, or `"month"` |
| InstallmentDate | int | no | Day-of-month (1–31) for monthly loans |
| LoanCloseDate | date | no | |
| Status | string | no | Default `"Active"` |
| Notes | string | no | |

**Response `200`** — loan object with generated `Id`

**Side effect:** `PartyDetails.Balance += LoanAmount`

---

### PUT `/api/loans/{loan_id}`

Updates a loan. **Side effect:** `PartyDetails.Balance += (new_LoanAmount - old_LoanAmount)`.

Same body as POST. Only included fields are updated.

**Response `200`** — updated loan

**Response `404`** `{ "detail": "Loan not found" }`

---

### DELETE `/api/loans/{loan_id}`

**Response `200`** `{ "ok": true }`

**Response `404`** `{ "detail": "Loan not found" }`

**Side effect:** `PartyDetails.Balance -= LoanAmount` (restores balance)

> FK constraint blocks deletion if the loan has linked collections.

---

## Collections

A collection is a repayment received from a friend. Every mutation automatically adjusts `PartyDetails.Balance` and `PartyDetails.LastPayment`.

### GET `/api/collections`

All repayments, ordered by Id **descending** (newest first), with `PartyName` and `LoanAmount` joined in.

**Query params**

| Param | Type | Default |
|-------|------|---------|
| skip | int | 0 |
| limit | int | 100 |

**Response `200`**
```json
[
  {
    "Id": 5,
    "LoanId": 1,
    "PartyId": 1,
    "PartyName": "Ravi Kumar",
    "LoanAmount": 50000.00,
    "CollectionDate": "2026-06-01",
    "Amount": 4500.00,
    "PaymentMode": "UPI",
    "ReferenceNo": "TXN12345678",
    "Status": "Received",
    "Notes": null
  }
]
```

---

### GET `/api/collections/{collection_id}`

Single collection without joined fields.

**Response `200`**
```json
{
  "Id": 5,
  "LoanId": 1,
  "PartyId": 1,
  "CollectionDate": "2026-06-01",
  "Amount": 4500.00,
  "PaymentMode": "UPI",
  "ReferenceNo": "TXN12345678",
  "Status": "Received",
  "Notes": null
}
```

**Response `404`** `{ "detail": "Collection record not found" }`

---

### POST `/api/collections`

Records a repayment.

**Request**
```json
{
  "LoanId": 1,
  "PartyId": 1,
  "CollectionDate": "2026-06-01",
  "Amount": 4500.00,
  "PaymentMode": "UPI",
  "ReferenceNo": "TXN12345678",
  "Status": "Received",
  "Notes": null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| LoanId | int | yes | Must be a valid loan Id |
| PartyId | int | yes | Must match the loan's party |
| CollectionDate | date | yes | Date payment was received |
| Amount | float | yes | Amount received |
| PaymentMode | string | yes | `"Cash"`, `"UPI"`, `"Cheque"`, `"Bank Transfer"` |
| ReferenceNo | string | no | UPI txn ID, cheque number, etc. |
| Status | string | no | Default `"Received"` |
| Notes | string | no | |

**Response `200`** — collection object with generated `Id`

**Side effects:**
- `PartyDetails.Balance -= Amount`
- `PartyDetails.LastPayment = CollectionDate`

---

### PUT `/api/collections/{collection_id}`

Updates a repayment. Same body as POST.

**Response `200`** — updated collection

**Response `404`** `{ "detail": "Collection record not found" }`

**Side effects:**
- `PartyDetails.Balance -= (new_Amount - old_Amount)`
- `PartyDetails.LastPayment = new CollectionDate`

---

### DELETE `/api/collections/{collection_id}`

**Response `200`** `{ "ok": true }`

**Response `404`** `{ "detail": "Collection record not found" }`

**Side effect:** `PartyDetails.Balance += Amount` (restores balance)

> `LastPayment` is NOT rolled back on delete.

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (login only) |
| 404 | Resource not found |
| 422 | Validation error — Pydantic, includes field-level detail |
| 500 | Unexpected server error |
