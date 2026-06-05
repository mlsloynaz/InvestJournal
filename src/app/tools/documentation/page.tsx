import { redirect } from "next/navigation";
import { TOOLS_DOCS_PATH } from "@/lib/tools-paths";

export default function DocumentationIndexRedirect() {
  redirect(TOOLS_DOCS_PATH);
}
