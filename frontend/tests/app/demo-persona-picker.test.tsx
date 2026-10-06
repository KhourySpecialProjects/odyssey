import { fireEvent, render, screen } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { DemoPersonaPicker } from "@/app/(general)/auth/login/demo-persona-picker";

jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));

const personas = [
  {
    email: "admin1@demo.odyssey.test",
    name: "Admin 1",
    role: "System Admin",
    bio: "Runs the platform.",
  },
  {
    email: "student1@demo.odyssey.test",
    name: "Student 1",
    role: "Student",
    bio: "Keeps up with every due date.",
  },
];
const others = [
  {
    email: "student4@demo.odyssey.test",
    name: "Student 4",
    role: "Student",
    bio: null,
  },
  {
    email: "student5@demo.odyssey.test",
    name: "Student 5",
    role: "Student",
    bio: null,
  },
];

describe("DemoPersonaPicker", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows each persona with its role and bio", () => {
    render(<DemoPersonaPicker personas={personas} others={others} />);

    expect(screen.getByText("Admin 1")).toBeInTheDocument();
    expect(screen.getByText("System Admin")).toBeInTheDocument();
    expect(
      screen.getByText("Keeps up with every due date."),
    ).toBeInTheDocument();
  });

  it("logs in as the persona you pick", () => {
    render(<DemoPersonaPicker personas={personas} others={others} />);

    fireEvent.click(
      screen.getByRole("button", { name: /log in as student 1/i }),
    );

    expect(signIn).toHaveBeenCalledWith("demo", {
      email: "student1@demo.odyssey.test",
      callbackUrl: "/explore",
    });
  });

  it("logs in as a background student picked from the list", () => {
    render(<DemoPersonaPicker personas={personas} others={others} />);

    fireEvent.change(screen.getByLabelText(/another student/i), {
      target: { value: "student5@demo.odyssey.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /log in as this student/i }),
    );

    expect(signIn).toHaveBeenCalledWith("demo", {
      email: "student5@demo.odyssey.test",
      callbackUrl: "/explore",
    });
  });
});
