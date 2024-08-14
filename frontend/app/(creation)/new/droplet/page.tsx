import { getTags } from "@/lib/requests/tag";
import { CreateDropletForm } from "@/components/new/new-droplet-form";

export const runtime = "edge";


export default async function CreateDroplet() {
  const tags = await getTags({ fields: ["name", "slug"] });
  return (
   
      <CreateDropletForm tags={tags} />
    
  );
}
