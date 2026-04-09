import { getVoyagesAdmin } from "@/lib/requests/voyage";
import { VoyagesAdminPageClient } from "./voyages-admin-page-client";

export async function VoyagesAdminPage() {
  const voyages = await getVoyagesAdmin();

  return <VoyagesAdminPageClient voyages={voyages} />;
}
