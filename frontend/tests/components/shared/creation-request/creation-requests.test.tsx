import { render, screen } from "@testing-library/react";
import { CreationRequests } from "@/components/shared/creation-request-manager/creation-requests";
import { fetchCreationRequests } from "@/lib/actions";
import { CreationRequest } from "@/types";

// Mock the actions
jest.mock("@/lib/actions", () => ({
  fetchCreationRequests: jest.fn(),
}));

// Mock the CreationRequestBlock component
jest.mock("@/components/shared/creation-request-manager/creation-request-block", () => ({
  CreationRequestBlock: jest.fn(({ request }) => (
    <div data-testid={`request-block-${request.id}`}>
      {request.user.firstName} {request.user.lastName}
    </div>
  )),
}));

const { CreationRequestBlock } = require("@/components/shared/creation-request-manager/creation-request-block");

describe("CreationRequests", () => {
  const mockRequests: CreationRequest[] = [
    {
      id: 1,
      motivation: "I want to teach React",
      dropletIdea: "React hooks tutorial",
      user: {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
    },
    {
      id: 2,
      motivation: "I love sharing knowledge",
      dropletIdea: "TypeScript best practices",
      user: {
        id: 2,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
      },
    },
    {
      id: 3,
      motivation: "Teaching is my passion",
      dropletIdea: "Web accessibility guide",
      user: {
        id: 3,
        firstName: "Bob",
        lastName: "Johnson",
        email: "bob@example.com",
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders section header and description", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue([]);

    render(await CreationRequests());

    expect(screen.getByText("Content Creation Requests")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The following individuals have requested to become a content creator."
      )
    ).toBeInTheDocument();
  });

  it("renders CreationRequestBlock for each request", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue(mockRequests);

    render(await CreationRequests());

    expect(screen.getByTestId("request-block-1")).toBeInTheDocument();
    expect(screen.getByTestId("request-block-2")).toBeInTheDocument();
    expect(screen.getByTestId("request-block-3")).toBeInTheDocument();
    expect(CreationRequestBlock).toHaveBeenCalledTimes(3);
  });

  it("passes correct request prop to each CreationRequestBlock", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue(mockRequests);

    render(await CreationRequests());

    expect(CreationRequestBlock).toHaveBeenCalledWith(
      expect.objectContaining({ request: mockRequests[0] }),
      expect.anything()
    );
    expect(CreationRequestBlock).toHaveBeenCalledWith(
      expect.objectContaining({ request: mockRequests[1] }),
      expect.anything()
    );
    expect(CreationRequestBlock).toHaveBeenCalledWith(
      expect.objectContaining({ request: mockRequests[2] }),
      expect.anything()
    );
  });

  it("displays message when there are no requests", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue([]);

    render(await CreationRequests());

    expect(
      screen.getByText("There are no access requests at this time.")
    ).toBeInTheDocument();
    expect(CreationRequestBlock).not.toHaveBeenCalled();
  });

  it("renders correct number of requests", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue(mockRequests);

    render(await CreationRequests());

    const requestBlocks = screen.getAllByTestId(/request-block-/);
    expect(requestBlocks).toHaveLength(3);
  });

  it("renders single request correctly", async () => {
    const singleRequest = [mockRequests[0]];
    (fetchCreationRequests as jest.Mock).mockResolvedValue(singleRequest);

    render(await CreationRequests());

    expect(screen.getByTestId("request-block-1")).toBeInTheDocument();
    expect(screen.queryByTestId("request-block-2")).not.toBeInTheDocument();
    expect(CreationRequestBlock).toHaveBeenCalledTimes(1);
  });

  it("calls fetchCreationRequests on render", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue([]);

    render(await CreationRequests());

    expect(fetchCreationRequests).toHaveBeenCalledTimes(1);
  });

  it("applies correct styling to container", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue(mockRequests);

    const { container } = render(await CreationRequests());

    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();

    const requestsContainer = container.querySelector(
      ".rounded-md.bg-slate-100"
    );
    expect(requestsContainer).toBeInTheDocument();
    expect(requestsContainer).toHaveClass(
      "mt-4",
      "rounded-md",
      "bg-slate-100",
      "p-4",
      "dark:bg-slate-800"
    );
  });

  it("renders list with correct styling when requests exist", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue(mockRequests);

    const { container } = render(await CreationRequests());

    const list = container.querySelector("ul");
    expect(list).toBeInTheDocument();
    expect(list).toHaveClass(
      "divide-y",
      "divide-slate-200",
      "md:space-y-4",
      "dark:divide-slate-700"
    );
  });

  it("passes correct props to each CreationRequestBlock", async () => {
  (fetchCreationRequests as jest.Mock).mockResolvedValue(mockRequests);

  render(await CreationRequests());

  mockRequests.forEach((request) => {
    expect(CreationRequestBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ id: request.id }),
      }),
      expect.anything()
    );
  });
});

  it("handles empty array from fetchCreationRequests", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue([]);

    const { container } = render(await CreationRequests());

    expect(
      screen.getByText("There are no access requests at this time.")
    ).toBeInTheDocument();
    expect(container.querySelector("ul")).not.toBeInTheDocument();
  });

  it("renders header with correct styling", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue([]);

    render(await CreationRequests());

    const header = screen.getByText("Content Creation Requests");
    expect(header.tagName).toBe("H1");
    expect(header).toHaveClass("font-bold", "dark:text-slate-300");
  });

  it("renders description with correct styling", async () => {
    (fetchCreationRequests as jest.Mock).mockResolvedValue([]);

    render(await CreationRequests());

    const description = screen.getByText(
      "The following individuals have requested to become a content creator."
    );
    expect(description.tagName).toBe("P");
    expect(description).toHaveClass("dark:text-slate-300");
  });

  it("handles large number of requests", async () => {
    const manyRequests = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      motivation: `Motivation ${i + 1}`,
      dropletIdea: `Idea ${i + 1}`,
      user: {
        id: i + 1,
        firstName: `User${i + 1}`,
        lastName: `Last${i + 1}`,
        email: `user${i + 1}@example.com`,
      },
    }));

    (fetchCreationRequests as jest.Mock).mockResolvedValue(manyRequests);

    render(await CreationRequests());

    expect(CreationRequestBlock).toHaveBeenCalledTimes(50);
    const requestBlocks = screen.getAllByTestId(/request-block-/);
    expect(requestBlocks).toHaveLength(50);
  });
});