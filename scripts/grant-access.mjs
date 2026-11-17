// Gives a user access to the portal. There is no public sign-up: the staff invites.
//
// Usage:
//   npm run grant-access -- --email someone@example.com --role staff
//   npm run grant-access -- --email someone@example.com --role client --client <client uuid>
//
// Creates the auth user if it does not exist (no email is sent), then adds the staff or membership row.
// The user then signs in with a magic link at /login.

import { createClient } from "@supabase/supabase-js";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const role = arg("role");
  const clientId = arg("client");
  if (!email || !["staff", "client"].includes(role)) {
    throw new Error("Usage: --email <email> --role staff|client [--client <uuid>]");
  }
  if (role === "client" && !clientId) throw new Error("--client <uuid> is required for role client");

  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  const { data: list, error: listError } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  let user = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }

  const result = role === "staff"
    ? await sb.from("staff").upsert({ user_id: user.id })
    : await sb.from("client_members").upsert({ client_id: clientId, user_id: user.id });
  if (result.error) throw result.error;

  console.log(`OK: ${role} access granted (user ${user.id}).`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
