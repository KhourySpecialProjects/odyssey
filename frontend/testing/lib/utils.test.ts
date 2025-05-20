import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  fetchAPI,
  getPath,
  htmlToText,
  strapiJSONToTiptapJSON,
  tiptapJSONToStrapiJSON,
  getStrapiURL,
  flattenAttributes,
  isAuthorizedUserAdmin,
  isContentCreator,
  isAuthorizedUserFaculty,
  condenseRoleTitles,
  cn,
  uppercaseFirstChar,
  getInitials,
  getDueDateBadgeColor,
  extractHeadings,
  youtubeUrlToEmbeddedUrl,
  embeddedUrlToYoutubeUrl,
  isContentEditor,
} from "@/lib/utils";

global.fetch = jest.fn();

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
            type: "link",
            url: "https://example.com",
            children: [
              {
                type: "text",
                text: "Link",
                bold: false,
                italic: false,
                underline: false,
                strikethrough: false,
                code: false,
              },
            ],
          });
        });
      });
    });
  });

  describe("Utility Functions", () => {
    describe("cn", () => {
      it("merges class names correctly", () => {
        expect(cn("base", "additional")).toBe("base additional");
        expect(cn("base", { conditional: true })).toBe("base conditional");
      });
    });

    describe("getStrapiURL", () => {
      it("returns correct URL with path", () => {
        const url = getStrapiURL("/test");
        expect(url).toBe("http://test.com/test");
      });

      it("returns base URL without path", () => {
        const url = getStrapiURL();
        expect(url).toBe("http://test.com");
      });
    });

    describe("uppercaseFirstChar", () => {
      it("capitalizes first character", () => {
        expect(uppercaseFirstChar("test")).toBe("Test");
        expect(uppercaseFirstChar("hello world")).toBe("Hello world");
      });
    });

    describe("getInitials", () => {
      it("returns correct initials", () => {
        expect(getInitials("John Doe")).toBe("JD");
        expect(getInitials("Alice Bob Charlie")).toBe("ABC");
      });
    });

    describe("fetchAPI", () => {
      beforeEach(() => {
        global.fetch = jest.fn();
      });

      it("handles successful API call", async () => {
        const mockResponse = { data: { attributes: { name: "Test" } } };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await fetchAPI("/test", {});
        expect(result).toEqual({ name: "Test" });
      });

      it("handles API error", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

        await expect(fetchAPI("/test", {})).rejects.toThrow();
      });
    });

    describe("flattenAttributes", () => {
      it("flattens nested attributes", () => {
        const input = {
          attributes: {
            name: "Test",
            nested: {
              data: {
                attributes: {
                  value: "Nested",
                },
              },
            },
          },
        };

        const result = flattenAttributes(input);
        expect(result).toEqual({
          name: "Test",
          nested: { value: "Nested" },
        });
      });
    });

    describe("getDueDateBadgeColor", () => {
      it("returns correct color for different time ranges", () => {
        expect(getDueDateBadgeColor(15, true)).toContain("emerald");
        expect(getDueDateBadgeColor(5, true)).toContain("amber");
        expect(getDueDateBadgeColor(2, true)).toContain("red");
        expect(getDueDateBadgeColor(-1, true)).toContain("red");
      });
    });
  });
  
  describe('Utils Functions', () => {
    describe('fetchAPI', () => {
      it('should handle successful API calls', async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({ data: { id: 1 } })
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
  
        const result = await fetchAPI('/test', {});
        expect(result).toEqual({ id: 1 });
      });
  
      it('should handle API errors', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          statusText: 'Not Found'
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
  
        await expect(fetchAPI('/error', {})).rejects.toThrow();
      });
    });
  
    describe('flattenAttributes', () => {
      it('should flatten nested attributes', () => {
        const input = {
          attributes: {
            name: 'Test',
            nested: {
              data: {
                attributes: {
                  value: 'Nested'
                }
              }
            }
          }
        };
        
        const result = flattenAttributes(input);
        expect(result).toEqual({
          name: 'Test',
          nested: {
            value: 'Nested'
          }
        });
      });
    });
  
    describe('extractHeadings', () => {
      it('should extract headings from HTML', () => {
        const html = '<h1>Title</h1><h2>Subtitle</h2>';
        const result = extractHeadings(html);
        expect(result).toEqual([
          { level: 1, text: 'Title' },
          { level: 2, text: 'Subtitle' }
        ]);
      });
    });
  
    describe('getPath', () => {
      it('should return correct path for droplet', () => {
        expect(getPath('droplet', 'test-slug')).toBe('/d/test-slug');
      });
    });
  
    describe('htmlToText', () => {
      it('should convert HTML to plain text', () => {
        const html = '<p>Test <b>bold</b> text</p>';
        expect(htmlToText(html)).toBe('Test bold text');
      });
    });
  
    describe('strapiJSONToTiptapJSON', () => {
      it('should convert Strapi JSON to Tiptap JSON', () => {
        const input = [{
          type: 'text' as 'text',
          text: 'Test',
          bold: true
        }];
        
        const result = strapiJSONToTiptapJSON(input);
        expect(result).toEqual([{
          type: 'text',
          text: 'Test',
          marks: [{ type: 'bold' }]
        }]);
      });
    });
  
    describe('tiptapJSONToStrapiJSON', () => {
      it('should convert Tiptap JSON to Strapi JSON', () => {
        const input = [{
          type: 'text',
          text: 'Test',
          marks: [{ type: 'bold' }]
        }];
        
        const result = tiptapJSONToStrapiJSON(input);
        expect(result).toEqual([{
          type: 'text',
          text: 'Test',
          bold: true,
          italic: false,
          underline: false,
          strikethrough: false,
          code: false
        }]);
      });
    });
  
    describe('YouTube URL conversion', () => {
      it('should convert YouTube URL to embedded URL', () => {
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        expect(youtubeUrlToEmbeddedUrl(url)).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
      });
  
      it('should convert embedded URL to YouTube URL', () => {
        const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
        expect(embeddedUrlToYoutubeUrl(url)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      });
    });
  });

  global.fetch = jest.fn();
  
  describe('Utils', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    describe('getInitials', () => {
      it('should return initials from a name', () => {
        expect(getInitials('John Doe')).toBe('JD');
        expect(getInitials('Mary Jane Smith')).toBe('MJS');
      });
  
      it('should handle single name', () => {
        expect(getInitials('John')).toBe('J');
      });
  
      it('should handle empty string', () => {
        expect(getInitials('')).toBe('');
      });
    });
  
    describe('fetchAPI', () => {
      it('should fetch data successfully', async () => {
        const mockResponse = {
          data: {
            attributes: {
              name: 'Test',
              description: 'Test description'
            }
          }
        };
  
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });
  
        const result = await fetchAPI('/test', {});
        expect(result).toEqual({ name: 'Test', description: 'Test description' });
      });
  
      it('should handle fetch errors', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });
  
        await expect(fetchAPI('/test', {})).rejects.toThrow('Failed to fetch data: response.text is not a function');
      });
  
      it('should handle network errors', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
  
        await expect(fetchAPI('/test', {})).rejects.toThrow('Failed to fetch data: Network error');
      });
    });
  
    describe('flattenAttributes', () => {
      it('should flatten nested attributes', () => {
        const input = {
          attributes: {
            name: 'Test',
            description: 'Test description',
            nested: {
              data: {
                attributes: {
                  value: 'nested value'
                }
              }
            }
          }
        };
  
        const expected = {
          name: 'Test',
          description: 'Test description',
          nested: { value: 'nested value' }
        };
  
        expect(flattenAttributes(input)).toEqual(expected);
      });
  
      it('should handle arrays', () => {
        const input = [{
          attributes: {
            name: 'Test'
          }
        }];
  
        const expected = [{
          name: 'Test'
        }];
  
        expect(flattenAttributes(input)).toEqual(expected);
      });
  
      it('should handle null input', () => {
        expect(flattenAttributes(null)).toBeNull();
      });
    });
  
    describe('extractHeadings', () => {
      it('should extract headings from HTML', () => {
        const html = `
          <h1>Main Title</h1>
          <h2>Subtitle</h2>
          <h3>Section</h3>
        `;
  
        const expected = [
          { level: 1, text: 'Main Title' },
          { level: 2, text: 'Subtitle' },
          { level: 3, text: 'Section' }
        ];
  
        expect(extractHeadings(html)).toEqual(expected);
      });
  
      it('should handle empty HTML', () => {
        expect(extractHeadings('')).toEqual([]);
      });
  
      it('should handle HTML without headings', () => {
        const html = '<p>Some text</p>';
        expect(extractHeadings(html)).toEqual([]);
      });
    });
  
    describe('getPath', () => {
      it('should return correct path for droplet', () => {
        expect(getPath('droplet', 'test-slug')).toBe('/d/test-slug');
      });
    });
  
    describe('Role Functions', () => {
      it('should check if user is admin', () => {
        expect(isAuthorizedUserAdmin([AuthorizedUserRoleTitle.SysAdmin])).toBe(true);
        expect(isAuthorizedUserAdmin([AuthorizedUserRoleTitle.User])).toBe(false);
        expect(isAuthorizedUserAdmin(null)).toBe(false);
      });
  
      it('should check if user is content creator', () => {
        expect(isContentCreator([AuthorizedUserRoleTitle.ContentCreator])).toBe(true);
        expect(isContentCreator([AuthorizedUserRoleTitle.User])).toBe(false);
        expect(isContentCreator(null)).toBe(false);
      });
  
      it('should check if user is content editor', () => {
        expect(isContentEditor([AuthorizedUserRoleTitle.ContentEditor])).toBe(true);
        expect(isContentEditor([AuthorizedUserRoleTitle.User])).toBe(false);
        expect(isContentEditor(null)).toBe(false);
      });
  
      it('should check if user is faculty', () => {
        expect(isAuthorizedUserFaculty([AuthorizedUserRoleTitle.Faculty])).toBe(true);
        expect(isAuthorizedUserFaculty([AuthorizedUserRoleTitle.User])).toBe(false);
        expect(isAuthorizedUserFaculty(null)).toBe(false);
      });
  
      it('should condense role titles', () => {
        const roles = [
          AuthorizedUserRoleTitle.SysAdmin,
          AuthorizedUserRoleTitle.ContentCreator
        ];
        expect(condenseRoleTitles(roles)).toBe('System Admin, Content Creator');
        expect(condenseRoleTitles(null)).toBe('');
      });
    });
  
    describe('htmlToText', () => {
      it('should convert HTML to plain text', () => {
        const html = '<p>This is <b>bold</b> and <i>italic</i> text</p>';
        expect(htmlToText(html)).toBe('This is bold and italic text');
      });
  
      it('should handle HTML with nbsp', () => {
        const html = '<p>Text&nbsp;with&nbsp;spaces</p>';
        expect(htmlToText(html)).toBe('Text with&nbsp;spaces');
      });
  
      it('should handle empty HTML', () => {
        expect(htmlToText('')).toBe('');
      });
    });
  });
});
