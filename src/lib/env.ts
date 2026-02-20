// Environment variable validation — never use process.env directly
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

// Public (available client + server)
export const NEXT_PUBLIC_CONVEX_URL = requireEnv("NEXT_PUBLIC_CONVEX_URL");

// Server-only
export const getEncryptionSecret = () => requireEnv("ENCRYPTION_SECRET");

// Clerk (auto-loaded by @clerk/nextjs, but validated here)
export const NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = requireEnv(
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
);
export const getClerkSecretKey = () => requireEnv("CLERK_SECRET_KEY");

// Optional
export const NEXT_PUBLIC_CLERK_SIGN_IN_URL = optionalEnv(
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
) ?? "/sign-in";
export const NEXT_PUBLIC_CLERK_SIGN_UP_URL = optionalEnv(
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
) ?? "/sign-up";
