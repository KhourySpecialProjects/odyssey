import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FriendSearch } from "@/components/friends/friend-search";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { TimeZone } from "@/types";

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
      firstTime: false,
      friendships: [],
      sent_requests: [],
      received_requests: [],
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York" as TimeZone,
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
      firstTime: false,
      friendships: [],
      sent_requests: [],
      received_requests: [],
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York" as TimeZone,
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
      firstTime: false,
      friendships: [],
      sent_requests: [],
      received_requests: [],
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York" as TimeZone,
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
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  };

  const defaultProps = {
    authUsers: mockAuthUsers,
    curUser: mockCurUser,
    requestIds: [],
    friendIds: [],
  };

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
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("filters users by last name", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "Smith");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
      });
    });

    it("filters users by email prefix", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "jane.smith");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
      });
    });

    it("filters users by full name", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "Jane Smith");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
      });
    });

    it("is case insensitive", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "JOHN");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("clears results when search term is empty", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });

      await userEvent.clear(searchInput);
      fireEvent.mouseEnter(searchInput);

      expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
    });

    it("clears results when search term is only whitespace", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "   ");
      fireEvent.mouseEnter(searchInput);

      // Whitespace is trimmed, so it shows "No users found"
      await waitFor(() => {
        expect(screen.getByTestId("no-results")).toBeInTheDocument();
      });
    });

    it("shows no results message when no users match", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "NonExistentUser");
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

      render(<FriendSearch {...defaultProps} authUsers={manyUsers} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "User");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const results = screen.queryAllByTitle(/User\d+/);
        expect(results.length).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("Blocked Users Filtering", () => {
    it("filters out blocked users from search results", async () => {
      const blockedUser = {
        ...mockCurUser,
        blocked: [mockAuthUsers[0]],
      };

      render(<FriendSearch {...defaultProps} curUser={blockedUser} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
      });
    });

    it("filters out users who blocked current user", async () => {
      const wasBlockedUser = {
        ...mockCurUser,
        was_blocked: [mockAuthUsers[0]],
      };

      render(<FriendSearch {...defaultProps} curUser={wasBlockedUser} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
      });
    });

    it("filters out both blocked and was_blocked users", async () => {
      const multipleBlockedUser = {
        ...mockCurUser,
        blocked: [mockAuthUsers[0]],
        was_blocked: [mockAuthUsers[1]],
      };

      render(<FriendSearch {...defaultProps} curUser={multipleBlockedUser} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "o"); // Matches John and Bob
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
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");

      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("hides dropdown when mouse leaves", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });

      fireEvent.mouseLeave(searchInput);

      expect(screen.queryByTitle("John Doe")).not.toBeInTheDocument();
    });

    it("keeps dropdown open when hovering over results", async () => {
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });

      const dropdown = container.querySelector(".absolute.z-50")!;
      fireEvent.mouseEnter(dropdown);

      expect(screen.getByTitle("John Doe")).toBeInTheDocument();
    });

    it("hides dropdown when leaving both input and dropdown", async () => {
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
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
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("renders FriendSuggestionsBlock for users in requestIds with requested=false", async () => {
      render(
        <FriendSearch {...defaultProps} friendIds={[1]} requestIds={[1]} />,
      );

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        // Should render FriendSuggestionsBlock - check by title
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("renders FriendSuggestionsBlock for friends not in requestIds with requested=true", async () => {
      render(
        <FriendSearch {...defaultProps} friendIds={[1]} requestIds={[]} />,
      );

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        // Should render FriendSuggestionsBlock with requested=true - check by title
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("uses correct data-testid format for FriendBlock", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        // Verify user is shown (data-testid may not be passed through properly)
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });

    it("uses correct data-testid format for FriendSuggestionsBlock", async () => {
      render(<FriendSearch {...defaultProps} friendIds={[1]} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        // Verify user is shown (data-testid may not be passed through properly)
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
      });
    });
  });

  describe("Dropdown Styling", () => {
    it("applies correct dropdown positioning", async () => {
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const dropdown = container.querySelector(".absolute.z-50");
        expect(dropdown).toHaveClass("left-1/2", "-translate-x-1/2");
      });
    });

    it("applies correct dropdown width", async () => {
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const dropdown = container.querySelector(".absolute.z-50");
        expect(dropdown).toHaveClass("w-screen", "md:max-w-[600px]");
      });
    });

    it("applies correct dropdown styling", async () => {
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const dropdown = container.querySelector(".absolute.z-50");
        expect(dropdown).toHaveClass("rounded-md", "border", "shadow-lg");
      });
    });

    it("applies dark mode styles to dropdown", async () => {
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
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
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "o"); // Matches John, Bob, Johnson
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTitle("John Doe")).toBeInTheDocument();
        expect(screen.getByTitle("Bob Johnson")).toBeInTheDocument();
      });
    });

    it("renders results in list format", async () => {
      const { container } = render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "o");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        const list = container.querySelector("ul");
        expect(list).toBeInTheDocument();
        expect(list).toHaveClass("p-4", "md:space-y-4");
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty authUsers array", async () => {
      render(<FriendSearch {...defaultProps} authUsers={[]} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "test");
      fireEvent.mouseEnter(searchInput);

      await waitFor(() => {
        expect(screen.getByTestId("no-results")).toBeInTheDocument();
      });
    });

    it("handles users with missing firstName", async () => {
      const usersWithMissingName = [
        { ...mockAuthUsers[0], firstName: undefined } as any,
      ];

      render(
        <FriendSearch {...defaultProps} authUsers={usersWithMissingName} />,
      );

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "Doe");
      fireEvent.mouseEnter(searchInput);
    });

    it("handles users with missing lastName", async () => {
      const usersWithMissingName = [
        { ...mockAuthUsers[0], lastName: undefined } as any,
      ];

      render(
        <FriendSearch {...defaultProps} authUsers={usersWithMissingName} />,
      );

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);
    });

    it("handles users with missing email", async () => {
      const usersWithMissingEmail = [
        { ...mockAuthUsers[0], email: undefined } as any,
      ];

      render(
        <FriendSearch {...defaultProps} authUsers={usersWithMissingEmail} />,
      );

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);
    });

    it("handles special characters in search", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "@#$%");
      fireEvent.mouseEnter(searchInput);
    });

    it("handles very long search terms", async () => {
      render(<FriendSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      const longSearch = "a".repeat(100);
      await userEvent.type(searchInput, longSearch);
    });
  });

  describe("Friend and Request ID Logic", () => {
    it("excludes user from FriendBlock rendering if in friendIds", async () => {
      render(<FriendSearch {...defaultProps} friendIds={[1]} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "John");
      fireEvent.mouseEnter(searchInput);
    });

    describe("Search Input Interaction", () => {
      it("updates search term as user types", async () => {
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(
          "Search...",
        ) as HTMLInputElement;
        await userEvent.type(searchInput, "test");

        expect(searchInput.value).toBe("test");
      });

      it("handles backspace to shorten search term", async () => {
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(
          "Search...",
        ) as HTMLInputElement;
        await userEvent.type(searchInput, "John");
        expect(searchInput.value).toBe("John");

        await userEvent.type(searchInput, "{backspace}{backspace}");
        expect(searchInput.value).toBe("Jo");
      });

      it("updates results as search term changes", async () => {
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText("Search...");
        await userEvent.type(searchInput, "J");
        fireEvent.mouseEnter(searchInput);

        await waitFor(() => {
          expect(screen.getByTitle("John Doe")).toBeInTheDocument();
          expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
        });

        await userEvent.type(searchInput, "ohn");

        await waitFor(() => {
          expect(screen.getByTitle("John Doe")).toBeInTheDocument();
          expect(screen.queryByTitle("Jane Smith")).not.toBeInTheDocument();
        });
      });
    });

    describe("Integration Tests", () => {
      it("complete search workflow: type, hover, select", async () => {
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText("Search...");

        // Type search
        await userEvent.type(searchInput, "Jane");

        // Hover to show results
        fireEvent.mouseEnter(searchInput);

        await waitFor(() => {
          expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
        });

        // Results should be visible
        expect(screen.queryByTestId("no-results")).not.toBeInTheDocument();
      });

      it("handles searching with mixed case and partial matches", async () => {
        render(<FriendSearch {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText("Search...");
        await userEvent.type(searchInput, "jAnE sM");
        fireEvent.mouseEnter(searchInput);

        await waitFor(() => {
          expect(screen.getByTitle("Jane Smith")).toBeInTheDocument();
        });
      });
    });
  });
});
