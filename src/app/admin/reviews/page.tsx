import { getAll } from "@/lib/db";
import ReviewsManager from "@/components/admin/ReviewsManager";

export default async function ReviewsAdminPage() {
  const initial = (await getAll("reviews")).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  return <ReviewsManager initial={initial} />;
}
