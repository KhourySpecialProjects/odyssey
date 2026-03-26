import { fetchDroplets } from "@/lib/requests/data";
import { DropletsPageClient } from "./droplets-page-client";

export async function DropletsPage() {
  const droplets = await fetchDroplets();
  return <DropletsPageClient droplets={droplets} />;
}
