import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/new/multi-select";
import { LearningObjectivesInput } from "@/components/new/learning-objectives-input";
import { getTags } from "@/lib/requests/tag";
import { DROPLET_FILTERS } from "@/lib/globals";
import { CreateDropletForm } from "@/components/new/new-droplet-form";

export default async function CreateDroplet() {
  const tags = await getTags({ fields: ["name", "slug"] });
  return <CreateDropletForm tags={tags} />;
}
