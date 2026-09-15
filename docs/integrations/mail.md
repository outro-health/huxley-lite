# Mail API

Transactional email to patients. Base URL and key come from `.env`
(`INTEGRATIONS_BASE_URL`, `INTEGRATIONS_API_KEY`).

```
Authorization: Bearer <api key>
Content-Type: application/json
```

## Send a message

`POST /mail/v1/messages`

```json
{ "to": "ana.alvarez@example.com", "subject": "Welcome to Outro", "body": "Hi Ana, ..." }
```

Response `202 Accepted`. The message is queued; delivery happens
asynchronously.

```json
{
  "id": "msg_05074eb5849d401b",
  "to": "ana.alvarez@example.com",
  "subject": "Welcome to Outro",
  "status": "queued",
  "acceptedAt": "2026-09-15T15:02:34.427Z",
  "events": [{ "type": "queued", "at": "2026-09-15T15:02:34.427Z" }]
}
```

## Check a message

`GET /mail/v1/messages/{id}`

Same shape. `status` is one of `queued`, `delivered`, `bounced`. Each
transition appears in `events` with its timestamp; bounces carry a
`reason`. Poll this to learn what happened; final statuses usually appear
within a few seconds.

```json
{
  "id": "msg_1a2b",
  "status": "bounced",
  "events": [
    { "type": "queued", "at": "2026-09-15T15:02:34.427Z" },
    { "type": "bounced", "at": "2026-09-15T15:02:38.427Z", "reason": "550 5.1.1 The email account does not exist" }
  ]
}
```

## Errors

| Status | Code | Meaning |
|--------|------|---------|
| 401 | `unauthorized` | Missing or unknown API key |
| 404 | `not_found` | No such message |
| 422 | `validation_failed` | Bad address or missing fields |
| 429 | `rate_limited` | Back off for `Retry-After` seconds |
