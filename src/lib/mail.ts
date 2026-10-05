export async function sendMail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return console.log(`[mail not configured] to=${to} subject=${subject}\n${text}`);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text }),
  });
  if (!res.ok) console.error("mail failed", res.status, await res.text());
}
