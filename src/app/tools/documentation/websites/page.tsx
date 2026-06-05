import { DocsBackLink } from "@/components/documentation/DocsBackLink";
import { WebsitesList } from "@/components/documentation/WebsitesList";
import { documentationWebsitesColumns } from "@/data/documentation-websites";

export default function ToolsWebsitesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <DocsBackLink />
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Websites</h1>
        <p className="text-sm text-gray-600 mt-1">Enlaces útiles para análisis y operación.</p>
      </header>

      <div className="bg-white border border-investep-navy/15 rounded-lg p-6 sm:p-8">
        <WebsitesList columns={documentationWebsitesColumns} />
      </div>
    </div>
  );
}