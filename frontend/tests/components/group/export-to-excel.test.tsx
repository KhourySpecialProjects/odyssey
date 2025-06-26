import { render, screen, fireEvent } from "@testing-library/react";
import { GroupProgressGrid } from "@/components/group/group-progress-grid";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import {
  AuthorizedUser,
  DropletStatus,
  DropletType,
  FocusArea,
  Tag,
  Group,
  Droplet,
  Lesson,
  Enrollment,
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

// Mock the enrollment request
jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
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

const mockEnrollment1: Enrollment = {
  id: "1",
  authorizedUser: mockAuthUser1,
  droplet: mockDroplet1,
  viewedLessons: [mockLesson1], // 50% completion (1 of 2 lessons)
  isComplete: false,
  rating: 0,
  isFirstTime: false,
  isArchived: false,
  notes: [],
};

const mockEnrollment2: Enrollment = {
  id: "2",
  authorizedUser: mockAuthUser1,
  droplet: mockDroplet2,
  viewedLessons: [mockLesson1], // 100% completion (1 of 1 lesson)
  isComplete: true,
  rating: 0,
  isFirstTime: false,
  isArchived: false,
  notes: [],
};

const mockEnrollment3: Enrollment = {
  id: "3",
  authorizedUser: mockAuthUser2,
  droplet: mockDroplet1,
  viewedLessons: [], // 0% completion
  isComplete: false,
  rating: 0,
  isFirstTime: false,
  isArchived: false,
  notes: [],
};

const mockEnrollment4: Enrollment = {
  id: "4",
  authorizedUser: mockAuthUser2,
  droplet: mockDroplet2,
  viewedLessons: [mockLesson1], // 100% completion (1 of 1 lesson)
  isComplete: true,
  rating: 0,
  isFirstTime: false,
  isArchived: false,
  notes: [],
};

const mockGroup: Group = {
  id: 1,
  groupName: "Test Group",
  slug: "test-group",
  description: "A test group",
  semester: "Spring 2025",
  isArchived: false,
  members: [mockAuthUser1, mockAuthUser2],
  droplets: [mockDroplet1, mockDroplet2],
  playlists: [],
};

describe("GroupProgressGrid Excel Export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the enrollment data
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockImplementation((userId: number) => {
      if (userId === 1) {
        return Promise.resolve([mockEnrollment1, mockEnrollment2]);
      } else if (userId === 2) {
        return Promise.resolve([mockEnrollment3, mockEnrollment4]);
      }
      return Promise.resolve([]);
    });

    // Mock XLSX functions
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue({
      "!ref": "A1:C3",
    });
    (XLSX.utils.decode_range as jest.Mock).mockReturnValue({
      s: { r: 0, c: 0 },
      e: { r: 2, c: 2 },
    });
    (XLSX.utils.encode_cell as jest.Mock).mockImplementation(({ r, c }) => {
      const col = String.fromCharCode(65 + c);
      return `${col}${r + 1}`;
    });
    (XLSX.utils.book_new as jest.Mock).mockReturnValue({});
    (XLSX.utils.book_append_sheet as jest.Mock).mockReturnValue({});
    (XLSX.writeFile as jest.Mock).mockImplementation(() => {});
  });

  it("renders the export button", async () => {
    render(<GroupProgressGrid group={mockGroup} />);
    
    // Wait for the component to load and render
    await screen.findByText("Download as Excel");
    
    expect(screen.getByText("Download as Excel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download as excel/i })).toBeInTheDocument();
  });

  it("calls XLSX functions when export button is clicked", async () => {
    render(<GroupProgressGrid group={mockGroup} />);
    
    // Wait for the component to load
    await screen.findByText("Download as Excel");
    
    // Click the export button
    fireEvent.click(screen.getByText("Download as Excel"));

    // Verify XLSX functions were called
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith({}, expect.any(Object), "Progress");
    expect(XLSX.writeFile).toHaveBeenCalledWith({}, "progress_report.xlsx");
  });

  it("creates correct data structure for Excel export", async () => {
    render(<GroupProgressGrid group={mockGroup} />);
    
    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Check that aoa_to_sheet was called with the correct data structure
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Member", "Test Droplet 1 (1)", "Test Droplet 2 (2)"],
      ["John Doe", expect.any(Number), expect.any(Number)],
      ["Jane Smith", expect.any(Number), expect.any(Number)],
    ]);
  });

  it("handles groups with no members", async () => {
    const groupWithNoMembers = {
      ...mockGroup,
      members: [],
    };

    render(<GroupProgressGrid group={groupWithNoMembers} />);
    
    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Should still call XLSX functions but with empty data
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Member", "Test Droplet 1 (1)", "Test Droplet 2 (2)"],
    ]);
  });

  it("handles groups with no droplets", async () => {
    const groupWithNoDroplets = {
      ...mockGroup,
      droplets: [],
    };

    render(<GroupProgressGrid group={groupWithNoDroplets} />);
    
    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Should still call XLSX functions but with only member column
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Member"],
      ["John Doe"],
      ["Jane Smith"],
    ]);
  });

  it("uses email when user has no first or last name", async () => {
    const userWithNoName = {
      ...mockAuthUser1,
      firstName: "",
      lastName: "",
    };

    const groupWithNoNameUser = {
      ...mockGroup,
      members: [userWithNoName, mockAuthUser2],
    };

    render(<GroupProgressGrid group={groupWithNoNameUser} />);
    
    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Member", "Test Droplet 1 (1)", "Test Droplet 2 (2)"],
      ["user1@test.com", expect.any(Number), expect.any(Number)],
      ["Jane Smith", expect.any(Number), expect.any(Number)],
    ]);
  });

  it("applies correct styling to cells based on completion percentage", async () => {
    // Mock the worksheet with cells
    const mockWorksheet = {
      "!ref": "A1:C3",
      "A1": { v: "Member" },
      "B1": { v: "Test Droplet 1 (1)" },
      "C1": { v: "Test Droplet 2 (2)" },
      "A2": { v: "John Doe" },
      "B2": { v: 50 }, // 50% completion
      "C2": { v: 100 }, // 100% completion
      "A3": { v: "Jane Smith" },
      "B3": { v: 0 }, // 0% completion
      "C3": { v: 100 }, // 100% completion
    };

    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue(mockWorksheet);

    render(<GroupProgressGrid group={mockGroup} />);
    
    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Verify that styling was applied to the worksheet
    expect(XLSX.utils.decode_range).toHaveBeenCalledWith("A1:C3");
    expect(XLSX.utils.encode_cell).toHaveBeenCalled();
  });

  it("handles completion status calculation correctly", async () => {
    render(<GroupProgressGrid group={mockGroup} />);
    
    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // The completion status should be calculated based on the mock enrollment data
    // User 1: Droplet 1 = 50% (1/2 lessons), Droplet 2 = 100% (1/1 lesson)
    // User 2: Droplet 1 = 0% (0/2 lessons), Droplet 2 = 100% (1/1 lesson)
    
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Member", "Test Droplet 1 (1)", "Test Droplet 2 (2)"],
      ["John Doe", 50, 100],
      ["Jane Smith", 0, 100],
    ]);
  });

  it("does not export when group has no droplets and no members", async () => {
    const emptyGroup = {
      ...mockGroup,
      members: [],
      droplets: [],
    };

    render(<GroupProgressGrid group={emptyGroup} />);
    
    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    // Should call XLSX functions with minimal data
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Member"],
    ]);
  });

  it("handles errors gracefully during export", async () => {
    // Mock console.error to capture the error message
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock XLSX to throw an error
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockImplementation(() => {
      throw new Error("XLSX error");
    });

    render(<GroupProgressGrid group={mockGroup} />);
    
    await screen.findByText("Download as Excel");
    
    // Click the export button - this should not crash the component
    fireEvent.click(screen.getByText("Download as Excel"));
    
    // Verify the error was logged
    expect(consoleSpy).toHaveBeenCalledWith("Error exporting to Excel:", expect.any(Error));
    
    // Verify the component is still functional after the error
    expect(screen.getByText("Download as Excel")).toBeInTheDocument();
    
    // Clean up
    consoleSpy.mockRestore();
  });

  it("exports with correct filename", async () => {
    render(<GroupProgressGrid group={mockGroup} />);
    
    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    expect(XLSX.writeFile).toHaveBeenCalledWith({}, "progress_report.xlsx");
  });

  it("creates workbook with correct sheet name", async () => {
    render(<GroupProgressGrid group={mockGroup} />);
    
    await screen.findByText("Download as Excel");
    fireEvent.click(screen.getByText("Download as Excel"));

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith({}, expect.any(Object), "Progress");
  });
});
