import { ArchiveList } from "@/components/archive-list";
import { listDrawings } from "@/lib/drawings";
import type { DrawingSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  let drawings: DrawingSummary[] = [];
  let error: string | undefined;

  try {
    drawings = await listDrawings();
  } catch {
    error = "The archive could not be opened.";
  }

  return <ArchiveList drawings={drawings} error={error} />;
}
