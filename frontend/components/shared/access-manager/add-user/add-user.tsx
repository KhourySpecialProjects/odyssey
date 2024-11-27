"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { sendAccessRequest } from "@/lib/actions";
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
      <h2 className="font-bold">Add User</h2>
      <p>Invite a new user by entering their email address.</p>

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
    <Button type="submit" disabled={pending}>
      {pending ? "Sending..." : "Send Invite"}
    </Button>
  );
}
