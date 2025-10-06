"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createAuthorizedUserWithState } from "@/lib/actions";
import { createAuthorizedUser } from "@/lib/requests/authorized-user";
import { Input, Switch } from "@lemonsqueezy/wedges";
import { DialogClose } from "@radix-ui/react-dialog";
import { ArrowRightIcon, PlusIcon, XIcon } from "lucide-react";
import { useActionState } from "react";

const initialState: any = {
  email: "",
  isEnabled: true,
  isAdmin: false,
};

export function CreateUser() {
  const [state, formAction, isPending] = useActionState(
    createAuthorizedUserWithState,
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="dark:bg-slate-300" after={<PlusIcon />}>
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Authorized User</DialogTitle>
          <DialogDescription>
            Authorize a new user to access Khoury Odyssey.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4 text-left">
          {state?.ok ? (
            <>
              <p className="rounded-md border-2 border-slate-200 bg-slate-100 p-4 text-center">
                {state?.message}
              </p>

              <div className="flex flex-row gap-2">
                <DialogClose asChild>
                  <Button before={<XIcon />}>Close</Button>
                </DialogClose>
              </div>

              <hr className="my-4" />

              <p className="font-medium">Add Another?</p>
            </>
          ) : null}

          <Input
            id="email"
            name="email"
            label="Email"
            description="(@northeastern.edu)"
            placeholder="f.last@northeastern.edu"
            required
          />

          <Switch
            id="isEnabled"
            name="isEnabled"
            alignLabel="end"
            label="Enabled?"
            helperText="Only enabled users can access the application."
            defaultChecked={true}
          />

          {state?.error ? (
            <p
              aria-live="polite"
              className="rounded-md border-2 border-slate-200 bg-slate-100 p-4"
            >
              {state?.error}. Confirm that no other user exists with this email
              address.
            </p>
          ) : null}

          <Button
            type="submit"
            after={<ArrowRightIcon />}
            aria-disabled={isPending}
          >
            Submit
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
