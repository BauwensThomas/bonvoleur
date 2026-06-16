import { getAll } from "@/lib/db";
import PartnersManager from "@/components/admin/PartnersManager";

export default async function PartnersAdminPage() {
  const initial = (await getAll("partners")).sort(
    (a, b) => a.position - b.position
  );
  return <PartnersManager initial={initial} />;
}
