"use client";

import { useState } from "react";
import { useDropletUpdate } from "../hooks/useDropletUpdate";
import { Resource } from "@/types";
import { NextStepDisplay } from "@/components/draft/metadata/next-steps/next-step";
import { Input } from "@/components/ui/input";
import { AddButton } from "../form-buttons";
import { toast } from "sonner";
import { updateDroplet } from "@/lib/requests/droplet";

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
      await updateDroplet(dropletId, {
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
    } else {
      toast.error("Not a valid URL");
    }
  };

  return (
    <section className="w-full">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Learn More
      </h2>
      <p className="mt-1 text-slate-500 dark:text-slate-300">
        To further your understanding, we recommend exploring:
      </p>
      <div className="mt-4 rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-600 dark:bg-slate-800">
        <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500 dark:text-slate-300">
          {nextSteps.map((ns) => (
            <NextStepDisplay
              initial={ns}
              key={ns.id}
              update={updateNextStep(ns.id)}
              remove={removeNextStep(ns.id)}
            />
          ))}
          <li className="px-4 py-3">
            <form
              action={addNextStep}
              className="flex w-full flex-row flex-nowrap items-center justify-between space-x-1.5"
              role="form"
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
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </section>
  );
}
