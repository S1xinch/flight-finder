import Link from "next/link";
import { sha } from "@/lib/crypto";
import { sql } from "@/lib/db";

export const metadata = { title: "Verify email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const rows = token
    ? await sql`UPDATE users SET email_verified = TRUE, verify_hash = NULL WHERE verify_hash = ${sha(token)} RETURNING id`
    : [];
  return (
    <div className="wrap">
      <div className="card max-w-md">
        <h1 className="mb-3">Verify email</h1>
        {rows.length ? (
          <p>Your email is verified. <Link href="/login">Sign in</Link>.</p>
        ) : (
          <p className="err" role="alert">This verification link is invalid or was already used. Try signing in, or <Link href="/register">register again</Link>.</p>
        )}
      </div>
    </div>
  );
}
