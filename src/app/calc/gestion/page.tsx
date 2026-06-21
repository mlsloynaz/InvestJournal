import { redirect } from "next/navigation";

import { MARKET_PATH } from "@/lib/tools-paths";

export default function CalcGestionRedirect() {
  redirect(MARKET_PATH);
}
