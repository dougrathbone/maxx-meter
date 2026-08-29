# Connecting accounts

MaxxMeter supports three providers. Each account belongs to the Home Assistant user who created it (via ingress `X-Remote-User-Id`).

## Claude (OAuth — recommended)

1. Open **MaxxMeter** from Home Assistant sidebar (ingress).
2. Go to **Accounts** → **Add account** → provider **Claude**.
3. Click **OAuth Connect** on the new card.
4. Sign in at Anthropic in the opened tab.
5. Copy the **authorization code** from the callback page.
6. Paste the code in the dashboard and click **Submit code**.

Tokens are stored encrypted under `/data/credentials/` on the add-on.

### Manual token (advanced)

If OAuth fails, you can paste a bearer token from an existing Claude Code session. This is less durable than OAuth.

## Cursor (session cookie)

1. Log in at [cursor.com](https://cursor.com) in your browser.
2. Open DevTools → Application → Cookies → copy `WorkosCursorSessionToken`.
3. In MaxxMeter **Accounts**, paste the value (with or without the cookie name) and click **Paste token**.

Cursor has no public OAuth for usage APIs; the cookie may expire when you log out.

## Kimi (API key)

1. Generate an API key in Kimi Coding settings.
2. Paste `sk-kimi-...` in MaxxMeter **Accounts** → **Paste token**.

## Disconnecting

Use **Disconnect** to remove stored credentials. The account row remains until you **Delete** it.

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `auth_expired` on panel / MQTT | Reconnect the account |
| OAuth "Invalid state" | Start OAuth again (states expire when consumed) |
| Cursor always empty | Verify cookie is fresh; check HA add-on can reach cursor.com |

See also [setup.md](./setup.md) and [panels-and-users.md](./panels-and-users.md).
