import { redirect } from "next/navigation";
import { TOOLS_STRATEGIES_PATH } from "@/lib/tools-paths";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StrategyIdRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`${TOOLS_STRATEGIES_PATH}?id=${id}`);
}
