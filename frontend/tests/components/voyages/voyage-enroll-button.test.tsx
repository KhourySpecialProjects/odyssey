"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoyageEnrollButton } from "@/components/voyages/voyage-enroll-button";

jest.mock("@/lib/requests/voyage-enrollment", () => ({
  enrollInVoyage: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// useTransition: let isPending be controlled per test
let mockIsPending = false;
jest.mock("react", () => {
  const actual = jest.requireActual("react");
  return {
    ...actual,
    useTransition: () => [
      mockIsPending,
      (fn: () => void) => {
        fn();
      },
    ],
  };
});

import { enrollInVoyage } from "@/lib/requests/voyage-enrollment";

describe("VoyageEnrollButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  describe("Not enrolled state", () => {
    it("renders Enroll in Voyage button when enrollment is null", () => {
      render(
        <VoyageEnrollButton
          voyageId={1}
          enrollment={null}
          completionPercentage={0}
        />,
      );

      expect(
        screen.getByRole("button", { name: /enroll in voyage/i }),
      ).toBeInTheDocument();
    });

    it("does not render Leave Voyage link when not enrolled", () => {
      render(
        <VoyageEnrollButton
          voyageId={1}
          enrollment={null}
          completionPercentage={0}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /leave voyage/i }),
      ).not.toBeInTheDocument();
    });

    it("calls enrollInVoyage with the voyageId on click", async () => {
      (enrollInVoyage as jest.Mock).mockResolvedValue({
        ok: true,
        error: null,
        data: { id: 5 },
      });

      render(
        <VoyageEnrollButton
          voyageId={42}
          enrollment={null}
          completionPercentage={0}
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /enroll in voyage/i }),
      );

      await waitFor(() => {
        expect(enrollInVoyage).toHaveBeenCalledWith(42);
      });
    });
  });

  describe("Enrolled, in progress state", () => {
    const inProgressEnrollment = {
      id: 5,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 40,
    };

    it("renders Continue Voyage button when enrolled and not complete", () => {
      render(
        <VoyageEnrollButton
          voyageId={1}
          enrollment={inProgressEnrollment}
          completionPercentage={40}
          firstIncompleteSlug="my-playlist"
        />,
      );

      expect(
        screen.getByRole("link", { name: /continue voyage/i }),
      ).toBeInTheDocument();
    });

    it("links to the first incomplete playlist slug", () => {
      const { container } = render(
        <VoyageEnrollButton
          voyageId={1}
          enrollment={inProgressEnrollment}
          completionPercentage={40}
          firstIncompleteSlug="my-playlist"
        />,
      );

      const link = container.querySelector('a[href="/p/my-playlist"]');
      expect(link).toBeInTheDocument();
    });

    it("shows progress badge with completion percentage", () => {
      render(
        <VoyageEnrollButton
          voyageId={1}
          enrollment={inProgressEnrollment}
          completionPercentage={40}
          firstIncompleteSlug="my-playlist"
        />,
      );

      expect(screen.getByText("40%")).toBeInTheDocument();
    });
  });

  describe("Enrolled, completed state", () => {
    const completedEnrollment = {
      id: 5,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 100,
    };

    it("renders Completed button when completion is 100%", () => {
      render(
        <VoyageEnrollButton
          voyageId={1}
          enrollment={completedEnrollment}
          completionPercentage={100}
        />,
      );

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it("the completed button is disabled", () => {
      render(
        <VoyageEnrollButton
          voyageId={1}
          enrollment={completedEnrollment}
          completionPercentage={100}
        />,
      );

      const button = screen.getByRole("button", { name: /completed/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Loading/pending state", () => {
    it("disables the enroll button while pending", () => {
      mockIsPending = true;

      render(
        <VoyageEnrollButton
          voyageId={1}
          enrollment={null}
          completionPercentage={0}
        />,
      );

      expect(screen.getByRole("button", { name: /enrolling/i })).toBeDisabled();
    });
  });
});
