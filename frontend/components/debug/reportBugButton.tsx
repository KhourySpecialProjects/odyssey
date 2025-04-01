"use client";

import { ReportBugDialog } from "../droplets/reports/bug/dialog";
import { User } from "@/types";
import { useState } from "react";

export function ReportBugButton({ user }: { user: User | undefined }) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <ReportBugDialog
        user={user}
        open={showDialog}
        onOpenChange={() => setShowDialog(!showDialog)}
        data-testid="report-bug-dialog"
      />
    </>
  );
}
