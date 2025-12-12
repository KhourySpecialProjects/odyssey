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
import {
  LoaderIcon,
  MoveRightIcon,
  MoveLeftIcon,
  User2Icon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { FocusArea, DropletType } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { RadioSelect } from "./radio-select";
import { createDroplet } from "@/lib/requests/droplet";
import { getDroplets } from "@/lib/requests/droplet";
import Link from "next/link";

type SubmissionState = {
  error: string | React.ReactNode | null;
  existingDropletName?: string;
  existingDropletAuthor?: string;
  isDraft?: boolean;
};

const initialSubmissionState: SubmissionState = {
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
  const [dropletName, setDropletName] = useState<string>("");
  const [focusAreaValue, setFocusAreaValue] = useState<string>("");
  const [typeValue, setTypeValue] = useState<string>("");
  const initArr1: string[] = [""];
  const [learningObjectives, setLearningObjectives] = useState(initArr1);

  const initArr2: MultiSelectItem[] = [];
  const [selectedTags, setSelectedTags] = useState(initArr2);

  const [submissionState, setSubmissionState] = useState(
    initialSubmissionState,
  );

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
    // Normalize the name for comparison (trim and convert to lowercase for checking)
    const normalizedName = dropletName.trim();

    const data = {
      name: normalizedName,
      focusArea: focusAreaValue as FocusArea,
      type: typeValue as DropletType,
      tagIds: selectedTags.map((tag) => tag.id),
      learningObjectives: learningObjectives.filter(
        (objective) => objective.trim() !== "",
      ),
    };

    if (
      !data.name ||
      !data.focusArea ||
      !data.type ||
      data.tagIds.length === 0 ||
      data.learningObjectives.length === 0
    ) {
      setSubmissionState({ error: "Please fill out all required fields" });
      return;
    }

    setSubmissionState({ error: null });

    const response = await createDroplet(data);

    if (response.ok && response.data) {
      router.push("/draft/d/" + response.data.attributes.slug);
    } else {
      // Check if it's a duplicate name error
      if (response.error?.includes("This attribute must be unique (name)")) {
        // Fetch the existing droplet to get its slug and status
        try {
          const existingDroplets = await getDroplets({
            filters: { name: dropletName.trim() },
            fields: ["name", "slug", "status"],
            populate: {
              authorized_users: {
                fields: ["name", "email"],
              },
            },
            pagination: { pageSize: 1, page: 1 },
          });

          if (existingDroplets && existingDroplets.length > 0) {
            const existingDroplet = existingDroplets[0];
            const isDraft = existingDroplet.status === "draft";
            const slug = existingDroplet.slug;

            if (isDraft) {
              // Get the first author's name
              const firstAuthor = existingDroplet.authorized_users?.[0];
              const authorName =
                firstAuthor?.name || firstAuthor?.email || "the author";

              setSubmissionState({
                error: `There is a droplet in progress with the same title. Contact ${authorName} to become a co-author of "${dropletName.trim()}".`,
                existingDropletName: dropletName.trim(),
                existingDropletAuthor: authorName,
                isDraft: true,
              });
            } else {
              setSubmissionState({
                error: (
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      A published droplet with this name already exists.
                    </p>
                    <Link
                      href={`/d/${slug}`}
                      className="mt-2 inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
                    >
                      View existing droplet "{dropletName.trim()}"
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ),
                existingDropletName: dropletName.trim(),
                isDraft: false,
              });
            }
            return;
          }
        } catch (fetchError) {
          console.error("Failed to fetch existing droplet:", fetchError);
        }

        setSubmissionState({
          error: "A droplet with this name already exists.",
          existingDropletName: dropletName.trim(),
        });
      } else {
        setSubmissionState({ error: response.error || "An error occurred" });
      }
    }
  }

  const focusAreaFilter = DROPLET_FILTERS.find(
    (filter) => filter.name === "focusArea",
  );

  return (
    <form
      className="flex h-min flex-col items-center justify-center space-y-4 p-5 md:w-4/5"
      action={addDroplet}
      autoComplete="off"
    >
      <div className="flex w-full flex-col items-start justify-between gap-2">
        <div className="w-full py-0.5 pb-2 text-sm font-semibold text-slate-400">
          Metadata
        </div>
        <div className="flex w-full flex-col gap-3 rounded-md border border-slate-200 bg-white p-8 dark:border-slate-500 dark:bg-slate-800">
          <div>
            <div className="py-0.5 pb-2 text-sm font-semibold">
              Name <span className="text-red-500">*</span>
            </div>
            <Input
              id="name"
              name="name"
              placeholder="Developing a Droplet"
              className="max-w-full"
              value={dropletName}
              onChange={(e) => setDropletName(e.target.value)}
            />
          </div>
          <div className="xs:flex-col flex items-start justify-start gap-x-10 gap-y-8 lg:flex-row">
            {focusAreaFilter && (
              <Select
                key={focusAreaFilter.name}
                name={focusAreaFilter.name}
                value={focusAreaValue}
                onValueChange={setFocusAreaValue}
              >
                <SelectGroup className="xs:w-full flex flex-col items-start lg:w-1/2">
                  <SelectLabel className="pb-2 pl-0">
                    {focusAreaFilter.label}{" "}
                    <span className="text-red-500">*</span>
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
                  (filter) => filter.name === "type",
                )?.options.map((option, index) => ({
                  id: index,
                  name: option.label,
                  value: option.value,
                })) ?? []
              }
              selected={typeValue}
              setSelected={setTypeValue}
              firstTime={true}
            />
          </div>
          <div className="xs:flex-col flex items-start justify-start gap-x-10 gap-y-8 lg:flex-row">
            <div className="xs:w-full lg:w-1/2">
              <div className="py-1.5 text-sm font-semibold">
                Tags <span className="text-red-500">*</span>
              </div>
              <MultiSelect
                label="Tags"
                items={tags}
                selected={selectedTags}
                setSelected={setSelectedTags}
                className="flex w-full justify-start"
                align="start"
              />
            </div>

            <div>
              <div className="py-1.5 text-sm font-semibold">Author(s)</div>
              <div className="flex flex-row items-center gap-2">
                <Avatar variant="round" size="sm">
                  <AvatarImage src={author.image ?? undefined} />
                  <AvatarFallback>
                    {author.name ? (
                      getInitials(author.name)
                    ) : (
                      <User2Icon className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <p>{author.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-start justify-between gap-2">
        <div className="w-full py-0.5 pb-2 text-sm font-semibold text-slate-400">
          Overview
        </div>
        <LearningObjectivesInput
          className="flex w-full flex-col gap-3 rounded-md border border-slate-200 bg-white p-8 dark:border-slate-500 dark:bg-slate-800"
          learningObjectives={learningObjectives}
          setLearningObjectives={setLearningObjectives}
          firstTime={true}
        />
      </div>

      <div className="flex items-center justify-center space-x-4 self-end">
        <Button
          before={<MoveLeftIcon />}
          onClick={() => router.push("/my-content")}
          className="bg-black text-white dark:bg-slate-50 dark:text-black"
        >
          <div className="w-30 flex items-center justify-center">Cancel</div>
        </Button>

        <SubmitButton />
      </div>

      {submissionState.error && (
        <div className="w-full rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          {typeof submissionState.error === "string" ? (
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {submissionState.error}
            </p>
          ) : (
            submissionState.error
          )}
        </div>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      disabled={pending}
      after={
        pending ? <LoaderIcon className="animate-spin" /> : <MoveRightIcon />
      }
      variant="default"
      className="bg-black text-white dark:bg-slate-50 dark:text-black"
    >
      <div className="w-30 flex items-center justify-center">
        Create Droplet
      </div>
    </Button>
  );
}
