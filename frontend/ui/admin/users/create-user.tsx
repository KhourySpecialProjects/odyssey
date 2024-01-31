"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createAuthorizedUser } from "@/lib/actions";
import { Button, Input, Switch } from "@lemonsqueezy/wedges";
import { DialogClose } from "@radix-ui/react-dialog";
import { ArrowRightIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

const initialState: any = {
  email: "",
  isEnabled: true,
  isAdmin: false,
};

export function CreateUser() {
  const [state, formAction] = useFormState(createAuthorizedUser, initialState);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="px-4 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          Create User
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Authorized User</DialogTitle>
          <DialogDescription>
            Authorize a new user to access Khoury Odyssey.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4 text-left">
          {state?.success ? (
            <>
              <p className="p-4 rounded-md bg-slate-100 border-2 border-slate-200 text-center">
                {state?.message}
              </p>

              <div className="flex flex-row gap-2">
                <DialogClose asChild>
                  <Button before={<XIcon className="w-4" />}>Close</Button>
                </DialogClose>
              </div>
            </>
          ) : null}

          <hr className="my-4" />

          <p className="font-medium">Add Another?</p>

          <Input
            id="email"
            name="email"
            label="Email"
            description="(@northeastern.edu)"
            placeholder="f.last@northeastern.edu"
            required
          />

          <Switch
            id="isAdmin"
            name="isAdmin"
            alignLabel="end"
            label="Admin?"
            helperText="Admins can manage authorized users."
            defaultChecked={false}
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
              className="p-4 rounded-md bg-slate-100 border-2 border-slate-200"
            >
              {state?.error}. Confirm that no other user exists with this email
              address.
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      after={<ArrowRightIcon className="w-4" />}
      type="submit"
      aria-disabled={pending}
    >
      Submit
    </Button>
  );
}
