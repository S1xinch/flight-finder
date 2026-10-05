import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const key = () => Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

/** AES-256-GCM; output = base64(iv | tag | ciphertext). */
export function enc(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64");
}

export function dec(s: string) {
  const b = Buffer.from(s, "base64");
  const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}

export const token = () => randomBytes(32).toString("hex");
export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
