import { getAll } from "@/lib/db";
import SeoSuggestionsManager from "@/components/admin/SeoSuggestionsManager";

export default async function SeoSuggestionsAdminPage() {
  const initial = (await getAll("seo_suggestions")).sort((a, b) =>
    b.detected_at.localeCompare(a.detected_at)
  );
  return <SeoSuggestionsManager initial={initial} />;
}
