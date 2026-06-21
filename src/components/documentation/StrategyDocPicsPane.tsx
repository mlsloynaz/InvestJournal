import { readStrategyPics, type StrategyPicItem } from "@/lib/strategy-docs";
import { StrategyDocPicsGallery } from "@/components/documentation/StrategyDocPicsGallery";

export function StrategyDocPicsPane({ pics }: { pics: StrategyPicItem[] }) {
  return <StrategyDocPicsGallery pics={pics} />;
}

export async function StrategyDocPicsPaneLoader({ slug }: { slug: string }) {
  const pics = await readStrategyPics(slug);
  return <StrategyDocPicsPane pics={pics} />;
}
