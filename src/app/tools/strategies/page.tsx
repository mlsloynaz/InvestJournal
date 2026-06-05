import { redirect } from "next/navigation";

import { TOOLS_STRATEGIES_PATH } from "@/lib/tools-paths";



type Props = {

  searchParams: Promise<{ id?: string; new?: string }>;

};



export default async function LegacyStrategiesRedirect({ searchParams }: Props) {

  const { id, new: newParam } = await searchParams;

  const q = new URLSearchParams();

  if (id) q.set("id", id);

  if (newParam) q.set("new", newParam);

  const suffix = q.toString() ? `?${q.toString()}` : "";

  redirect(`${TOOLS_STRATEGIES_PATH}${suffix}`);

}

