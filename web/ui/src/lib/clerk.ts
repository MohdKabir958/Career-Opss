export function getClerkPublishableKey(): string {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to web/ui/.env",
    );
  }
  return key;
}

export const API_BASE = import.meta.env.VITE_API_URL || "";
