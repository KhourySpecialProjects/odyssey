"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { MultiSelect, MultiSelectItem } from "@/components/new/multi-select";
import { LearningObjectivesInput } from "@/components/new/learning-objectives-input";
import { DROPLET_FILTERS } from "@/lib/globals";
import { Tag, User } from "@/types";
import { useState, useEffect } from "react";
import { createDroplet } from "@/lib/actions";
import {
  LoaderIcon,
  MoveRightIcon,
  MoveLeftIcon,
  User2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { FocusArea, DropletType } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { RadioSelect } from "./radio-select";

const initialSubmissionState: any = {
  error: null,
};

export function CreateDropletForm({
  tags,
  author,
}: {
  tags: Tag[];
  author: User;
}) {
  const router = useRouter();
  const [dropletName, setDropletName] = useState<string | null>(null);
  const [focusAreaValue, setFocusAreaValue] = useState<string | null>(null);
  const [typeValue, setTypeValue] = useState<string | null>(null);
  const initArr1: string[] = [""];
  const [learningObjectives, setLearningObjectives] = useState(initArr1);

  const initArr2: MultiSelectItem[] = [];
  const [selectedTags, setSelectedTags] = useState(initArr2);

  const [submissionState, setSubmissionState] = useState(
    initialSubmissionState
  );

  const states = [
    { value: focusAreaValue, setValue: setFocusAreaValue },
    { value: typeValue, setValue: setTypeValue },
  ];

  //resets error message when changes made to fields
  useEffect(() => {
    setSubmissionState(initialSubmissionState);
  }, [
    dropletName,
    focusAreaValue,
    typeValue,
    selectedTags,
    learningObjectives,
  ]);

  async function addDroplet() {
    const data = {
      name: dropletName as string,
      focusArea: focusAreaValue as FocusArea,
      type: typeValue as DropletType,
      tagIds: selectedTags.map((tag) => tag.id),
      learningObjectives: learningObjectives.filter(
        (objective) => objective !== ""
      ),
    };

    if (
      !data.name ||
      !data.focusArea ||
      !data.type ||
      !data.tagIds ||
      !data.learningObjectives ||
      data.tagIds.length === 0 ||
      data.learningObjectives.length === 0
    ) {
      setSubmissionState({ error: "Please fill out all fields" });
      return;
    }

    setSubmissionState({ error: null });

    const response = await createDroplet(data);

    if (!response.error && response.data) {
      router.push("/draft/d/" + response.data.attributes.slug);
    } else {
      setSubmissionState({ error: response.error });
    }
  }

  const focusAreaFilter = DROPLET_FILTERS.find(
    (filter) => filter.name === "focusArea"
  );

  return (
    <form
      className="w-4/5 flex flex-col items-center justify-center space-y-4 h-min p-5"
      action={addDroplet}
      autoComplete="off"
    >
      <div className="w-full flex flex-col items-start justify-between gap-2">
        <div className="w-full font-semibold text-sm py-0.5 pb-2 text-slate-400">
          Metadata
        </div>
        <div className="w-full flex flex-col gap-3 border rounded-md border-slate-200 p-8 bg-white">
          <div>
            <div className="font-semibold text-sm py-0.5 pb-2">Name</div>
            <Input
              id="name"
              name="name"
              placeholder="Developing a Droplet"
              className="max-w-full"
              onChange={(e) => setDropletName(e.target.value)}
            />
          </div>
          <div className="flex lg:flex-row xs:flex-col items-start justify-start gap-y-8 gap-x-10">
            {focusAreaFilter && (
              <Select
                key={focusAreaFilter.name}
                name={focusAreaFilter.name}
                onValueChange={setFocusAreaValue}
              >
                <SelectGroup className="flex flex-col items-start lg:w-1/2 xs:w-full">
                  <SelectLabel className="pl-0 pb-2">
                    {focusAreaFilter.label}
                  </SelectLabel>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder="Select..."
                      className="placeholder:text-slate-400"
                    />
                  </SelectTrigger>
                </SelectGroup>

                <SelectContent>
                  {focusAreaFilter.options.map((option) => (
                    <SelectItem value={option.value} key={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <RadioSelect
              label="Type"
              items={
                DROPLET_FILTERS.find(
                  (filter) => filter.name === "type"
                )?.options.map((option, index) => ({
                  id: index,
                  name: option.label,
                  value: option.value,
                })) ?? []
              }
              selected={typeValue}
              setSelected={setTypeValue}
            />
          </div>
          <div className="flex lg:flex-row xs:flex-col items-start justify-start gap-y-8 gap-x-10">
            <div className="lg:w-1/2 xs:w-full">
              <div className="font-semibold text-sm py-1.5">Tags</div>
              <MultiSelect
                label="Tags"
                items={tags}
                selected={selectedTags}
                setSelected={setSelectedTags}
                className="w-full flex justify-start"
                align="start"
              />
            </div>

            <div>
              <div className="font-semibold text-sm py-1.5">Author(s)</div>
              <div className="flex flex-row items-center gap-2">
                <Avatar variant="round" size="sm">
                  <AvatarImage src={author.image ?? undefined} />
                  <AvatarFallback>
                    {author.name ? (
                      getInitials(author.name)
                    ) : (
                      <User2Icon className="w-4 h-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <p>{author.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col items-start justify-between gap-2">
        <div className="w-full font-semibold text-sm py-0.5 pb-2 text-slate-400">
          Overview
        </div>
        <LearningObjectivesInput
          className="w-full flex flex-col gap-3 border rounded-md border-slate-200 p-8 bg-white"
          learningObjectives={learningObjectives}
          setLearningObjectives={setLearningObjectives}
        />
      </div>

      <div className="flex items-center justify-center self-end space-x-4">
        <Button
          variant="outline"
          before={<MoveLeftIcon />}
          onClick={() => router.back()}
        >
          <div className="w-30 flex items-center justify-center">Cancel</div>
        </Button>

        <SubmitButton />
      </div>
      {submissionState.error ? (
        <p className="text-red-500">{submissionState.error}</p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      after={
        pending ? <LoaderIcon className="animate-spin" /> : <MoveRightIcon />
      }
      variant="default"
    >
      <div className="w-30 flex items-center justify-center">
        Create Droplet
      </div>
    </Button>
  );
}
