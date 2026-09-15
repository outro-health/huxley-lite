# EHR API

The electronic health record. Charts created here are what clinicians
document against. Base URL and key come from `.env`
(`INTEGRATIONS_BASE_URL`, `INTEGRATIONS_API_KEY`).

```
Authorization: Bearer <api key>
Content-Type: application/json
```

All responses are JSON. Errors have the shape
`{ "error": { "code": "...", "message": "..." } }`.

## Create a chart

`POST /ehr/v1/patients`

Requires an `Idempotency-Key` header. Sending the same key with the same
body again returns the existing chart (`200`) instead of creating another
(`201`). The same key with a different body is rejected (`409
idempotency_conflict`).

```json
{
  "firstName": "Ana",
  "lastName": "Alvarez",
  "dateOfBirth": "1988-03-14",
  "email": "ana.alvarez@example.com"
}
```

Response `201`:

```json
{
  "id": "pt_fd395f2c92574a59",
  "firstName": "Ana",
  "lastName": "Alvarez",
  "dateOfBirth": "1988-03-14",
  "email": "ana.alvarez@example.com",
  "createdAt": "2026-09-15T15:02:34.395Z"
}
```

## Fetch a chart

`GET /ehr/v1/patients/{id}`

## Notes

Free-text notes on a chart. Notes are append-only.

`GET /ehr/v1/patients/{id}/notes` → `{ "data": [ ... ] }`

`POST /ehr/v1/patients/{id}/notes`

```json
{ "text": "Marked eligible in error; corrected 15 Sep.", "authorName": "Dr. Maya Chen" }
```

Response `201` with the note.

## Errors

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `missing_idempotency_key` | Create called without the header |
| 401 | `unauthorized` | Missing or unknown API key |
| 404 | `not_found` | No such chart |
| 405 | `not_allowed` | Charts cannot be deleted |
| 409 | `idempotency_conflict` | Key reused with a different body |
| 422 | `validation_failed` | Message says which fields |
| 429 | `rate_limited` | Back off for `Retry-After` seconds |
