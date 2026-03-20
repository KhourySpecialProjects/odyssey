"use client";

import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { useState } from "react";

const DEV_PERSONAS: {
  label: string;
  roles: AuthorizedUserRoleTitle[];
}[] = [
  {
    label: "CS1200 Student",
    roles: [AuthorizedUserRoleTitle.User],
  },
  {
    label: "Content Creator",
    roles: [AuthorizedUserRoleTitle.ContentCreator],
  },
  {
    label: "Content Editor",
    roles: [AuthorizedUserRoleTitle.ContentEditor],
  },
  {
    label: "Faculty",
    roles: [AuthorizedUserRoleTitle.Faculty],
  },
  {
    label: "System Admin",
    roles: [AuthorizedUserRoleTitle.SysAdmin],
  },
];

export function RoleSwitcher({
  currentRoles,
  activePersona,
}: {
  currentRoles: string[];
  activePersona: string | null;
}) {
  const [open, setOpen] = useState(false);

  function setPersona(persona: (typeof DEV_PERSONAS)[number] | null) {
    if (persona) {
      document.cookie = `dev-role-override=${JSON.stringify(persona.roles)};path=/`;
      document.cookie = `dev-role-label=${persona.label};path=/`;
    } else {
      document.cookie = "dev-role-override=;path=/;max-age=0";
      document.cookie = "dev-role-label=;path=/;max-age=0";
    }
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded border border-white/30 px-2 py-0.5 text-[10px] transition-colors hover:bg-white/10"
      >
        <span className="opacity-60">Role:</span>
        <span className="font-bold">
          {activePersona ?? currentRoles.join(", ")}
        </span>
        <span className="text-[8px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-[100] mt-1 min-w-56 rounded-md border border-slate-600 bg-slate-900 py-1 shadow-xl">
          <button
            onClick={() => setPersona(null)}
            className={`flex w-full flex-col px-3 py-1.5 text-left text-[11px] hover:bg-white/10 ${
              !activePersona ? "bg-white/10" : ""
            }`}
          >
            <span className="font-semibold">Default (My Roles)</span>
            <span className="text-[9px] opacity-50">
              Use actual session roles
            </span>
          </button>

          <div className="mx-2 my-1 border-t border-white/10" />

          {DEV_PERSONAS.map((persona) => (
            <button
              key={persona.label}
              onClick={() => setPersona(persona)}
              className={`flex w-full flex-col px-3 py-1.5 text-left text-[11px] hover:bg-white/10 ${
                activePersona === persona.label ? "bg-white/10" : ""
              }`}
            >
              <span className="font-semibold">{persona.label}</span>
              <span className="text-[9px] opacity-50">
                {persona.roles.join(" + ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
