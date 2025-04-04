import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  fetchAPI,
  getPath,
  htmlToText,
  getInitials,
  strapiJSONToTiptapJSON,
  tiptapJSONToStrapiJSON,
  getStrapiURL,
  flattenAttributes,
  isAuthorizedUserAdmin,
  isContentCreator,
  isAuthorizedUserFaculty,
  condenseRoleTitles,
} from "@/lib/utils";

describe("utils", () => {
  describe("fetchAPI", () => {
    let mockFetch: jest.SpyInstance;

    beforeEach(() => {
      mockFetch = jest.spyOn(global, "fetch");
    });

    afterEach(() => {
      mockFetch.mockRestore();
    });

    it("should handle API errors", async () => {
      mockFetch.mockRejectedValue(new Error("API Error"));

      await expect(fetchAPI("test-endpoint", {})).rejects.toThrow(
        "Failed to fetch data",
      );
    });
  });

  describe("getPath", () => {
    it("should return correct paths for different types", () => {
      expect(getPath("droplet", "test-slug")).toBe("/d/test-slug");
    });
  });

  describe("htmlToText", () => {
    it("should convert HTML to plain text", () => {
      expect(htmlToText("<p>Test</p>")).toBe("Test");
      expect(htmlToText("<h1>Title</h1><p>Content</p>")).toBe("TitleContent");
    });
  });

  describe("strapiJSONToTiptapJSON", () => {
    it("should convert Strapi JSON to Tiptap format", () => {
      const strapiJSON = [
        {
          type: "paragraph" as const,
          children: [{ text: "test", type: "text" as const }],
          language: "en",
        },
      ];
      const result = strapiJSONToTiptapJSON(strapiJSON);
      expect(result).toEqual([
        {
          type: "paragraph",
          content: [{ text: "test", type: "text", marks: [] }],
        },
      ]);
    });
  });

  describe("utils", () => {
    describe("getStrapiURL", () => {
      const originalEnv = process.env;

      beforeEach(() => {
        process.env = { ...originalEnv };
      });

      afterEach(() => {
        process.env = originalEnv;
      });

      it("should return correct URL with path", () => {
        process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test.com";
        expect(getStrapiURL("/test")).toBe("http://test.com/test");
      });

      it("should return default URL when env not set", () => {
        delete process.env.NEXT_PUBLIC_STRAPI_API_URL;
        expect(getStrapiURL("/test")).toBe("http://localhost:1337/test");
      });
    });

    describe("fetchAPI", () => {
      let mockFetch: jest.SpyInstance;

      beforeEach(() => {
        mockFetch = jest.spyOn(global, "fetch");
        process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test.com";
        process.env.STRAPI_ACCESS_TOKEN = "test-token";
      });

      afterEach(() => {
        mockFetch.mockRestore();
      });

      it("should make successful API call", async () => {
        const mockResponse = {
          ok: true,
          json: () =>
            Promise.resolve({ data: { attributes: { test: "value" } } }),
        };
        mockFetch.mockResolvedValue(mockResponse as Response);

        const result = await fetchAPI("/test", {});

        expect(result).toEqual({ test: "value" });
        expect(mockFetch).toHaveBeenCalledWith(
          "http://test.com/api/test",
          expect.objectContaining({
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer test-token",
            },
          }),
        );
      });

      it("should handle API errors", async () => {
        mockFetch.mockRejectedValue(new Error("API Error"));

        await expect(fetchAPI("/test", {})).rejects.toThrow(
          "Failed to fetch data",
        );
      });
    });

    describe("flattenAttributes", () => {
      it("should flatten nested attributes", () => {
        const input = {
          id: 1,
          attributes: {
            name: "test",
            nested: {
              data: {
                attributes: {
                  value: "nested",
                },
              },
            },
          },
        };

        expect(flattenAttributes(input)).toEqual({
          id: 1,
          name: "test",
          nested: {
            value: "nested",
          },
        });
      });

      it("should handle arrays", () => {
        const input = [
          {
            id: 1,
            attributes: { name: "test1" },
          },
          {
            id: 2,
            attributes: { name: "test2" },
          },
        ];

        expect(flattenAttributes(input)).toEqual([
          { id: 1, name: "test1" },
          { id: 2, name: "test2" },
        ]);
      });
    });

    describe("role checks", () => {
      describe("isAuthorizedUserAdmin", () => {
        it("should return true for admin roles", () => {
          expect(
            isAuthorizedUserAdmin([AuthorizedUserRoleTitle.AcadAdmin]),
          ).toBe(true);
        });

        it("should return false for non-admin roles", () => {
          expect(isAuthorizedUserAdmin([AuthorizedUserRoleTitle.User])).toBe(
            false,
          );
        });
      });

      describe("isContentCreator", () => {
        it("should return true for content creator role", () => {
          expect(
            isContentCreator([AuthorizedUserRoleTitle.ContentCreator]),
          ).toBe(true);
        });

        it("should return false for other roles", () => {
          expect(isContentCreator([AuthorizedUserRoleTitle.User])).toBe(false);
        });
      });

      describe("isAuthorizedUserFaculty", () => {
        it("should return true for faculty role", () => {
          expect(
            isAuthorizedUserFaculty([AuthorizedUserRoleTitle.Faculty]),
          ).toBe(true);
        });

        it("should return false for other roles", () => {
          expect(isAuthorizedUserFaculty([AuthorizedUserRoleTitle.User])).toBe(
            false,
          );
        });
      });
    });

    describe("utils", () => {
      describe("isAuthorizedUserAdmin", () => {
        it("returns true for admin roles", () => {
          expect(
            isAuthorizedUserAdmin([AuthorizedUserRoleTitle.SysAdmin]),
          ).toBe(true);
        });

        it("returns false for non-admin roles", () => {
          expect(isAuthorizedUserAdmin([AuthorizedUserRoleTitle.User])).toBe(
            false,
          );
        });

        it("returns false for null roles", () => {
          expect(isAuthorizedUserAdmin(null)).toBe(false);
        });
      });

      describe("isContentCreator", () => {
        it("returns true for content creator role", () => {
          expect(
            isContentCreator([AuthorizedUserRoleTitle.ContentCreator]),
          ).toBe(true);
        });

        it("returns false for other roles", () => {
          expect(isContentCreator([AuthorizedUserRoleTitle.User])).toBe(false);
        });
      });

      describe("condenseRoleTitles", () => {
        it("joins role titles with commas", () => {
          const roles = [
            AuthorizedUserRoleTitle.SysAdmin,
            AuthorizedUserRoleTitle.User,
          ];
          expect(condenseRoleTitles(roles)).toBe("System Admin, User");
        });

        it("returns empty string for null roles", () => {
          expect(condenseRoleTitles(null)).toBe("");
        });
      });

      describe("htmlToText", () => {
        it("removes HTML tags", () => {
          expect(htmlToText("<p>Hello <b>World</b></p>")).toBe("Hello World");
        });

        it("replaces &nbsp; with space", () => {
          expect(htmlToText("Hello&nbsp;World")).toBe("Hello World");
        });

        it("trims whitespace", () => {
          expect(htmlToText(" <p>Hello</p> ")).toBe("Hello");
        });
      });

      describe("strapiJSONToTiptapJSON", () => {
        it("converts text node", () => {
          const input = [
            {
              type: "text" as const,
              text: "Hello",
              bold: true,
              italic: false,
            },
          ];

          const result = strapiJSONToTiptapJSON(input);
          expect(result[0]).toEqual({
            type: "text",
            text: "Hello",
            marks: [{ type: "bold" }],
          });
        });

        it("converts link node", () => {
          const input = [
            {
              type: "link" as const,
              url: "https://example.com",
              children: [{ type: "text" as const, text: "Link" }],
            },
          ];

          const result = strapiJSONToTiptapJSON(input);
          expect(result[0]).toEqual({
            type: "text",
            text: "Link",
            marks: [
              {
                type: "link",
                attrs: {
                  href: "https://example.com",
                  target: "_blank",
                },
              },
            ],
          });
        });
      });

      describe("tiptapJSONToStrapiJSON", () => {
        it("converts text node", () => {
          const input = [
            {
              type: "text",
              text: "Hello",
              marks: [{ type: "bold" }],
            },
          ];

          const result = tiptapJSONToStrapiJSON(input);
          expect(result[0]).toEqual({
            type: "text",
            text: "Hello",
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            code: false,
          });
        });

        it("converts link node", () => {
          const input = [
            {
              type: "text",
              text: "Link",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://example.com",
                  },
                },
              ],
            },
          ];

          const result = tiptapJSONToStrapiJSON(input);
          expect(result[0]).toEqual({
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            code: false,
            text: "Link",
            type: "text",
          });
        });
      });
    });
  });
});
