// PIN auth helpers. Works in both Node (route handlers) and Edge (middleware)
// via the Web Crypto API available globally in both runtimes.

export const SESSION_COOKIE = "cc_session";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// The opaque session token derived from the server secret. Single-user app:
// the same token is issued on every successful login and checked by middleware.
export async function expectedToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET ?? "dev-secret-change-me";
  return sha256Hex(`${secret}:cut-coach:v1`);
}

// Validate a submitted PIN against the configured hash.
export async function checkPin(pin: string): Promise<boolean> {
  const configured = process.env.APP_PIN_HASH ?? "";
  if (!configured) return false;
  const submitted = await sha256Hex(pin.trim());
  // constant-time-ish compare
  if (submitted.length !== configured.length) return false;
  let diff = 0;
  for (let i = 0; i < submitted.length; i++) {
    diff |= submitted.charCodeAt(i) ^ configured.charCodeAt(i);
  }
  return diff === 0;
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return token === (await expectedToken());
}
