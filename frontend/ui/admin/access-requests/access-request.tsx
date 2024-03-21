"use client";

import { AccessRequest } from "./access-requests";

export function AccessRequestBlock({ request }: { request: AccessRequest }) {
  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="truncate text-slate-900 dark:text-white">
            <span className="font-bold">
              {request.givenName} {request.familyName}
            </span>{" "}
            &middot; {request.college} {request.affiliation}
          </p>
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {request.email}
          </p>
        </div>
      </div>
    </li>
  );
}
