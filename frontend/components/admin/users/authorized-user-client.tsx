"use client"
import { AuthorizedUser } from "@/types";
import { AuthorizedUserBlock } from "./authorized-user";
import { useState } from "react";

const ITEMS_PER_PAGE = 5;

export function AuthorizedUserClient({
    authorizedUsers
} : {
    authorizedUsers: AuthorizedUser[]
}) {
    const [currentPage, setCurrentPage] = useState(1);
  
    return (
      <div className="p-4 mt-4 rounded-md bg-slate-100">
          {authorizedUsers.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
              {authorizedUsers.map((user) => (
                <AuthorizedUserBlock user={user} key={user.id} />
              ))}
            </ul>
          ) : (
            <p>There are no authorized users.</p>
          )}
        </div>
    );
  }
  