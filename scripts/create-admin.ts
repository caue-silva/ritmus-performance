/**
 * Cria a conta de ADMIN (o Gabriel) num projeto Supabase — usado uma vez, na publicação.
 *
 *   npx tsx scripts/create-admin.ts --env .env.production.local --email gabriel@exemplo.com --nome "Gabriel Paiva" --whatsapp 15999999999
 *
 * Gera uma senha temporária (mostrada uma única vez); no primeiro acesso ele cria a dele.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import { generateTempPassword } from "../src/lib/tokens";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce<[string, string][]>(
      (acc, cur, i, all) =>
        cur.startsWith("--") ? [...acc, [cur.slice(2), all[i + 1] ?? ""]] : acc,
      [],
    ),
);

config({ path: args.env ?? ".env.production.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = (args.email ?? "").trim().toLowerCase();
const name = (args.nome ?? "").trim();
const whatsapp = (args.whatsapp ?? "").replace(/\D/g, "");

if (!url || !secret) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo de ambiente (--env).",
  );
  process.exit(1);
}
if (
  !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
  name.split(/\s+/).length < 2
) {
  console.error(
    'Uso: --email gabriel@exemplo.com --nome "Gabriel Paiva" [--whatsapp 15999999999]',
  );
  process.exit(1);
}

async function main() {
  const db = createClient(url!, secret!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const password = generateTempPassword();

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error(`Não deu para criar a conta: ${error.message}`);
    process.exit(1);
  }
  const { error: pErr } = await db.from("profiles").insert({
    id: data.user.id,
    email,
    full_name: name,
    whatsapp: whatsapp.length >= 10 ? whatsapp : null,
    role: "admin",
    must_change_password: true,
  });
  if (pErr) {
    await db.auth.admin.deleteUser(data.user.id);
    console.error(`Não deu para criar o perfil: ${pErr.message}`);
    process.exit(1);
  }
  console.log(`✔ Admin criado: ${email}`);
  console.log(`  Senha temporária (aparece só agora): ${password}`);
  console.log("  No primeiro acesso ele cria a própria senha.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
