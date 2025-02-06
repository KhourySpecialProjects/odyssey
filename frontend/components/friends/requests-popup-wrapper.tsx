"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RequestsPopup } from "./requests-popup";
import { AuthorizedUser } from "@/types";

export function RequestsPopupWrapper({
  user,
  friendships,
}: {
  user: AuthorizedUser;
  friendships: AuthorizedUser[];
}) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="flex flex-row relative">
      <Button
        onClick={() => setShowPopup(!showPopup)}
        variant="link"
        size="sm"
        className="text-sky-300"
      >
        {showPopup ? "Hide Requests" : "Show All Requests"}
      </Button>

      <div className="absolute top-[50px] left-[-15px] bg-slate-100 p-3 rounded-2xl w-full">
        <RequestsPopup
          user={user}
          friendships={friendships}
          showPopup={showPopup}
        />
      </div>
    </div>
  );
}
