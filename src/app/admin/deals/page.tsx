import { getAll } from "@/lib/db";
import DealsManager from "@/components/admin/DealsManager";

export default async function DealsAdminPage() {
  const initial = (await getAll("deals")).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  return <DealsManager initial={initial} />;
}
