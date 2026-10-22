import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  Playlist,
  Voyage,
  VoyageNode,
} from "@/types";
import { makeDroplet, makeTag } from "@/lib/testing/mock-helpers";

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
import type { WorkBook } from "xlsx-js-style";

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
  isPublic: true,
  website: "",
  groups: [],
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
  isPublic: true,
  website: "",
  groups: [],
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
  isPublic: true,
  website: "",
  groups: [],
};

const mockLesson1: Lesson = {
  id: 1,
  name: "Lesson 1",
  slug: "lesson-1",
  type: "lesson",
  blocks: [],
  droplets: [],
  notes: "",
  orderIndex: 0,
};

const mockLesson2: Lesson = {
  id: 2,
  name: "Lesson 2",
  slug: "lesson-2",
  type: "lesson",
  blocks: [],
  droplets: [],
  notes: "",
  orderIndex: 1,
};

const mockDroplet1: Droplet = makeDroplet({
  id: 1,
  name: "Test Droplet 1",
  slug: "test-droplet-1",
  isHidden: false,
  focusArea: "personal",
  type: "knowledge",
  tags: [makeTag({ id: 1, name: "React" })],
  learningObjectives: [],
  status: "published",
  lessons: [mockLesson1, mockLesson2],
});

const mockDroplet2: Droplet = makeDroplet({
  id: 2,
  name: "Test Droplet 2",
  slug: "test-droplet-2",
  isHidden: false,
  focusArea: "professional",
  type: "skill",
  tags: [makeTag({ id: 2, name: "TypeScript" })],
  learningObjectives: [],
  status: "published",
  lessons: [mockLesson1],
});

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
const mockStatuses: Record<
  string,
  { completionPercentage: number; completionDate: Date | undefined }
> = {
  "1-1": { completionPercentage: 50, completionDate: undefined }, // User 1, Droplet 1: 50%
  "1-2": {
    completionPercentage: 100,
    completionDate: new Date("2025-01-10T14:30:00.000Z"),
  }, // User 1, Droplet 2: 100%
  "2-1": { completionPercentage: 0, completionDate: undefined }, // User 2, Droplet 1: 0%
  "2-2": {
    completionPercentage: 100,
    completionDate: new Date("2025-01-12T09:15:00.000Z"),
  }, // User 2, Droplet 2: 100%
  "3-1": { completionPercentage: 25, completionDate: undefined }, // User 3, Droplet 1: 25%
  "3-2": { completionPercentage: 75, completionDate: undefined }, // User 3, Droplet 2: 75%
};

// The export handler lazy-loads xlsx-js-style, so its work finishes after the
// click; wait until the workbook is being built before asserting.
async function clickExport() {
  fireEvent.click(screen.getByText("Export"));
  await waitFor(() => expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled());
}

const mockDroplet3: Droplet = makeDroplet({
  id: 3,
  name: "Voyage Droplet 3",
  slug: "voyage-droplet-3",
});

const makePlaylist = (
  id: number,
  name: string,
  droplets: Droplet[],
): Playlist => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\W+/g, "-"),
  isPublic: true,
  duration: "short",
  droplets,
});

const makeNode = (
  id: number,
  orderIndex: number,
  playlist: Playlist,
): VoyageNode => ({
  id,
  isMainPath: true,
  branchType: "required",
  nodeType: "playlist",
  orderIndex,
  label: `Node ${id}`,
  playlist,
});

const mockDroplet4: Droplet = makeDroplet({
  id: 4,
  name: "Playlist Droplet 4",
  slug: "playlist-droplet-4",
});

const playlistA = makePlaylist(10, "Playlist A", [mockDroplet2]);
const playlistB = makePlaylist(11, "Playlist B", [mockDroplet3]);

const makeVoyage = (id: number, name: string, nodes: VoyageNode[]): Voyage => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\W+/g, "-"),
  description: "",
  status: "published",
  isSequential: false,
  voyage_nodes: nodes,
});

// Nodes are deliberately out of order to prove the orderIndex sort.
const voyageX = makeVoyage(20, "Voyage X", [
  makeNode(1, 1, playlistB),
  makeNode(2, 0, playlistA),
]);
const voyageY = makeVoyage(21, "Voyage Y", [makeNode(3, 0, playlistB)]);

const groupWithContent = {
  ...mockGroup,
  playlists: [playlistA],
  voyages: [voyageX, voyageY],
};

const contentStatuses = {
  ...mockStatuses,
  "1-3": { completionPercentage: 100, completionDate: undefined },
};

// Radix Select: stay synchronous (no findByRole), jsdom lacks scrollIntoView.
function selectOption(name: RegExp) {
  fireEvent.click(screen.getByRole("combobox"));
  fireEvent.click(screen.getByRole("option", { name }));
}

const exportedData = () =>
  jest.mocked(XLSX.utils.aoa_to_sheet).mock.calls[0][0] as unknown[][];

describe("GroupProgressGrid Excel Export", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock XLSX functions
    jest.mocked(XLSX.utils.aoa_to_sheet).mockReturnValue({
      "!ref": "A1:D4",
    });
    jest.mocked(XLSX.utils.decode_range).mockReturnValue({
      s: { r: 0, c: 0 },
      e: { r: 3, c: 3 },
    });
    jest.mocked(XLSX.utils.encode_cell).mockImplementation(({ r, c }) => {
      const col = String.fromCharCode(65 + c);
      return `${col}${r + 1}`;
    });
    const mockWorkbook: WorkBook = { Sheets: {}, SheetNames: [] };
    jest.mocked(XLSX.utils.book_new).mockReturnValue(mockWorkbook);
    jest.mocked(XLSX.utils.book_append_sheet).mockReturnValue(undefined);
    jest.mocked(XLSX.writeFile).mockImplementation(() => {});

    // Mock Date to return a consistent timestamp
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-15T15:30:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the export button", async () => {
    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    // Wait for the component to load and render
    await screen.findByText("Export");

    expect(screen.getByText("Export")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("calls XLSX functions when export button is clicked", async () => {
    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    // Wait for the component to load
    await screen.findByText("Export");

    // Click the export button
    await clickExport();

    // Verify XLSX functions were called
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      "Progress",
    );
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      "Test_Group_progress_report_1_15_2025.xlsx",
    );
  });

  it("creates correct data structure for Excel export with completion date columns", async () => {
    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    // Check that aoa_to_sheet was called with the correct data structure including completion dates
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 1",
        "Completion Date",
        "Test Droplet 2",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 50, "", 100, "01/10/2025 14:30"],
      ["user2@test.com", "Jane Smith", 0, "", 100, "01/12/2025 09:15"],
      ["user3@test.com", "N/A", 25, "", 75, ""],
    ]);
  });

  it("handles groups with no members", async () => {
    const groupWithNoMembers = {
      ...mockGroup,
      members: [],
    };

    render(
      <GroupProgressGrid
        group={groupWithNoMembers}
        statuses={{}}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    // Should still call XLSX functions but with only header row (including completion date columns)
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 1",
        "Completion Date",
        "Test Droplet 2",
        "Completion Date",
      ],
    ]);
  });

  it("handles groups with no droplets", async () => {
    const groupWithNoDroplets = {
      ...mockGroup,
      droplets: [],
    };

    render(
      <GroupProgressGrid
        group={groupWithNoDroplets}
        statuses={{}}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    // Should still call XLSX functions but with only member columns
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Recorded on: 1/15/2025 15:30", ""],
      ["user1@test.com", "John Doe"],
      ["user2@test.com", "Jane Smith"],
      ["user3@test.com", "N/A"],
    ]);
  });

  it("uses N/A when user has no first or last name", async () => {
    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 1",
        "Completion Date",
        "Test Droplet 2",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 50, "", 100, "01/10/2025 14:30"],
      ["user2@test.com", "Jane Smith", 0, "", 100, "01/12/2025 09:15"],
      ["user3@test.com", "N/A", 25, "", 75, ""],
    ]);
  });

  it("applies correct styling to cells based on completion percentage", async () => {
    // Mock the worksheet with cells (updated for new structure)
    const mockWorksheet = {
      "!ref": "A1:F4", // Updated to include completion date columns
      A1: { v: "Recorded on: 1/15/2025 15:30" },
      B1: { v: "" },
      C1: { v: "Test Droplet 1" },
      D1: { v: "Completion Date" },
      E1: { v: "Test Droplet 2" },
      F1: { v: "Completion Date" },
      A2: { v: "user1@test.com" },
      B2: { v: "John Doe" },
      C2: { v: 50 }, // 50% completion
      D2: { v: "" }, // completion date column
      E2: { v: 100 }, // 100% completion
      F2: { v: "01/10/2025 14:30" }, // completion date
      A3: { v: "user2@test.com" },
      B3: { v: "Jane Smith" },
      C3: { v: 0 }, // 0% completion
      D3: { v: "" }, // completion date column
      E3: { v: 100 }, // 100% completion
      F3: { v: "01/12/2025 09:15" }, // completion date
      A4: { v: "user3@test.com" },
      B4: { v: "N/A" },
      C4: { v: 25 }, // 25% completion
      D4: { v: "" }, // completion date column
      E4: { v: 75 }, // 75% completion
      F4: { v: "" }, // completion date column
    };

    jest.mocked(XLSX.utils.aoa_to_sheet).mockReturnValue(mockWorksheet);

    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    // Verify that styling was applied to the worksheet
    expect(XLSX.utils.decode_range).toHaveBeenCalledWith("A1:F4");
    expect(XLSX.utils.encode_cell).toHaveBeenCalled();
  });

  it("handles completion status from statuses prop correctly", async () => {
    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    // The completion status should come from the statuses prop with completion dates
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 1",
        "Completion Date",
        "Test Droplet 2",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 50, "", 100, "01/10/2025 14:30"],
      ["user2@test.com", "Jane Smith", 0, "", 100, "01/12/2025 09:15"],
      ["user3@test.com", "N/A", 25, "", 75, ""],
    ]);
  });

  it("does not export when group has no droplets and no members", async () => {
    const emptyGroup = {
      ...mockGroup,
      members: [],
      droplets: [],
    };

    render(
      <GroupProgressGrid
        group={emptyGroup}
        statuses={{}}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    // Should call XLSX functions with minimal data
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Recorded on: 1/15/2025 15:30", ""],
    ]);
  });

  it("handles errors gracefully during export", async () => {
    // Mock console.error to capture the error message
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock XLSX to throw an error
    jest.mocked(XLSX.utils.aoa_to_sheet).mockImplementation(() => {
      throw new Error("XLSX error");
    });

    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");

    // Click the export button - this should not crash the component
    await clickExport();

    // Verify the error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error exporting to Excel:",
      expect.any(Error),
    );

    // Verify the component is still functional after the error
    expect(screen.getByText("Export")).toBeInTheDocument();

    // Clean up
    consoleSpy.mockRestore();
  });

  it("exports with correct filename including group name and date", async () => {
    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      "Test_Group_progress_report_1_15_2025.xlsx",
    );
  });

  it("creates workbook with correct sheet name", async () => {
    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      "Progress",
    );
  });

  it("handles missing statuses for some user-droplet combinations", async () => {
    const partialStatuses: Record<
      string,
      { completionPercentage: number; completionDate: Date | undefined }
    > = {
      "1-1": { completionPercentage: 50, completionDate: undefined },
      "2-2": {
        completionPercentage: 100,
        completionDate: new Date("2025-01-12T09:15:00.000Z"),
      },
      // Missing "1-2", "2-1", "3-1", "3-2"
    };

    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={partialStatuses}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    // Missing statuses should default to 0 with empty completion dates
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 1",
        "Completion Date",
        "Test Droplet 2",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 50, "", 0, ""],
      ["user2@test.com", "Jane Smith", 0, "", 100, "01/12/2025 09:15"],
      ["user3@test.com", "N/A", 0, "", 0, ""],
    ]);
  });

  it("handles completion dates correctly when 100% complete", async () => {
    const statusesWithDates = {
      "1-1": {
        completionPercentage: 100,
        completionDate: new Date("2025-01-08T16:45:00.000Z"),
      },
      "1-2": {
        completionPercentage: 100,
        completionDate: new Date("2025-01-10T14:30:00.000Z"),
      },
      "2-1": {
        completionPercentage: 100,
        completionDate: new Date("2025-01-09T11:20:00.000Z"),
      },
      "2-2": { completionPercentage: 75, completionDate: undefined },
      "3-1": { completionPercentage: 0, completionDate: undefined },
      "3-2": {
        completionPercentage: 100,
        completionDate: new Date("2025-01-11T13:15:00.000Z"),
      },
    };

    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={statusesWithDates}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    // Should show completion dates only for 100% completion
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 1",
        "Completion Date",
        "Test Droplet 2",
        "Completion Date",
      ],
      [
        "user1@test.com",
        "John Doe",
        100,
        "01/08/2025 16:45",
        100,
        "01/10/2025 14:30",
      ],
      ["user2@test.com", "Jane Smith", 100, "01/09/2025 11:20", 75, ""],
      ["user3@test.com", "N/A", 0, "", 100, "01/11/2025 13:15"],
    ]);
  });

  it("handles undefined completion dates gracefully", async () => {
    const statusesWithUndefinedDates = {
      "1-1": { completionPercentage: 100, completionDate: undefined }, // 100% but no date
      "1-2": { completionPercentage: 50, completionDate: undefined },
      "2-1": {
        completionPercentage: 100,
        completionDate: new Date("2025-01-12T09:15:00.000Z"),
      },
      "2-2": { completionPercentage: 0, completionDate: undefined },
      "3-1": { completionPercentage: 25, completionDate: undefined },
      "3-2": { completionPercentage: 100, completionDate: undefined }, // 100% but no date
    };

    render(
      <GroupProgressGrid
        group={mockGroup}
        statuses={statusesWithUndefinedDates}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    // Should show empty completion dates for 100% completion without dates
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 1",
        "Completion Date",
        "Test Droplet 2",
        "Completion Date",
      ],
      ["user1@test.com", "John Doe", 100, "", 50, ""],
      ["user2@test.com", "Jane Smith", 100, "01/12/2025 09:15", 0, ""],
      ["user3@test.com", "N/A", 25, "", 100, ""],
    ]);
  });

  it("handles group name with spaces in filename", async () => {
    const groupWithSpaces = {
      ...mockGroup,
      groupName: "Test Group With Spaces",
    };

    render(
      <GroupProgressGrid
        group={groupWithSpaces}
        statuses={mockStatuses}
        voyageStatuses={{}}
      />,
    );

    await screen.findByText("Export");
    await clickExport();

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      "Test_Group_With_Spaces_progress_report_1_15_2025.xlsx",
    );
  });

  describe("export respects selected filter", () => {
    const renderContent = (group: typeof groupWithContent = groupWithContent) =>
      render(
        <GroupProgressGrid
          group={group}
          statuses={contentStatuses}
          voyageStatuses={{}}
        />,
      );

    it("exports droplets and all voyage columns for All", async () => {
      renderContent();
      await clickExport();

      expect(exportedData()[0]).toEqual([
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 1",
        "Completion Date",
        "Test Droplet 2",
        "Completion Date",
        "Voyage Droplet 3",
        "Completion Date",
        "Voyage X - Playlist A",
        "Voyage X - Playlist B",
        "Voyage Y - Playlist B",
      ]);
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.any(Object),
        "Test_Group_progress_report_1_15_2025.xlsx",
      );
    });

    it("keeps the All filename when a playlist is named all", async () => {
      const named = makePlaylist(14, "all", [mockDroplet2]);
      renderContent({ ...groupWithContent, playlists: [named] });
      await clickExport();

      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.any(Object),
        "Test_Group_progress_report_1_15_2025.xlsx",
      );
    });

    it("exports only the selected playlist's droplets", async () => {
      renderContent();
      selectOption(/Playlist A/);
      await clickExport();

      const data = exportedData();
      expect(data[0]).toEqual([
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 2",
        "Completion Date",
      ]);
      data.slice(1).forEach((row) => expect(row).toHaveLength(4));
    });

    it("exports only the selected voyage's playlist columns", async () => {
      renderContent();
      selectOption(/Voyage Y/);
      await clickExport();

      const data = exportedData();
      expect(data[0]).toEqual([
        "Recorded on: 1/15/2025 15:30",
        "",
        "Voyage Y - Playlist B",
      ]);
      expect(data[1]).toEqual(["user1@test.com", "John Doe", 100]);
      expect(data[2]).toEqual(["user2@test.com", "Jane Smith", 0]);
      expect(data[3]).toEqual(["user3@test.com", "N/A", 0]);
    });

    it("orders voyage columns by orderIndex", async () => {
      renderContent();
      selectOption(/Voyage X/);
      await clickExport();

      expect(exportedData()[0].slice(2)).toEqual([
        "Voyage X - Playlist A",
        "Voyage X - Playlist B",
      ]);
    });

    it("exports the auto-selected first voyage when there are no droplets", async () => {
      renderContent({ ...groupWithContent, droplets: [] });
      await clickExport();

      expect(exportedData()[0]).toEqual([
        "Recorded on: 1/15/2025 15:30",
        "",
        "Voyage X - Playlist A",
        "Voyage X - Playlist B",
      ]);
    });

    it("adds the selected playlist name to the filename", async () => {
      renderContent();
      selectOption(/Playlist A/);
      await clickExport();

      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.any(Object),
        "Test_Group_Playlist_A_progress_report_1_15_2025.xlsx",
      );
    });

    it("adds the selected voyage name to the filename", async () => {
      renderContent();
      selectOption(/Voyage Y/);
      await clickExport();

      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.any(Object),
        "Test_Group_Voyage_Y_progress_report_1_15_2025.xlsx",
      );
    });

    it("sanitises special characters in the selection name", async () => {
      const odd = makePlaylist(12, "Intro: Basics / Part 1?", [mockDroplet2]);
      renderContent({ ...groupWithContent, playlists: [odd] });
      selectOption(/Intro: Basics \/ Part 1\?/);
      await clickExport();

      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.any(Object),
        "Test_Group_Intro_Basics_Part_1_progress_report_1_15_2025.xlsx",
      );
    });

    it("omits the suffix when the name sanitises to nothing", async () => {
      const odd = makePlaylist(13, "???", [mockDroplet2]);
      renderContent({ ...groupWithContent, playlists: [odd] });
      selectOption(/\?\?\?/);
      await clickExport();

      expect(exportedData()[0]).toHaveLength(4);
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.any(Object),
        "Test_Group_progress_report_1_15_2025.xlsx",
      );
    });

    it("includes playlist droplets in All, once each, before voyage droplets", async () => {
      const playlistC = makePlaylist(15, "Playlist C", [
        mockDroplet4,
        mockDroplet3,
      ]);
      renderContent({
        ...groupWithContent,
        droplets: [mockDroplet1],
        playlists: [playlistC],
      });
      expect(screen.getByText("Playlist Droplet 4")).toBeInTheDocument();
      await clickExport();

      expect(exportedData()[0]).toEqual([
        "Recorded on: 1/15/2025 15:30",
        "",
        "Test Droplet 1",
        "Completion Date",
        "Playlist Droplet 4",
        "Completion Date",
        "Voyage Droplet 3",
        "Completion Date",
        "Test Droplet 2",
        "Completion Date",
        "Voyage X - Playlist A",
        "Voyage X - Playlist B",
        "Voyage Y - Playlist B",
      ]);
    });
  });
});
