import { redirect } from "next/navigation";
import { MARKET_BB15_PATH } from "@/lib/tools-paths";

export default function Bb15MovementRedirectPage() {
  redirect(MARKET_BB15_PATH);
}

export const dynamic = "force-dynamic";
