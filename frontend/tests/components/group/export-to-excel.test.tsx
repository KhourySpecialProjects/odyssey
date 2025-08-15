import { render, screen, fireEvent } from "@testing-library/react";
import { GroupProgressGrid } from "@/components/group/group-progress-grid";
import {
  AuthorizedUser,
  DropletStatus,
  DropletType,
  FocusArea,
  Tag,
  Group,
  Droplet,
  Lesson,
} from "@/types";

// Mock the XLSX library
jest.mock("xlsx-js-style", () => ({
  utils: {
    aoa_to_sheet: jest.fn(),
    decode_range: jest.fn(),
    encode_cell: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

// Import the mocked modules
import * as XLSX from "xlsx-js-style";

const mockAuthUser1: AuthorizedUser = {
  id: 1,
  email: "user1@test.com",
  roles: [],
  isEnabled: true,
  linkedin: "",
  github: "",
  firstTime: false,
  firstName: "John",
  lastName: "Doe",
  bio: "",
  friendships: [],
  sent_requests: [],
  received_requests: [],
  profilePhoto: "",
  blocked: [],
  was_blocked: [],
  timeZone: "America/New_York",
};

const mockAuthUser2: AuthorizedUser = {
  id: 2,
  email: "user2@test.com",
  roles: [],
  isEnabled: true,
  linkedin: "",
  github: "",
  firstTime: false,
  firstName: "Jane",
  lastName: "Smith",
  bio: "",
  friendships: [],
  sent_requests: [],
  received_requests: [],
  profilePhoto: "",
  blocked: [],
  was_blocked: [],
  timeZone: "America/New_York",
};

const mockAuthUser3: AuthorizedUser = {
  id: 3,
  email: "user3@test.com",
  roles: [],
  isEnabled: true,
  linkedin: "",
  github: "",
  firstTime: false,
  firstName: "",
  lastName: "",
  bio: "",
  friendships: [],
  sent_requests: [],
  received_requests: [],
  profilePhoto: "",
  blocked: [],
  was_blocked: [],
  timeZone: "America/New_York",
};

const mockLesson1: Lesson = {
  id: 1,
  name: "Lesson 1",
  slug: "lesson-1",
  blocks: [],
  droplets: [],
  droplet_lessons: [],
  notes: [],
};

const mockLesson2: Lesson = {
  id: 2,
  name: "Lesson 2",
  slug: "lesson-2",
  blocks: [],
  droplets: [],
  droplet_lessons: [],
  notes: [],
};

const mockDroplet1: Droplet = {
  id: 1,
  name: "Test Droplet 1",
  slug: "test-droplet-1",
  isHidden: false,
  focusArea: "personal" as FocusArea,
  type: "knowledge" as DropletType,
  tags: [{ id: 1, name: "React" }] as Tag[],
  learningObjectives: [],
  status: "published" as DropletStatus,
  droplet_lessons: [],
  lessons: [mockLesson1, mockLesson2],
};

const mockDroplet2: Droplet = {
  id: 2,
  name: "Test Droplet 2",
  slug: "test-droplet-2",
  isHidden: false,
  focusArea: "professional" as FocusArea,
  type: "skill" as DropletType,
  tags: [{ id: 2, name: "TypeScript" }] as Tag[],
  learningObjectives: [],
  status: "published" as DropletStatus,
  droplet_lessons: [],
  lessons: [mockLesson1],
};

const mockGroup: Group = {
  id: 1,
  groupName: "Test Group",
  slug: "test-group",
  description: "A test group",
  semester: "Spring 2025",
  isArchived: false,
  members: [mockAuthUser1, mockAuthUser2, mockAuthUser3],
  droplets: [mockDroplet1, mockDroplet2],
  playlists: [],
};

// Update the mock statuses to include completion dates
const mockStatuses: Record<string, { completionPercentage: number, completionDate: Date | undefined }> = {
  "1-1": { completionPercentage: 50, completionDate: undefined }, // User 1, Droplet 1: 50%
  "1-2": { completionPercentage: 100, completionDate: new Date("2025-01-10T14:30:00.000Z") }, // User 1, Droplet 2: 100%
  "2-1": { completionPercentage: 0, completionDate: undefined }, // User 2, Droplet 1: 0%
  "2-2": { completionPercentage: 100, completionDate: new Date("2025-01-12T09:15:00.000Z") }, // User 2, Droplet 2: 100%
  "3-1": { completionPercentage: 25, completionDate: undefined }, // User 3, Droplet 1: 25%
  "3-2": { completionPercentage: 75, completionDate: undefined }, // User 3, Droplet 2: 75%
};

describe("GroupProgressGrid Excel Export", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock XLSX functions
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue({
      "!ref": "A1:D4",
    });
    (XLSX.utils.decode_range as jest.Mock).mockReturnValue({
      s: { r: 0, c: 0 },
      e: { r: 3, c: 3 },
    });
    (XLSX.utils.encode_cell as jest.Mock).mockImplementation(({ r, c }) => {
      const col = String.fromCharCode(65 + c);
      return `${col}${r + 1}`;
    });
    (XLSX.utils.book_new as jest.Mock).mockReturnValue({});
    (XLSX.utils.book_append_sheet as jest.Mock).mockReturnValue({});
    (XLSX.writeFile as jest.Mock).mockImplementation(() => {});

    // Mock Date to return a consistent timestamp
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-15T15:30:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the export button", async () => {
    render(<GroupProgressGrid group={mockGroup} statuses={mockStatuses} />);

    // Wait for the component to load and render
    await screen.findByText("Download as Excel");

    expect(screen.getByText("Download as Excel")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download as excel/i }),
    ).toBeInTheDocument();
  });

  it("calls XLSX functions when export button is clicked", async () => {
    render(<GroupProgressGrid group={mockGroup} statuses={mockStatuses} />);

    // Wait for the component to load
    await screen.findByText("Download as Excel");

    // Click the export button
    fireEvent.click(screen.getByText("Download as Excel"));

    // Verify XLSX functions were called
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      {},
      expect.any(Object),
      "Progress",
    );
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      {},
      "Test_Group_progress_report_1_15_2025.xlsx",
    );
  });

  it("creates correct data structure for Excel export with completion date columns", async () => {
    render(<GroupProgressGrid group={mockGroup} statuses={mockStatuses} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Check that aoa_to_sheet was called with the correct data structure including completion dates
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 10:30",
        "",
        "Test Droplet 1 (1)",
        "Completion Date",
        "Test Droplet 2 (2)",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 50, "", 100, "01/10/2025 09:30"],
      ["user2@test.com", "Jane Smith", 0, "", 100, "01/12/2025 04:15"],
      ["user3@test.com", "N/A", 25, "", 75, ""],
    ]);
  });

  it("handles groups with no members", async () => {
    const groupWithNoMembers = {
      ...mockGroup,
      members: [],
    };

    render(<GroupProgressGrid group={groupWithNoMembers} statuses={{}} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Should still call XLSX functions but with only header row
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 10:30",
        "",
        "Test Droplet 1 (1)",
        "Test Droplet 2 (2)",
      ],
    ]);
  });

  it("handles groups with no droplets", async () => {
    const groupWithNoDroplets = {
      ...mockGroup,
      droplets: [],
    };

    render(<GroupProgressGrid group={groupWithNoDroplets} statuses={{}} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Should still call XLSX functions but with only member columns
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Recorded on: 1/15/2025 10:30", ""],
      ["user1@test.com", "John Doe"],
      ["user2@test.com", "Jane Smith"],
      ["user3@test.com", "N/A"],
    ]);
  });

  it("uses N/A when user has no first or last name", async () => {
    render(<GroupProgressGrid group={mockGroup} statuses={mockStatuses} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 10:30",
        "",
        "Test Droplet 1 (1)",
        "Completion Date",
        "Test Droplet 2 (2)",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 50, "", 100, "01/10/2025 09:30"],
      ["user2@test.com", "Jane Smith", 0, "", 100, "01/12/2025 04:15"],
      ["user3@test.com", "N/A", 25, "", 75, ""],
    ]);
  });

  it("applies correct styling to cells based on completion percentage", async () => {
    // Mock the worksheet with cells (updated for new structure)
    const mockWorksheet = {
      "!ref": "A1:F4", // Updated to include completion date columns
      A1: { v: "Recorded on: 1/15/2025 10:30" },
      B1: { v: "" },
      C1: { v: "Test Droplet 1 (1)" },
      D1: { v: "Completion Date" },
      E1: { v: "Test Droplet 2 (2)" },
      F1: { v: "Completion Date" },
      A2: { v: "user1@test.com" },
      B2: { v: "John Doe" },
      C2: { v: 50 }, // 50% completion
      D2: { v: "" }, // completion date column
      E2: { v: 100 }, // 100% completion
      F2: { v: "01/10/2025 09:30" }, // completion date
      A3: { v: "user2@test.com" },
      B3: { v: "Jane Smith" },
      C3: { v: 0 }, // 0% completion
      D3: { v: "" }, // completion date column
      E3: { v: 100 }, // 100% completion
      F3: { v: "01/12/2025 04:15" }, // completion date
      A4: { v: "user3@test.com" },
      B4: { v: "N/A" },
      C4: { v: 25 }, // 25% completion
      D4: { v: "" }, // completion date column
      E4: { v: 75 }, // 75% completion
      F4: { v: "" }, // completion date column
    };

    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue(mockWorksheet);

    render(<GroupProgressGrid group={mockGroup} statuses={mockStatuses} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Verify that styling was applied to the worksheet
    expect(XLSX.utils.decode_range).toHaveBeenCalledWith("A1:F4");
    expect(XLSX.utils.encode_cell).toHaveBeenCalled();
  });

  it("handles completion status from statuses prop correctly", async () => {
    render(<GroupProgressGrid group={mockGroup} statuses={mockStatuses} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // The completion status should come from the statuses prop with completion dates
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 10:30",
        "",
        "Test Droplet 1 (1)",
        "Completion Date",
        "Test Droplet 2 (2)",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 50, "", 100, "01/10/2025 09:30"],
      ["user2@test.com", "Jane Smith", 0, "", 100, "01/12/2025 04:15"],
      ["user3@test.com", "N/A", 25, "", 75, ""],
    ]);
  });

  it("does not export when group has no droplets and no members", async () => {
    const emptyGroup = {
      ...mockGroup,
      members: [],
      droplets: [],
    };

    render(<GroupProgressGrid group={emptyGroup} statuses={{}} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Should call XLSX functions with minimal data
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Recorded on: 1/15/2025 10:30", ""],
    ]);
  });

  it("handles errors gracefully during export", async () => {
    // Mock console.error to capture the error message
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock XLSX to throw an error
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockImplementation(() => {
      throw new Error("XLSX error");
    });

    render(<GroupProgressGrid group={mockGroup} statuses={mockStatuses} />);

    await screen.findByText("Download as Excel");

    // Click the export button - this should not crash the component
    fireEvent.click(screen.getByText("Download as Excel"));

    // Verify the error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error exporting to Excel:",
      expect.any(Error),
    );

    // Verify the component is still functional after the error
    expect(screen.getByText("Download as Excel")).toBeInTheDocument();

    // Clean up
    consoleSpy.mockRestore();
  });

  it("exports with correct filename including group name and date", async () => {
    render(<GroupProgressGrid group={mockGroup} statuses={mockStatuses} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      {},
      "Test_Group_progress_report_1_15_2025.xlsx",
    );
  });

  it("creates workbook with correct sheet name", async () => {
    render(<GroupProgressGrid group={mockGroup} statuses={mockStatuses} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      {},
      expect.any(Object),
      "Progress",
    );
  });

  it("handles missing statuses for some user-droplet combinations", async () => {
    const partialStatuses: Record<string, { completionPercentage: number, completionDate: Date | undefined }> = {
      "1-1": { completionPercentage: 50, completionDate: undefined },
      "2-2": { completionPercentage: 100, completionDate: new Date("2025-01-12T09:15:00.000Z") },
      // Missing "1-2", "2-1", "3-1", "3-2"
    };

    render(<GroupProgressGrid group={mockGroup} statuses={partialStatuses} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Missing statuses should default to 0 with empty completion dates
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 10:30",
        "",
        "Test Droplet 1 (1)",
        "Completion Date",
        "Test Droplet 2 (2)",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 50, "", 0, ""],
      ["user2@test.com", "Jane Smith", 0, "", 100, "01/12/2025 04:15"],
      ["user3@test.com", "N/A", 0, "", 0, ""],
    ]);
  });

  it("handles completion dates correctly when 100% complete", async () => {
    const statusesWithDates = {
      "1-1": { completionPercentage: 100, completionDate: new Date("2025-01-08T16:45:00.000Z") },
      "1-2": { completionPercentage: 100, completionDate: new Date("2025-01-10T14:30:00.000Z") },
      "2-1": { completionPercentage: 100, completionDate: new Date("2025-01-09T11:20:00.000Z") },
      "2-2": { completionPercentage: 75, completionDate: undefined },
      "3-1": { completionPercentage: 0, completionDate: undefined },
      "3-2": { completionPercentage: 100, completionDate: new Date("2025-01-11T13:15:00.000Z") },
    };

    render(<GroupProgressGrid group={mockGroup} statuses={statusesWithDates} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Should show completion dates only for 100% completion
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 10:30",
        "",
        "Test Droplet 1 (1)",
        "Completion Date",
        "Test Droplet 2 (2)",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 100, "01/08/2025 11:45", 100, "01/10/2025 09:30"],
      ["user2@test.com", "Jane Smith", 100, "01/09/2025 06:20", 75, ""],
      ["user3@test.com", "N/A", 0, "", 100, "01/11/2025 08:15"],
    ]);
  });

  it("handles undefined completion dates gracefully", async () => {
    const statusesWithUndefinedDates = {
      "1-1": { completionPercentage: 100, completionDate: undefined }, // 100% but no date
      "1-2": { completionPercentage: 50, completionDate: undefined },
      "2-1": { completionPercentage: 100, completionDate: new Date("2025-01-12T09:15:00.000Z") },
      "2-2": { completionPercentage: 0, completionDate: undefined },
      "3-1": { completionPercentage: 25, completionDate: undefined },
      "3-2": { completionPercentage: 100, completionDate: undefined }, // 100% but no date
    };

    render(<GroupProgressGrid group={mockGroup} statuses={statusesWithUndefinedDates} />);

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Should show empty completion dates for 100% completion without dates
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 10:30",
        "",
        "Test Droplet 1 (1)",
        "Completion Date",
        "Test Droplet 2 (2)",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 100, "", 50, ""],
      ["user2@test.com", "Jane Smith", 100, "01/12/2025 04:15", 0, ""],
      ["user3@test.com", "N/A", 25, "", 100, ""],
    ]);
  });

  it("handles group name with spaces in filename", async () => {
    const groupWithSpaces = {
      ...mockGroup,
      groupName: "Test Group With Spaces",
    };

    render(
      <GroupProgressGrid group={groupWithSpaces} statuses={mockStatuses} />,
    );

    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      {},
      "Test_Group_With_Spaces_progress_report_1_15_2025.xlsx",
    );
  });
});
