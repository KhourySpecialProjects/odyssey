"use client";

import { useState } from "react";
import { useDropletUpdate } from "../hooks/useDropletUpdate";
import { Resource } from "@/types";
import { updateDroplet } from "@/lib/actions";
import { NextStepDisplay } from "@/components/draft/metadata/next-steps/next-step";
import { Input } from "@/components/ui/input";
import { AddButton } from "../form-buttons";

export function NextSteps({
  dropletId,
  nextSteps,
}: {
  dropletId: number;
  nextSteps: Resource[];
}) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const { error, handleChange } = useDropletUpdate(dropletId);

  const updateNextStep = (id: number) => {
    return (nextStep: Resource) => {
      console.log(nextStep);
      const newNextSteps = [...nextSteps];
      newNextSteps.filter((ns) => ns.id == id)[0].label = nextStep.label;
      newNextSteps.filter((ns) => ns.id == id)[0].url = nextStep.url;
      handleChange({
        nextSteps: newNextSteps.map((ns) => {
          return { label: ns.label, url: ns.url };
        }),
      });
    };
  };

  const removeNextStep = (id: number) => {
    return async () => {
      const newNextSteps = [...nextSteps].filter((ns) => ns.id != id);
      const response = await updateDroplet(dropletId, {
        nextSteps: newNextSteps.map((ns) => {
          return { label: ns.label, url: ns.url };
        }),
      });
    };
  };

  const addNextStep = async (formData: FormData) => {
    const url = (formData.get("url") as string).trim();
    const label = (formData.get("label") as string).trim();
    if (label === "" || url == "") return;
    const response = await updateDroplet(dropletId, {
      nextSteps: [
        ...nextSteps.map((ns) => {
          return { label: ns.label, url: ns.url };
        }),
        { label: label, url: url },
      ],
    });
    if (!response.error && response.data) {
      setUrl("");
      setLabel("");
    }
  };

  return (
    <section className="w-full">
      <h2 className="text-2xl font-bold text-slate-900">Next Steps</h2>
      <p className="text-slate-500">
        To further your understanding, we recommend exploring:
      </p>
      <div className="mt-4 border rounded-md bg-slate-50 border-slate-200">
        <ul className="flex flex-col divide-y divide-slate-200">
          {nextSteps.map((ns) => (
            <NextStepDisplay
              initial={ns}
              key={ns.id}
              update={updateNextStep(ns.id)}
              remove={removeNextStep(ns.id)}
            />
          ))}
          <li className="px-4 py-3 ">
            <form
              action={addNextStep}
              className="flex flex-row items-center justify-between flex-nowrap w-full space-x-1.5"
            >
              <Input
                name="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                }}
                placeholder="URL"
                autoComplete="off"
              />
              <Input
                name="label"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                }}
                placeholder="Label"
                autoComplete="off"
              />
              <AddButton />
            </form>
          </li>
        </ul>
      </div>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </section>
  );
}
