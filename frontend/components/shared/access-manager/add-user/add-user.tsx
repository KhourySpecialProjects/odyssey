"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormStatus } from "react-dom";

export function AddUser() {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // await sendAccessRequest(email);
    setEmail("");
  };

  return (
    <section className="mt-8">
      <h2 className="font-bold dark:text-slate-300">Add User</h2>
      <p className="dark:text-slate-300">
        Invite a new user by entering their email address.
      </p>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex items-center space-x-2">
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-grow"
          />
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="dark:bg-slate-300" disabled={pending}>
      {pending ? "Sending..." : "Send Invite"}
    </Button>
  );
}
