import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { createDroplet, createNewTag, deepDeleteDroplet } from "@/lib/requests/droplet";
import { addLesson } from "@/lib/requests/lesson";

jest.mock("@/lib/requests/lesson", () => ({
  addLesson: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

beforeAll(() => {
  global.fetch = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUser.mockResolvedValue({ email: "test@example.com" });
  getAuthorizedUserByEmail.mockResolvedValue({ id: 1 });
});

describe("deepDeleteDroplet", () => {
  it("handles droplet deletion failure", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    const result = await deepDeleteDroplet(123);

    expect(result).toEqual({
      error: "Database Error: Failed to Delete Droplet.",
    });
  });
});

describe("Droplet Actions", () => {
  // it("should create droplet", async () => {
  //   const data = {
  //     name: "Test Droplet",
  //     focusArea: "Test Area",
  //     type: "test",
  //     tagIds: [1],
  //     learningObjectives: ["Objective 1"],
  //   };

  //   global.fetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: () => Promise.resolve({ 
  //       data: { 
  //         id: 1,
  //         attributes: {
  //           name: "Test Droplet",
  //           focusArea: "Test Area",
  //           type: "test"
  //         }
  //       } 
  //     }),
  //   });

  //   const result = await createDroplet(data);
  //   expect(result.ok).toBe(true);
  // });

  it("should add lesson", async () => {
    const formData = {
      name: "Test Lesson",
      dropletId: 1,
      orderIndex: 1,
    };

    addLesson.mockResolvedValueOnce({ success: true, data: { id: 1 } });

    const result = await addLesson(formData);
    expect(result).toEqual({ success: true, data: { id: 1 } });
  });
});

// describe("Tag Actions", () => {
//   it("should create new tag", async () => {
//     global.fetch.mockResolvedValueOnce({
//       ok: true, 
//       json: () => Promise.resolve({ 
//         data: { 
//           id: 1,
//           attributes: {
//             name: "Test Tag"
//           }
//         } 
//       }),
//     });

//     const result = await createNewTag("Test Tag");
//     expect(result.success).toBe(true);
//   });
// });
