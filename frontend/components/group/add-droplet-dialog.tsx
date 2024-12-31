"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Droplet } from "@/types";
import { GroupDropletTile } from "./group-droplet-tile";
import { getDroplets } from "@/lib/requests/droplet";

interface AddDropletDialogProps {
  currentDroplets: Droplet[];
  onAddDroplets: (droplet: Droplet[]) => void;
}

export function AddDropletDialog({
  currentDroplets,
  onAddDroplets,
}: AddDropletDialogProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [availableDroplets, setAvailableDroplets] = useState<Droplet[]>([]);
  const [selectedDroplets, setSelectedDroplets] = useState<Droplet[]>([]);

  useEffect(() => {
    if (open) {
      getDroplets().then((droplets) => {
        const filtered = droplets.filter(
          (d) => !currentDroplets.find((cd) => cd.id === d.id)
        );
        setAvailableDroplets(filtered);
      });
    }
  }, [open, currentDroplets]);

  const filteredDroplets = availableDroplets.filter((droplet) =>
    droplet.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddDroplet = (droplet: Droplet) => {
    setSelectedDroplets((prev) => [...prev, droplet]);
    setAvailableDroplets((prev) => prev.filter((d) => d.id !== droplet.id));
  };

  const handleDone = () => {
    onAddDroplets(selectedDroplets);  // Pass all selected droplets at once
    setSelectedDroplets([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Droplet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Droplets to Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search droplets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
          <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto">
            {filteredDroplets.map((droplet) => (
              <div key={droplet.id} className="relative group h-[120px]">
                <GroupDropletTile droplet={droplet} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 right-4 -translate-y-1/2"
                  onClick={() => handleAddDroplet(droplet)}
                >
                  <PlusCircle className="h-6 w-6 text-green-700" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleDone}
              disabled={selectedDroplets.length === 0}
            >
              Add {selectedDroplets.length} Droplet
              {selectedDroplets.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// export function AddDropletDialog({ currentDroplets, onAddDroplet }: AddDropletDialogProps) {
//   const [search, setSearch] = useState("");
//   const [open, setOpen] = useState(false);
//   const [availableDroplets, setAvailableDroplets] = useState<Droplet[]>([]);

//   useEffect(() => {
//     if (open) {
//       getDroplets().then(droplets => {
//         const filtered = droplets.filter(d =>
//           !currentDroplets.find(cd => cd.id === d.id)
//         );
//         setAvailableDroplets(filtered);
//       });
//     }
//   }, [open, currentDroplets]);

//   const filteredDroplets = availableDroplets.filter(droplet =>
//     droplet.name.toLowerCase().includes(search.toLowerCase())
//   );

//   const handleAddDroplet = (droplet: Droplet) => {
//     onAddDroplet(droplet);
//     setOpen(false);
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button variant="outline" size="sm">
//           <PlusCircle className="h-4 w-4 mr-2" />
//           Add Droplet
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="max-w-3xl">
//         <DialogHeader>
//           <DialogTitle>Add Droplets to Group</DialogTitle>
//         </DialogHeader>
//         <div className="space-y-4">
//           <Input
//             placeholder="Search droplets..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full"
//           />
//           <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
//             {filteredDroplets.map((droplet) => (
//               <div key={droplet.id} className="relative group">
//                 <GroupDropletTile droplet={droplet} />
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
//                   onClick={() => handleAddDroplet(droplet)}
//                 >
//                   <PlusCircle className="h-4 w-4 text-green-600" />
//                 </Button>
//               </div>
//             ))}
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
