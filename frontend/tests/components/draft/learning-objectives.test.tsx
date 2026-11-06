import { render, fireEvent, screen } from "@testing-library/react";
import { LearningObjectives } from "@/components/draft/metadata/learning-objectives/learning-objectives";
import { updateDroplet } from "@/lib/requests/droplet";

jest.mock("@/lib/requests/droplet", () => ({
  updateDroplet: jest.fn().mockResolvedValue({ data: {} }),
}));
jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: () => ({ error: null, handleChange: jest.fn() }),
}));

describe("LearningObjectives paste", () => {
  const objectives = [{ id: 1, objective: "Learn React" }];
  const paste = (input: HTMLElement, text: string) =>
    fireEvent.paste(input, { clipboardData: { getData: () => text } });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves every pasted line in one update", () => {
    render(
      <LearningObjectives dropletId={7} learningObjectives={objectives} />,
    );

    const input = screen.getByPlaceholderText("New Learning Objective...");
    const notPrevented = paste(input, "- Learn React\n- Write tests\n2) Ship");

    expect(notPrevented).toBe(false);
    expect(updateDroplet).toHaveBeenCalledTimes(1);
    expect(updateDroplet).toHaveBeenCalledWith(7, {
      learningObjectives: ["Learn React", "Write tests", "Ship"],
    });
  });

  it("does not intercept a single-line paste", () => {
    render(
      <LearningObjectives dropletId={7} learningObjectives={objectives} />,
    );

    const input = screen.getByPlaceholderText("New Learning Objective...");
    const notPrevented = paste(input, "One line");

    expect(notPrevented).toBe(true);
    expect(updateDroplet).not.toHaveBeenCalled();
  });
});
