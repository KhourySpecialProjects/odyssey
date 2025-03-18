// Modified student-progress-list.test.tsx
import { render, screen } from "@testing-library/react";
import { StudentProgressList } from "@/components/admin/progress/student-progress-list";
import React from "react";

// Mock the Collapsible components
jest.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock the Card components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock the Progress component
jest.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) => <div>Progress: {value}%</div>,
}));

// Mock the Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

// Mock the URL methods
global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

describe("StudentProgressList", () => {
  const mockPlaylists = [
    {
      id: 1,
      name: "Test Playlist",
      slug: "test-playlist",
      authorized_users: [
        { id: 1, email: "student1@example.com", progress: 75 },
        { id: 2, email: "student2@example.com", progress: 30 },
      ],
    },
    {
      id: 2,
      name: "Another Playlist",
      slug: "another-playlist",
      authorized_users: [
        { id: 3, email: "student3@example.com", progress: 100 },
      ],
    },
  ];

  // Create a simplified test that doesn't rely on complex DOM interactions
  it("renders correctly with playlists", () => {
    render(<StudentProgressList playlists={mockPlaylists} />);

    // Check for playlist names
    expect(screen.getByText("Test Playlist")).toBeInTheDocument();
    expect(screen.getByText("Another Playlist")).toBeInTheDocument();

    // Check for student counts
    expect(screen.getByText("2 enrolled students")).toBeInTheDocument();
    expect(screen.getByText("1 enrolled student")).toBeInTheDocument();
  });

  it("renders a message when no playlists are available", () => {
    render(<StudentProgressList playlists={[]} />);

    expect(
      screen.getByText("You haven't created any private playlists yet"),
    ).toBeInTheDocument();
  });
});
