import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OnboardingQuiz } from "@/components/onboarding/onboarding-quiz";
import { tagsToTopics } from "@/lib/onboarding-topics";

const topics = tagsToTopics([
  { id: 11, documentId: "t1", name: "Python" },
  { id: 12, documentId: "t2", name: "Resumes" },
  { id: 13, documentId: "t3", name: "Ethics" },
  { id: 14, documentId: "t4", name: "Not mapped" },
]);
const initial = {
  firstName: "Jaylen",
  lastName: "Zeng",
  timeZone: "America/Chicago" as const,
};

const next = () =>
  screen.getByRole("button", { name: /^(continue|see my recommendations)/i });
const heading = (name: RegExp) => screen.getByRole("heading", { name });
type User = ReturnType<typeof userEvent.setup>;

function setup(props = {}) {
  const onSubmit = jest.fn().mockResolvedValue({ ok: true });
  const user = userEvent.setup();
  render(
    <OnboardingQuiz
      topics={topics}
      initial={initial}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { user, onSubmit };
}

async function toStep(user: User, n: number) {
  if (n > 1) {
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: /co-op or a job/i }));
  }
  if (n > 2) {
    await user.click(next());
    await user.click(screen.getByRole("button", { name: /^technical/i }));
  }
  if (n > 3) await user.click(next());
}

describe("OnboardingQuiz", () => {
  it.each([
    ["first name", /first name/i, /enter your first name/i],
    ["last name", /last name/i, /enter your last name/i],
  ])("step 1 requires %s", async (_n, field, message) => {
    const { user } = setup();
    await user.clear(screen.getByLabelText(field));
    await user.click(next());
    expect(screen.getByLabelText(field)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText(field)).toHaveAccessibleDescription(message);
    expect(heading(/welcome/i)).toBeInTheDocument();
  });

  it("step 1 requires a time zone but not a bio", async () => {
    jest
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({ timeZone: "Mars/Base" } as never);
    const { user } = setup({ initial: { firstName: "A", lastName: "B" } });
    await user.click(next());
    expect(screen.getByRole("alert")).toHaveTextContent(/choose a time zone/i);
    await user.selectOptions(screen.getByRole("combobox"), "Europe/London");
    await user.click(next());
    expect(heading(/brings you/i)).toBeInTheDocument();
  });

  it("pre-fills the time zone from the browser when it is listed", () => {
    jest
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({ timeZone: "Asia/Tokyo" } as never);
    setup({ initial: { firstName: "A", lastName: "B" } });
    expect(screen.getByRole("combobox")).toHaveValue("Asia/Tokyo");
  });

  it("keeps Next enabled, shows the error and advances only once valid", async () => {
    const { user } = setup();
    await user.click(next());
    await waitFor(() => expect(heading(/brings you/i)).toHaveFocus());

    await user.click(next());
    expect(next()).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/pick one/i);
    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(heading(/brings you/i)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /on my own/i }));
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(next());

    await user.click(next());
    expect(screen.getByRole("alert")).toHaveTextContent(/at least one area/i);
    await user.click(screen.getByRole("button", { name: /^personal/i }));
    await user.click(next());
    await waitFor(() => expect(heading(/pick a few topics/i)).toHaveFocus());

    await user.click(next());
    expect(screen.getByRole("alert")).toHaveTextContent(/at least one topic/i);
  });

  it("keeps answers when going Back", async () => {
    const { user } = setup();
    await toStep(user, 3);
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(
      screen.getByRole("radio", { name: /co-op or a job/i }),
    ).toBeChecked();
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Jaylen");
    await user.click(next());
    await user.click(next());
    expect(screen.getByRole("button", { name: /^technical/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("has no Skip button, shows the footer and has no close button", () => {
    setup();
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
    expect(screen.getByText(/takes about a minute/i)).toBeInTheDocument();
  });

  it("uses toggle chips with aria-pressed and lists the chosen areas first", async () => {
    const { user } = setup();
    await toStep(user, 4);
    const python = screen.getByRole("button", { name: "Python" });
    expect(python).toHaveAttribute("aria-pressed", "false");
    await user.click(python);
    expect(python).toHaveAttribute("aria-pressed", "true");
    const groups = screen.getAllByRole("group", {
      name: /^(Technical|Professional|Personal)$/,
    });
    expect(groups[0]).toHaveAccessibleName("Technical");
    expect(screen.getByText("More topics")).toBeInTheDocument();
    expect(screen.queryByText("Not mapped")).not.toBeInTheDocument();
  });

  it("submits tag ids as numbers; a failed save shows the error and keeps answers", async () => {
    const { user, onSubmit } = setup();
    onSubmit.mockResolvedValueOnce({ ok: false, error: "Server said no" });
    await toStep(user, 4);
    await user.click(screen.getByRole("button", { name: "Python" }));
    await user.click(next());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Server said no",
    );
    expect(screen.getByRole("button", { name: "Python" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(next());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        firstName: "Jaylen",
        lastName: "Zeng",
        goal: "career",
        focusAreas: ["technical"],
        interestTagIds: [11],
      }),
    );
  });

  it("shows Saving… and disables the button while pending", async () => {
    let finish: (r: { ok: true }) => void = () => {};
    const { user } = setup({
      onSubmit: jest.fn(() => new Promise((r) => (finish = r))),
    });
    await toStep(user, 4);
    await user.click(screen.getByRole("button", { name: "Python" }));
    await user.click(next());
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    finish({ ok: true });
    await waitFor(() => expect(next()).toBeEnabled());
  });

  it("stays open on Escape", async () => {
    const { user } = setup();
    await user.keyboard("{Escape}");
    expect(heading(/welcome/i)).toBeInTheDocument();
  });
});
