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
    <div className="relative flex flex-row">
      <Button
        onClick={() => setShowPopup(!showPopup)}
        variant="link"
        size="sm"
        className="text-sky-300"
      >
        {showPopup ? "Hide Requests" : "Show All Requests"}
      </Button>

      <div className="absolute left-[-15px] top-[50px] w-full rounded-2xl bg-slate-100 p-3">
        <RequestsPopup
          user={user}
          friendships={friendships}
          showPopup={showPopup}
        />
      </div>
    </div>
  );
}
