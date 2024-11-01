import { CreateDroplet } from "@/components/new/new-droplet";

export default async function CreateDropletRoute() {
  return (
    <>
      <div className="w-full flex items-center justify-center flex-col select-none h-screen">
        <CreateDroplet />
      </div>
    </>
  );
}
