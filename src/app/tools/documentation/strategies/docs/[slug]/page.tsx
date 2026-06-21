import { notFound } from "next/navigation";
import { MarkdownDocument } from "@/components/documentation/MarkdownDocument";
import { StrategyDocPicsPaneLoader } from "@/components/documentation/StrategyDocPicsPane";
import { StrategyDocNavLoader } from "@/components/documentation/StrategyDocNav";
import {
  listStrategyDocs,
  readStrategyDoc,
  rewriteStrategyDocAssetUrls,
} from "@/lib/strategy-docs";
import { strategyDocPath } from "@/lib/tools-paths";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const docs = await listStrategyDocs();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function StrategyDocPage({ params }: Props) {
  const { slug } = await params;
  const doc = await readStrategyDoc(slug);
  if (!doc) notFound();

  const markdown = rewriteStrategyDocAssetUrls(doc.markdown);

  return (
    <div className="space-y-6">
      <StrategyDocNavLoader currentSlug={doc.slug} />

      <header className="text-sm text-gray-500 space-y-1">
        <p>
          Archivo: <code className="bg-white px-1 text-xs">{doc.filename}</code>
        </p>
      </header>

      <StrategyDocPicsPaneLoader slug={doc.slug} />

      <MarkdownDocument source={markdown} />
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const doc = await readStrategyDoc(slug);
  if (!doc) return { title: "Estrategia no encontrada" };
  return {
    title: doc.title,
    alternates: { canonical: strategyDocPath(doc.slug) },
  };
}
