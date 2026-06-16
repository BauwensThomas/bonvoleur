import { getAll } from "@/lib/db";
import SubscribersManager from "@/components/admin/SubscribersManager";

export default async function SubscribersAdmin() {
  const rows = await getAll("subscribers");
  const initial = [...rows].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  return <SubscribersManager initial={initial} />;
}
