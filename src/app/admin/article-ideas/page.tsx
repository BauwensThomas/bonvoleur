import { getAll } from "@/lib/db";
import ArticleIdeasManager from "@/components/admin/ArticleIdeasManager";

export default async function ArticleIdeasAdminPage() {
  const initial = (await getAll("article_ideas")).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return <ArticleIdeasManager initial={initial} />;
}
