import Link from "next/link";
import { TOOLS_DOCS_PATH } from "@/lib/tools-paths";

export function DocsBackLink() {
  return (
    <Link href={TOOLS_DOCS_PATH} className="text-sm text-investep-navy underline hover:no-underline">
      ← Docs
    </Link>
  );
}
