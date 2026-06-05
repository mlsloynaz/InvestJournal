import { redirect } from "next/navigation";

import { TOOLS_WEBSITES_PATH } from "@/lib/tools-paths";



export default function LegacyWebsitesRedirect() {

  redirect(TOOLS_WEBSITES_PATH);

}

