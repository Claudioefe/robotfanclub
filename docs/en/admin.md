# The Admin (Phase 7)

`/admin` is staff only. If you sign in as a client user, it sends you to `/portal`.

## Screens
- **Clients** (`/admin`): list of clients with their `kind`, fee and current query window; add a client. The `kind` is required: `real` (measured by live jobs), `demo` (no job touches it) or `sandbox` (dry-run with fixtures only).
- **One client** (`/admin/clients/<id>`):
  - **Frozen query list:** paste up to 60 queries and freeze. It starts a 60-day window. To change it, freeze another list: it starts the day after the running one ends.
  - **Speed: sprint details:** deploy date and baseline INP.
  - **Chrome UX Report targets:** the exact origin (with or without `www`, as people visit it) and key URLs. Then run the CrUX job (`npm run crux:backfill` once).
  - **Tag Bouncer scripts:** name, address, blocking in ms, action and whether it is required (it cannot be removed and is outside the SLA).
  - **Access:** give or remove a person's access. No email is sent: the person opens `/login` with that address and asks for their link.
- **Costs** (`/admin/costs`): DataForSEO spend over the last 30 days by client and by day, and the latest watcher runs.

## What is not there, on purpose
Deleting clients or checks (evidence is append-only), the Slack webhook (deferred) and granting staff access (done from the terminal: `npm run grant-access -- --email ... --role staff`).

## Security
Every page and every action checks in the database that the caller is staff (D-037). The `create-client`, `add-crux-target` and `grant-access` scripts still work.

Spanish version: [`../es/admin.md`](../es/admin.md).
