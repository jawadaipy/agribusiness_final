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
        "Email confirmation is temporarily paused to protect this account. Please wait before requesting another email, then check your inbox and spam folder.",
      retryAfterSeconds: retryAfterSeconds ?? 60,
    };
  }

  if (normalized.includes("email not confirmed") || normalized.includes("email not verified")) {
    return {
      message:
        "Please confirm the email link we sent before signing in. If you cannot find it, check spam/junk and request one new confirmation email after the cooldown.",
    };
  }

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return {
      message:
        "This email may already be registered. Try signing in, or use the confirmation/recovery flow if you cannot access the account.",
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
