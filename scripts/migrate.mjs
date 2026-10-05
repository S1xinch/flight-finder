import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const sql = neon(process.env.DATABASE_URL);
for (const stmt of readFileSync("db/schema.sql", "utf8").split(/;\s*\n/).filter((s) => s.trim())) {
  await sql.query(stmt);
}
console.log("schema applied");
