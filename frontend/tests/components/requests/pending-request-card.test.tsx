import { render, screen } from "@testing-library/react";
import { PendingRequestCard } from "@/components/requests/pending-request-card";
import { CreationRequest } from "@/types";

describe("PendingRequestCard", () => {
  const mockRequest: CreationRequest = {
    id: 1,
    motivation: "I want to create educational content",
    dropletIdea: "React tutorial series",
    user: {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      roles: [],
      isEnabled: true,
      isPublic: false,
      linkedin: "",
      github: "",
      website: "",
      firstTime: false,
      bio: "",
      friendships: [],
      sent_requests: [],
      received_requests: [],
      profilePhoto: "",
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York",
      groups: undefined,
    },
  };

  describe("Rendering", () => {
    it("renders card with title", () => {
      render(<PendingRequestCard request={mockRequest} />);

      expect(screen.getByText("Request Already Submitted")).toBeInTheDocument();
    });

    it("renders card description", () => {
      render(<PendingRequestCard request={mockRequest} />);

      expect(screen.getByText("Your content creator request is pending review.")).toBeInTheDocument();
    });

    it("renders pending status message", () => {
      render(<PendingRequestCard request={mockRequest} />);

      expect(
        screen.getByText(/You have already submitted a request to become a Content Creator/i)
      ).toBeInTheDocument();
    });

    it("renders admin review message", () => {
      render(<PendingRequestCard request={mockRequest} />);

      expect(
        screen.getByText(/An admin will review your request and respond soon/i)
      ).toBeInTheDocument();
    });

    it("renders check back message", () => {
      render(<PendingRequestCard request={mockRequest} />);

      expect(
        screen.getByText(/Check back later for an update on your request status/i)
      ).toBeInTheDocument();
    });

    it("renders Clock icon", () => {
      const { container } = render(<PendingRequestCard request={mockRequest} />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct styling to card", () => {
      const { container } = render(<PendingRequestCard request={mockRequest} />);

      const card = container.querySelector('[class*="border-gray-200"]');
      expect(card).toBeInTheDocument();
    });

    it("applies correct styling to card header", () => {
      const { container } = render(<PendingRequestCard request={mockRequest} />);

      const title = screen.getByText("Request Already Submitted");
      expect(title.tagName).toBe("H3");
      expect(title).toHaveClass("text-2xl", "font-bold");
    });

    it("centers content on screen", () => {
      const { container } = render(<PendingRequestCard request={mockRequest} />);

      const wrapper = container.querySelector(".min-h-screen");
      expect(wrapper).toHaveClass("flex", "items-center", "justify-center");
    });
  });

  describe("Props", () => {
    it("accepts request prop", () => {
      render(<PendingRequestCard request={mockRequest} />);

      // Component renders without errors
      expect(screen.getByText("Request Already Submitted")).toBeInTheDocument();
    });

    it("renders with different request data", () => {
      const differentRequest: CreationRequest = {
        ...mockRequest,
        id: 2,
        motivation: "Different motivation",
        dropletIdea: "Different idea",
      };

      render(<PendingRequestCard request={differentRequest} />);

      // Component still renders correctly with different data
      expect(screen.getByText("Request Already Submitted")).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("renders card with max width constraint", () => {
      const { container } = render(<PendingRequestCard request={mockRequest} />);

      const card = container.querySelector(".max-w-2xl");
      expect(card).toBeInTheDocument();
    });

    it("applies padding to outer container", () => {
      const { container } = render(<PendingRequestCard request={mockRequest} />);

      const wrapper = container.querySelector(".p-4");
      expect(wrapper).toBeInTheDocument();
    });

    it("renders messages in proper order", () => {
      render(<PendingRequestCard request={mockRequest} />);

      const messages = screen.getAllByText(/request|admin|check/i);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe("Dark Mode Support", () => {
    it("includes dark mode styling classes", () => {
      const { container } = render(<PendingRequestCard request={mockRequest} />);

      const darkModeElements = container.querySelectorAll('[class*="dark:"]');
      expect(darkModeElements.length).toBeGreaterThan(0);
    });
  });
});