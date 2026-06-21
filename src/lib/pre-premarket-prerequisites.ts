/** Detect Schwab OAuth / token errors in FinanceAI bar-fetch messages. */
export function isSchwabAuthError(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  const t = message.toLowerCase();
  return (
    t.includes("invalid_grant") ||
    t.includes("refresh token") ||
    t.includes("unsupported_token_type") ||
    t.includes("schwab auth") ||
    t.includes("run scripts/schwab_auth")
  );
}

export function firstSchwabAuthError(
  messages: Array<string | null | undefined>
): string | undefined {
  for (const msg of messages) {
    if (msg && isSchwabAuthError(msg)) {
      return msg.length > 220 ? `${msg.slice(0, 217)}…` : msg;
    }
  }
  return undefined;
}

export type PrePremarketPrerequisitesStatus = {
  strategies: {
    ok: boolean;
    updatedAt?: string | null;
    playbookCount?: number;
    hint: string;
  };
  marketCalendar: {
    ok: boolean;
    updatedAt?: string | null;
    hint: string;
  };
  tickerContext: {
    ok: boolean;
    withBars: number;
    total: number;
    missingSample: string[];
    hint: string;
  };
  schwabAuth: {
    ok: boolean;
    hint: string;
    detail?: string;
  };
};
