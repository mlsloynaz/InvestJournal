import { redirect } from "next/navigation";
import { TOOLS_STRATEGIES_PATH } from "@/lib/tools-paths";

export default function NewStrategyRedirect() {
  redirect(`${TOOLS_STRATEGIES_PATH}?new=1`);
}
