import { userId } from "@/lib/auth";
import { sql } from "@/lib/db";
import { json } from "@/lib/http";

export async function GET() {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  return json(
    await sql`
      SELECT DISTINCT ON (origin, destination, departure_date, return_date)
        origin AS o, destination AS d, departure_date::text AS dep, return_date AS ret, passengers AS pax, cabin, created_at
      FROM saved_searches WHERE user_id = ${uid}
      ORDER BY origin, destination, departure_date, return_date, created_at DESC`,
  );
}
