import { getVoyages } from "@/lib/requests/voyage";
import { VoyagesAdminPageClient } from "./voyages-admin-page-client";

export async function VoyagesAdminPage() {
  const voyages = await getVoyages();

  return <VoyagesAdminPageClient voyages={voyages} />;
}
