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
import { MultiSelect, MultiSelectItems } from "@/components/new/multi-select";
import { LearningObjectivesInput } from "@/components/new/learning-objectives-input";
import { DROPLET_FILTERS } from "@/lib/globals";
import { Tag } from "@/types";
import { useState, useEffect } from "react";
import { createDroplet } from "@/lib/actions";
import { LoaderIcon, MoveRightIcon, MoveLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { FocusArea, DropletType } from "@/types";

const initialSubmissionState: any = {
  error: null,
};

export function CreateDropletForm({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [dropletName, setDropletName] = useState<string | null>(null);
  const [focusAreaValue, setFocusAreaValue] = useState<string | null>(null);
  const [typeValue, setTypeValue] = useState<string | null>(null);

  const initArr1: string[] = [""];
  const [learningObjectives, setLearningObjectives] = useState(initArr1);

  const initArr2: MultiSelectItems[] = [];
  const [selectedTags, setSelectedTags] = useState(initArr2);

  const [submissionState, setSubmissionState] = useState(
    initialSubmissionState,
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
        (objective) => objective !== "",
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

  return (
    
      <form
        className="w-5/6 flex flex-col items-center justify-center space-y-4 h-min"
        action={addDroplet}
        autoComplete="off"
      >
        <div>
          <div className="font-semibold text-sm py-1.5 pb-2">Droplet Name</div>
          <Input
            id="name"
            name="name"
            placeholder="Droplet Name"
            className="w-56"
            onChange={(e) => setDropletName(e.target.value)}
          />
        </div>

        <MultiSelect
          label="Tags"
          items={tags}
          selected={selectedTags}
          setSelected={setSelectedTags}
        />
        {DROPLET_FILTERS.map((filter, index) => (
          <Select
            key={filter.name}
            name={filter.name}
            onValueChange={states[index].setValue}
          >
            <SelectGroup className="flex flex-col items-start">
              <SelectLabel className="pl-0 pb-2">{filter.label}</SelectLabel>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
            </SelectGroup>

            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem value={option.value} key={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        <LearningObjectivesInput
          learningObjectives={learningObjectives}
          setLearningObjectives={setLearningObjectives}
        />

        <div className="flex items-center justify-center space-x-4">
          <Button
            variant="outline"
            before={<MoveLeftIcon />}
            onClick={() => router.back()}
          >
            <div className="w-20 flex items-center justify-center">Cancel</div>
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
      variant="outline"
    >
      <div className="w-20 flex items-center justify-center">Create</div>
    </Button>
  );
}


