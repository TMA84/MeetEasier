# MeetEasier – Microsoft Graph Webhook Setup Guide

This guide explains the full Graph webhook workflow in MeetEasier:

- Prerequisites
- `.env` configuration
- Creating and renewing Graph subscriptions
- End-to-end testing with Outlook bookings
- Troubleshooting

---

## 1) Security first

If an `OAUTH_CLIENT_SECRET` was ever exposed:

1. Create a **new secret** in Azure App Registration.
2. **Disable/delete** the old secret.
3. Use only the new secret from now on.

---

## 2) Prerequisites

- A publicly reachable HTTPS URL for your instance (not localhost-only unless using a tunnel)
- Azure App Registration with admin consent
- Room mailboxes available in Microsoft 365

### 2.1 Required Azure permissions (Application)

Minimum:

- `Calendars.Read`

For booking/modification features in MeetEasier:

- `Calendars.ReadWrite`

Then run: **Grant admin consent**.

---

## 3) Configure `.env`

Enable these values in your `.env` (without `#`):

```dotenv
OAUTH_CLIENT_ID=<AZURE_APP_CLIENT_ID>
OAUTH_AUTHORITY=https://login.microsoftonline.com/<TENANT_ID>
OAUTH_CLIENT_SECRET=<AZURE_CLIENT_SECRET_VALUE>

GRAPH_WEBHOOK_ENABLED=true
GRAPH_WEBHOOK_CLIENT_STATE=<LONG_RANDOM_STRING>
# GRAPH_WEBHOOK_ALLOWED_IPS=...
```

Notes:

- Leave `GRAPH_WEBHOOK_ALLOWED_IPS` empty at first (simpler debugging).
- `GRAPH_WEBHOOK_CLIENT_STATE` must exactly match the subscription value.

Restart the server afterward.

---

## 4) What the webhook does in MeetEasier

The webhook is not the data source itself. It acts as a **trigger**:

1. Graph sends a notification to `/api/graph/webhook`.
2. MeetEasier triggers an immediate refresh + follow-up refresh.
3. Data is fetched again from Microsoft Graph.
4. Updated rooms are pushed to clients via Socket.IO.

Result: Outlook bookings usually appear on displays within seconds.

---

## 5) Verify public endpoint reachability

Your endpoint must be reachable from the internet:

```text
https://<YOUR_DOMAIN>/api/graph/webhook
```

For local development, use a tunnel (e.g., ngrok/cloudflared).

---

## 6) Get an access token (client credentials)

```bash
TENANT_ID="<TENANT_ID>"
CLIENT_ID="<AZURE_APP_CLIENT_ID>"
CLIENT_SECRET="<AZURE_CLIENT_SECRET_VALUE>"

TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
	-H "Content-Type: application/x-www-form-urlencoded" \
	-d "client_id=${CLIENT_ID}" \
	-d "client_secret=${CLIENT_SECRET}" \
	-d "scope=https%3A%2F%2Fgraph.microsoft.com%2F.default" \
	-d "grant_type=client_credentials" | jq -r .access_token)

echo "$TOKEN" | head -c 40 && echo "..."
```

Requirement: `jq` installed.

---

## 7) Create a subscription

> Important: MeetEasier receives webhooks, but does not create subscriptions automatically. This must be done externally.

Example (for one room mailbox):

```bash
WEBHOOK_URL="https://<YOUR_DOMAIN>/api/graph/webhook"
ROOM_MAILBOX="room-a@company.com"
CLIENT_STATE="<EXACTLY_AS_IN_ENV>"
EXPIRY="2026-03-09T10:00:00Z"

curl -s -X POST "https://graph.microsoft.com/v1.0/subscriptions" \
	-H "Authorization: Bearer ${TOKEN}" \
	-H "Content-Type: application/json" \
	-d "{
		\"changeType\": \"created,updated,deleted\",
		\"notificationUrl\": \"${WEBHOOK_URL}\",
		\"resource\": \"/users/${ROOM_MAILBOX}/events\",
		\"expirationDateTime\": \"${EXPIRY}\",
		\"clientState\": \"${CLIENT_STATE}\"
	}" | jq
```

If you have multiple rooms, you typically need multiple subscriptions (one per resource).

---

## 8) Understand the validation handshake

When creating the subscription, Graph validates your endpoint with:

```text
GET /api/graph/webhook?validationToken=...
```

MeetEasier returns the token as plain text. Only then the subscription becomes active.

---

## 9) List/check subscriptions

```bash
curl -s -X GET "https://graph.microsoft.com/v1.0/subscriptions" \
	-H "Authorization: Bearer ${TOKEN}" | jq
```

Check these fields:

- `id`
- `resource`
- `notificationUrl`
- `expirationDateTime`

---

## 10) Renew subscriptions

Subscriptions expire and must be renewed regularly.

```bash
SUBSCRIPTION_ID="<SUBSCRIPTION_ID>"
NEW_EXPIRY="2026-03-10T10:00:00Z"

curl -s -X PATCH "https://graph.microsoft.com/v1.0/subscriptions/${SUBSCRIPTION_ID}" \
	-H "Authorization: Bearer ${TOKEN}" \
	-H "Content-Type: application/json" \
	-d "{\"expirationDateTime\": \"${NEW_EXPIRY}\"}" | jq
```

Recommended:

- Scheduled job (e.g., every 12 hours)
- Renew when remaining lifetime is below 24 hours

---

## 11) End-to-end test with Outlook

1. Create or modify a room meeting in Outlook.
2. Expected behavior:
	 - Graph sends `POST /api/graph/webhook`
	 - MeetEasier processes the notification
	 - Immediate refresh + follow-up refresh
	 - Clients receive updated room data via Socket.IO

Also check:

- `GET /api/sync-status`
- `GET /api/health`

---

## 12) Troubleshooting

### Problem: No webhook events received

Check:

- Subscription exists and is not expired
- `notificationUrl` is publicly reachable (HTTPS)
- Correct `resource` (`/users/<room>/events`)
- Firewall/reverse proxy allows Graph requests

### Problem: `processed = 0` in webhook response

- `GRAPH_WEBHOOK_CLIENT_STATE` does not match subscription `clientState`

### Problem: `403 Webhook origin not allowed`

- `GRAPH_WEBHOOK_ALLOWED_IPS` is too strict
- Leave it empty for testing, then harden gradually

### Problem: Data updates are delayed

- Webhook is not arriving
- System falls back to polling only

### Problem: OAuth/token errors (`invalid_client`, `401`)

- Wrong secret used (secret ID instead of secret value)
- Secret expired
- Missing admin consent

---

## 13) Quick checklist

1. `.env` is set correctly (`OAUTH_*`, `GRAPH_WEBHOOK_*`)
2. Public HTTPS URL is available
3. Access token can be retrieved
4. Subscription is created
5. Subscription is listed and not expired
6. Outlook test booking is performed
7. `sync-status`/`health` look good
8. Renewal mechanism is in place

---

## 14) Useful MeetEasier API endpoints

- `GET /api/graph/webhook` (validation)
- `POST /api/graph/webhook` (notification receiver)
- `GET /api/health`
- `GET /api/readiness`
- `GET /api/sync-status`

