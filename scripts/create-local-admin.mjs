import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator < 1) {
      continue;
    }

    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!process.env[name]) {
      process.env[name] = value;
    }
  }
}

loadEnvFile(resolve("apps/api/.env"));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.LOCAL_ADMIN_EMAIL ?? "admin@hoopkit.local";
const password =
  process.env.LOCAL_ADMIN_PASSWORD ??
  `Hk!2026-${randomBytes(12).toString("base64url")}`;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "請先建立 apps/api/.env，並填入 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY。",
  );
}

const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: "HoopKit Local Admin",
    },
  }),
});

const authBody = await authResponse.json();

if (!authResponse.ok) {
  throw new Error(
    `建立 Auth user 失敗：${authBody.message ?? authResponse.statusText}`,
  );
}

const roleResponse = await fetch(
  `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(authBody.id)}`,
  {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ role: "admin" }),
  },
);

if (!roleResponse.ok) {
  throw new Error(`指派 admin role 失敗：${await roleResponse.text()}`);
}

console.log("本機 Admin 建立完成（db:reset 後需重新建立）：");
console.log(`Email: ${email}`);
console.log(`Password: ${password}`);
