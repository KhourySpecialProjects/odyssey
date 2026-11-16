import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  OnboardingQuiz,
  ONBOARDING_STORAGE_KEY,
} from "@/components/onboarding/onboarding-quiz";
import { tagsToTopics } from "@/lib/onboarding-topics";

const topics = tagsToTopics([
  { documentId: "t1", name: "Python" },
  { documentId: "t2", name: "Resumes" },
  { documentId: "t3", name: "Ethics" },
  { documentId: "t4", name: "Not mapped" },
]);
const profile = {
  first: "Jaylen",
  last: "Zeng",
  bio: "",
  timeZone: "America/Chicago",
};

const next = () =>
  screen.getByRole("button", { name: /continue|see my recommendations/i });
const heading = (name: RegExp) => screen.getByRole("heading", { name });

function setup(props = {}) {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(
    <OnboardingQuiz
      topics={topics}
      initialProfile={profile}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { user, onSubmit };
}

async function toStep4(user: ReturnType<typeof userEvent.setup>) {
  await user.click(next());
  await user.click(screen.getByRole("radio", { name: /co-op or a job/i }));
  await user.click(next());
  await user.click(screen.getByRole("button", { name: /technical/i }));
  await user.click(next());
}

describe("OnboardingQuiz", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it("blocks Continue until each step has its required answers", async () => {
    const { user } = setup({ initialProfile: { first: "A", last: "B" } });
    // Step 1 needs a time zone (jsdom's zone is not guaranteed to be listed)
    await user.selectOptions(screen.getByRole("combobox"), "Europe/London");
    await user.clear(screen.getByLabelText(/first name/i));
    expect(next()).toBeDisabled();
    await user.type(screen.getByLabelText(/first name/i), "Al");
    await user.click(next());

    expect(next()).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /on my own/i }));
    await user.click(next());

    expect(next()).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /personal/i }));
    await user.click(next());

    expect(
      screen.getByRole("button", { name: "See my recommendations" }),
    ).toBeDisabled();
  });

  it("keeps answers when going Back and moves focus to the heading", async () => {
    const { user } = setup();
    await user.click(next());
    await waitFor(() => expect(heading(/brings you/i)).toHaveFocus());
    await user.click(screen.getByRole("radio", { name: /on my own/i }));
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Jaylen");
    await user.click(next());
    expect(screen.getByRole("radio", { name: /on my own/i })).toBeChecked();
  });

  it("uses toggle chips with aria-pressed, own areas first, others under More topics", async () => {
    const { user } = setup();
    await toStep4(user);
    const python = screen.getByRole("button", { name: "Python" });
    expect(python).toHaveAttribute("aria-pressed", "false");
    await user.click(python);
    expect(python).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("More topics")).toBeInTheDocument();
    expect(screen.queryByText("Not mapped")).not.toBeInTheDocument();
  });

  it("stays open on Escape and has no close button", async () => {
    const { user } = setup();
    await user.keyboard("{Escape}");
    expect(heading(/welcome/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
  });

  it("pre-fills the time zone from the browser when it is listed", () => {
    jest
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({ timeZone: "Asia/Tokyo" } as never);
    setup({ initialProfile: { first: "A", last: "B" } });
    expect(screen.getByRole("combobox")).toHaveValue("Asia/Tokyo");
  });

  it("restores saved answers from sessionStorage", () => {
    sessionStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ step: 1, draft: { first: "Saved", goal: "self" } }),
    );
    setup();
    expect(screen.getByRole("radio", { name: /on my own/i })).toBeChecked();
  });

  it("submits on See my recommendations and clears storage; a rejection keeps the answers", async () => {
    const { user, onSubmit } = setup();
    onSubmit.mockRejectedValueOnce(new Error("boom"));
    await toStep4(user);
    await user.click(screen.getByRole("button", { name: "Python" }));
    await user.click(
      screen.getByRole("button", { name: "See my recommendations" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't save/i,
    );
    expect(screen.getByRole("button", { name: "Python" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(sessionStorage.getItem(ONBOARDING_STORAGE_KEY)).not.toBeNull();

    await user.click(
      screen.getByRole("button", { name: "See my recommendations" }),
    );
    await waitFor(() =>
      expect(sessionStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull(),
    );
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        first: "Jaylen",
        goal: "career",
        focusAreas: ["technical"],
        interests: ["t1"],
      }),
    );
  });

  it("treats Enter on a valid step as Continue", async () => {
    const { user } = setup();
    await user.click(screen.getByLabelText(/last name/i));
    await user.keyboard("{Enter}");
    expect(heading(/brings you/i)).toBeInTheDocument();
  });
});
