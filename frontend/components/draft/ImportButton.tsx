"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Import } from "lucide-react";
import { MarkdownImportModal } from "./MarkdownImportModal";

export function ImportButtonWrapper() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        after={<Import />}
        className="select-none dark:bg-gray-300"
        size="sm"
      >
        Import MD
      </Button>
      
      <MarkdownImportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}