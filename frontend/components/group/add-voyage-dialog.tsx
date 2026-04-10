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
import { Voyage } from "@/types";
import { getVoyages } from "@/lib/requests/voyage";
import { Badge } from "../ui/badge";
import Link from "next/link";

interface AddVoyageDialogProps {
  currentVoyages: Voyage[];
  onAddVoyages: (voyages: Voyage[]) => void;
}

export function AddVoyageDialog({
  currentVoyages,
  onAddVoyages,
}: AddVoyageDialogProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [availableVoyages, setAvailableVoyages] = useState<Voyage[]>([]);
  const [selectedVoyages, setSelectedVoyages] = useState<Voyage[]>([]);

  useEffect(() => {
    if (open) {
      getVoyages().then((voyages) => {
        const filtered = voyages.filter(
          (v) => !currentVoyages.find((cv) => cv.id === v.id),
        );
        setAvailableVoyages(filtered);
      });
    }
  }, [open, currentVoyages]);

  const filteredVoyages = availableVoyages
    .filter((voyage) =>
      voyage.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.name?.localeCompare(b.name));

  const handleAddVoyage = (voyage: Voyage) => {
    setSelectedVoyages((prev) => [...prev, voyage]);
    setAvailableVoyages((prev) => prev.filter((v) => v.id !== voyage.id));
  };

  const handleDone = () => {
    onAddVoyages(selectedVoyages);
    setSelectedVoyages([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Voyage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Voyages to Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search voyages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
          <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto">
            {filteredVoyages.map((voyage) => (
              <div key={voyage.id} className="group relative h-[100px]">
                <Link
                  href={`/voyages/${voyage.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="h-full rounded-md border bg-slate-50 p-4 dark:border-slate-500 dark:bg-slate-800">
                    <div className="flex h-full flex-col">
                      <span className="text-xl font-bold dark:text-slate-300">
                        {voyage.name}
                      </span>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline">
                          {voyage.voyage_nodes?.length ?? 0} nodes
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="lg"
                  className="absolute top-1/2 right-4 -translate-y-1/2"
                  onClick={() => handleAddVoyage(voyage)}
                  data-testid="addVoyage"
                >
                  <PlusCircle className="h-6 w-6 text-green-700" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button
              onClick={handleDone}
              disabled={selectedVoyages.length === 0}
            >
              Add {selectedVoyages.length} Voyage
              {selectedVoyages.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
