"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AlignCenter } from "lucide-react";
import { CreationRequest } from "@/types";
import { CreationRequestModal } from "./view-request";

export function CreationRequestBlock({
  request,
}: {
  request: CreationRequest;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <li className="flex items-center justify-between py-4">
        <div>
          <p className="font-medium dark:text-slate-300">
            {request?.user?.firstName} {request?.user?.lastName}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {request?.user?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-400 px-2 hover:bg-blue-500 sm:px-4 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-900"
          >
            <AlignCenter className="text-black dark:text-white" />
            <p className="hidden text-black sm:block dark:text-white">View</p>
          </Button>
        </div>
      </li>

      <CreationRequestModal
        request={request}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
