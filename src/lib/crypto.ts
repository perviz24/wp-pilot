import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set");
  }
  // Secret must be 32 bytes (256 bits) — hex-encoded = 64 chars
  const key = Buffer.from(secret, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_SECRET must be 64 hex characters (32 bytes)");
  }
  return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns { ciphertext, iv } both as hex strings.
 */
export function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext: encrypted + authTag,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypt a ciphertext + iv pair back to plaintext.
 */
export function decrypt(ciphertext: string, iv: string): string {
  const key = getKey();
  const ivBuffer = Buffer.from(iv, "hex");

  // Separate auth tag from encrypted data
  const authTag = Buffer.from(
    ciphertext.slice(-AUTH_TAG_LENGTH * 2),
    "hex",
  );
  const encryptedData = ciphertext.slice(0, -AUTH_TAG_LENGTH * 2);

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a random ENCRYPTION_SECRET (run once during setup).
 * Usage: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateSecret(): string {
  return randomBytes(32).toString("hex");
}
