import { redirect } from "next/navigation";
import { MARKET_PATH } from "@/lib/tools-paths";

export default function GestionRedirectPage() {
  redirect(MARKET_PATH);
}

export const dynamic = "force-dynamic";
