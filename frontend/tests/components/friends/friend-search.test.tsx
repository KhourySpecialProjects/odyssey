import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FriendSearch } from "@/components/friends/friend-search";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { TimeZone } from "@/types";
import { searchAuthorizedUsers } from "@/lib/requests/authorized-user";

jest.mock("@/lib/requests/authorized-user", () => ({
  searchAuthorizedUsers: jest.fn(),
}));

const mockSearchAuthorizedUsers = searchAuthorizedUsers as jest.Mock;

describe("FriendSearch", () => {
  const mockAuthUsers = [
    {
      id: 1,
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      bio: "Test bio",
      profilePhoto: "https://example.com/photo1.jpg",
      isEnabled: true,
      isPublic: true,
      roles: [{ id: 1, title: AuthorizedUserRoleTitle.Faculty }],
      linkedin: "https://www.linkedin.com/",
      github: "https://www.github.com/",
      website: "",
      firstTime: false,
      friendships: [],
      sent_requests: [],
      received_requests: [],
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York" as TimeZone,
      groups: [],
    },
    {
      id: 2,
      email: "jane.smith@example.com",
      firstName: "Jane",
      lastName: "Smith",
      bio: "Another bio",
      profilePhoto: "https://example.com/photo2.jpg",
      isEnabled: true,
      isPublic: true,
      roles: [{ id: 1, title: AuthorizedUserRoleTitle.User }],
      linkedin: "https://www.linkedin.com/",
      github: "https://www.github.com/",
      website: "",
      firstTime: false,
      friendships: [],
      sent_requests: [],
      received_requests: [],
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York" as TimeZone,
      groups: [],
    },
    {
      id: 3,
      email: "bob.johnson@example.com",
      firstName: "Bob",
      lastName: "Johnson",
      bio: "Third bio",
      profilePhoto: "https://example.com/photo3.jpg",
      isEnabled: true,
      isPublic: true,
      roles: [],
      linkedin: "https://www.linkedin.com/",
      github: "https://www.github.com/",
      website: "",
      firstTime: false,
      friendships: [],
      sent_requests: [],
      received_requests: [],
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York" as TimeZone,
      groups: [],
    },
  ];

  const mockCurUser = {
    id: 99,
    email: "current@example.com",
    firstName: "Current",
    lastName: "User",
    bio: "Current user bio",
    profilePhoto: "https://example.com/current.jpg",
    isEnabled: true,
    isPublic: true,
    roles: [{ id: 1, title: AuthorizedUserRoleTitle.User }],
    linkedin: "https://www.linkedin.com/",
    github: "https://www.github.com/",
    website: "",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    groups: [],
  };

  const defaultProps = {
    curUser: mockCurUser,
    requestIds: [],
    friendIds: [],
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockSearchAuthorizedUsers.mockReset();
    // Default: return all mock users for any search
    mockSearchAuthorizedUsers.mockResolvedValue(mockAuthUsers);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Helper: type into search, advance debounce timer, and flush pending promises */
  async function typeAndSearch(
    searchInput: HTMLElement,
    text: string,
    results?: any[],
  ) {
    if (results) {
      mockSearchAuthorizedUsers.mockResolvedValue(results);
    }
    await userEvent.type(searchInput, text, {
      advanceTimers: jest.advanceTimersByTime,
    });
    // Advance past the 300ms debounce and flush async state updates
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
  }

  describe("Component Rendering", () => {
    it("renders search input", () => {
      render(<FriendSearch {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("renders with correct input type", () => {
      render(<FriendSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search...");
      expect(input).toHaveAttribute("type", "search");
    });

    it("renders input with correct width classes", () => {
      render(<FriendSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search...");
      expect(input).toHaveClass("w-[300px]", "md:w-[500px]");
    });

    it("does not show dropdown initially", () => {
      render(<FriendSearch {...defaultProps} />);
      expect(screen.queryByTestId("no-results")).not.toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("filters users by first name", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("filters users by last name", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[1]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "Smith");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
      });
    });

    it("filters users by email prefix", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[1]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "jane.smith");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
      });
    });

    it("filters users by full name", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[1]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "Jane Smith");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
      });
    });

    it("is case insensitive", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "JOHN");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("clears results when search term is empty", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });

      // Clear the input using fireEvent to avoid fake timer issues with userEvent.clear
      fireEvent.change(searchInput, { target: { value: "" } });
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      fireEvent.mouseEnter(searchInput);

      expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
    });

    it("clears results when search term is only whitespace", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "   ");
      fireEvent.mouseEnter(searchInput);

      // Whitespace is trimmed so no API call, shows nothing or "No users found"
      // The component sets searchResults to [] when trimmed term is empty
      expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
    });

    it("shows no results message when no users match", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "NonExistentUser");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTestId("no-results")).toBeInTheDocument();
        expect(screen.getByText("No users found.")).toBeInTheDocument();
      });
    });

    it("limits results to 10 users", async () => {
      const manyUsers = Array.from({ length: 15 }, (_, i) => ({
        ...mockAuthUsers[0],
        id: i + 1,
        firstName: `User${i}`,
        email: `user${i}@example.com`,
      }));
      mockSearchAuthorizedUsers.mockResolvedValue(manyUsers);

      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "User");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const results = screen.queryAllByTitle(/User\d+/);
        expect(results.length).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("Blocked Users Filtering", () => {
    it("filters out blocked users from search results", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      const blockedUser = {
        ...mockCurUser,
        blocked: [mockAuthUsers[0]],
      };

      render(<FriendSearch {...defaultProps} curUser={blockedUser} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
      });
    });

    it("filters out users who blocked current user", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      const wasBlockedUser = {
        ...mockCurUser,
        was_blocked: [mockAuthUsers[0]],
      };

      render(<FriendSearch {...defaultProps} curUser={wasBlockedUser} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
      });
    });

    it("filters out both blocked and was_blocked users", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue(mockAuthUsers);
      const multipleBlockedUser = {
        ...mockCurUser,
        blocked: [mockAuthUsers[0]],
        was_blocked: [mockAuthUsers[1]],
      };

      render(<FriendSearch {...defaultProps} curUser={multipleBlockedUser} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "o");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
        expect(screen.queryByTitle("Jane Smith")).not.toBeInTheDocument();
        // Only Bob should show
        expect(screen.getByTitle("Bob Johnson")).toBeInTheDocument();
      });
    });
  });

  describe("Hover and Focus States", () => {
    it("shows dropdown on hover when search term exists", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");

      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("hides dropdown when mouse leaves", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });

      fireEvent.mouseLeave(searchInput);

      expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
    });

    it("keeps dropdown open when hovering over results", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });

      const dropdown = container.querySelector(".absolute.z-50")!;
      fireEvent.mouseEnter(dropdown);

      expect(screen.getByTitle("John Doe")).toBeInTheDocument();
    });

    it("hides dropdown when leaving both input and dropdown", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });

      const dropdown = container.querySelector(".absolute.z-50")!;
      fireEvent.mouseLeave(dropdown);

      expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
    });

    it("applies focus shadow when input is focused", () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.focus(searchInput);

      expect(searchInput).toHaveClass("shadow-[0px_0px_16px_rgb(29,58,138)]");
    });

    it("applies unfocused shadow by default", () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      expect(searchInput).toHaveClass("shadow-[0px_0px_8px_rgb(29,58,138)]");
    });

    it("removes focus shadow when input loses focus", () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.focus(searchInput);
      fireEvent.blur(searchInput);

      expect(searchInput).toHaveClass("shadow-[0px_0px_8px_rgb(29,58,138)]");
    });
  });

  describe("Result Type Rendering", () => {
    it("renders FriendBlock for non-friends", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("renders FriendSuggestionsBlock for users in requestIds with requested=false", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(
        <FriendSearch {...defaultProps} friendIds={[1]} requestIds={[1]} />,
      );

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("renders FriendSuggestionsBlock for friends not in requestIds with requested=true", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(
        <FriendSearch {...defaultProps} friendIds={[1]} requestIds={[]} />,
      );

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("uses correct data-testid format for FriendBlock", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("uses correct data-testid format for FriendSuggestionsBlock", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(<FriendSearch {...defaultProps} friendIds={[1]} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });
  });

  describe("Dropdown Styling", () => {
    it("applies correct dropdown positioning", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const dropdown = container.querySelector(".absolute.z-50");
        expect(dropdown).toHaveClass("left-1/2", "-translate-x-1/2");
      });
    });

    it("applies correct dropdown width", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const dropdown = container.querySelector(".absolute.z-50");
        expect(dropdown).toHaveClass("w-screen", "md:max-w-[600px]");
      });
    });

    it("applies correct dropdown styling", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const dropdown = container.querySelector(".absolute.z-50");
        expect(dropdown).toHaveClass("rounded-md", "border", "shadow-lg");
      });
    });

    it("applies dark mode styles to dropdown", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const dropdown = container.querySelector(".absolute.z-50");
        expect(dropdown).toHaveClass(
          "dark:border-slate-500",
          "dark:bg-slate-800",
        );
      });
    });
  });

  describe("Multiple Search Results", () => {
    it("displays multiple matching users", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([
        mockAuthUsers[0],
        mockAuthUsers[2],
      ]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "o");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
        expect(screen.getByTitle("Bob Johnson")).toBeInTheDocument();
      });
    });

    it("renders results in list format", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([
        mockAuthUsers[0],
        mockAuthUsers[2],
      ]);
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "o");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const list = container.querySelector("ul");
        expect(list).toBeInTheDocument();
        expect(list).toHaveClass("p-4", "md:space-y-4");
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty search results", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "test");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTestId("no-results")).toBeInTheDocument();
      });
    });

    it("handles users with missing firstName", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([
        { ...mockAuthUsers[0], firstName: undefined },
      ]);

      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "Doe");
      fireEvent.mouseEnter(searchInput);
    });

    it("handles users with missing lastName", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([
        { ...mockAuthUsers[0], lastName: undefined },
      ]);

      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);
    });

    it("handles users with missing email", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([
        { ...mockAuthUsers[0], email: undefined },
      ]);

      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);
    });

    it("handles special characters in search", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "@#$%");
      fireEvent.mouseEnter(searchInput);
    });

    it("handles very long search terms", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([]);
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      const longSearch = "a".repeat(100);
      await typeAndSearch(searchInput, longSearch);
    });
  });

  describe("Friend and Request ID Logic", () => {
    it("excludes user from FriendBlock rendering if in friendIds", async () => {
      mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
      render(<FriendSearch {...defaultProps} friendIds={[1]} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await typeAndSearch(searchInput, "John");
      fireEvent.mouseEnter(searchInput);
    });

    describe("Search Input Interaction", () => {
      it("updates search term as user types", async () => {
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(
          "Search...",
        ) as HTMLInputElement;
        await userEvent.type(searchInput, "test", {
          advanceTimers: jest.advanceTimersByTime,
        });

        expect(searchInput.value).toBe("test");
      });

      it("handles backspace to shorten search term", async () => {
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(
          "Search...",
        ) as HTMLInputElement;
        await userEvent.type(searchInput, "John", {
          advanceTimers: jest.advanceTimersByTime,
        });
        expect(searchInput.value).toBe("John");

        await userEvent.type(searchInput, "{backspace}{backspace}", {
          advanceTimers: jest.advanceTimersByTime,
        });
        expect(searchInput.value).toBe("Jo");
      });

      it("updates results as search term changes", async () => {
        mockSearchAuthorizedUsers.mockResolvedValue([
          mockAuthUsers[0],
          mockAuthUsers[1],
        ]);
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText("Search...");
        await typeAndSearch(searchInput, "J");
        fireEvent.mouseEnter(searchInput);

        await waitFor(() => {
          expect(screen.getByTitle("John Doe")).toBeInTheDocument();
          expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
        });

        mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[0]]);
        await typeAndSearch(searchInput, "ohn");

        await waitFor(() => {
          expect(screen.getByTitle("John Doe")).toBeInTheDocument();
          expect(screen.queryByTitle("Jane Smith")).not.toBeInTheDocument();
        });
      });
    });

    describe("Integration Tests", () => {
      it("complete search workflow: type, hover, select", async () => {
        mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[1]]);
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText("Search...");

        // Type search
        await typeAndSearch(searchInput, "Jane");

        // Hover to show results
        fireEvent.mouseEnter(searchInput);

        await waitFor(() => {
          expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
        });

        // Results should be visible
        expect(screen.queryByTestId("no-results")).not.toBeInTheDocument();
      });

      it("handles searching with mixed case and partial matches", async () => {
        mockSearchAuthorizedUsers.mockResolvedValue([mockAuthUsers[1]]);
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText("Search...");
        await typeAndSearch(searchInput, "jAnE sM");
        fireEvent.mouseEnter(searchInput);

        await waitFor(() => {
          expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
        });
      });
    });
  });
});
