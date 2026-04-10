import { redirect } from "next/navigation";

export default function DashboardRoute() {
  redirect("/feed?tab=droplets");
}
