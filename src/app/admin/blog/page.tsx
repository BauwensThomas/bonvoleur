import { getAll } from "@/lib/db";
import BlogManager from "@/components/admin/BlogManager";

export default async function BlogAdminPage() {
  const initial = (await getAll("posts")).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  return <BlogManager initial={initial} />;
}
