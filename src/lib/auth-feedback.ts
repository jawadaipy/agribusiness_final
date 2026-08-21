/**
 * Agribusiness secure-auth UX: present authentication-provider errors without
 * claiming an account was created or revealing account-existence information.
 */
export type AuthFeedback = {
  message: string;
  retryAfterSeconds?: number;
};

function secondsFromProviderMessage(message: string) {
  const match = message.match(/after\s+(\d+)\s+seconds?/i);
  return match ? Number(match[1]) : undefined;
}

export function getAuthFeedback(providerMessage: string): AuthFeedback {
  const message = providerMessage.trim();
  const normalized = message.toLowerCase();
  const retryAfterSeconds = secondsFromProviderMessage(message);

  if (
    normalized.includes("security purposes") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return {
      message:
        "Authentication requests are temporarily rate-limited. Please wait a few moments before trying again.",
      retryAfterSeconds: retryAfterSeconds ?? 30,
    };
  }

  if (normalized.includes("email not confirmed") || normalized.includes("email not verified")) {
    return {
      message:
        "Unable to sign in directly. Please ensure 'Confirm email' is disabled in your Supabase Auth provider settings for instant access.",
    };
  }

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return {
      message:
        "This email is already registered. Please sign in with your credentials.",
    };
  }

  if (normalized.includes("password") && normalized.includes("least")) {
    return { message: "Choose a stronger password that meets the stated minimum length." };
  }

  return { message: message || "We could not complete the request. Please try again." };
}

export function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) return `${remainder}s`;
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}
