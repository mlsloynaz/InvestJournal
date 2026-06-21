import { redirect } from "next/navigation";
import { MARKET_PATH, MARKET_TESTING_CRITERIAS_TAB } from "@/lib/tools-paths";

export default async function TestingCriteriasRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = searchParams ? await searchParams : {};
  const q = new URLSearchParams();
  q.set("tab", MARKET_TESTING_CRITERIAS_TAB);
  for (const [key, val] of Object.entries(raw)) {
    if (key === "tab") continue;
    if (Array.isArray(val)) {
      if (val[0]) q.set(key, val[0]);
    } else if (val) {
      q.set(key, val);
    }
  }
  redirect(`${MARKET_PATH}?${q.toString()}`);
}

export const dynamic = "force-dynamic";
