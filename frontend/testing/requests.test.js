const { getAuthorByAuthorizedUserEmail } = require('../lib/requests/author');
const { getAuthorizedUserByEmail, fetchAuthorizedUsers, fetchIsAuthorizedUser, fetchContentCreators } = require('../lib/requests/authorized-user');
const { getAuthorizedUserRoleIdByTitle } = require('../lib/requests/authorized-user-roles');
const { fetchAPI } = require('../lib/utils');
const { fetchDroplets, fetchAccessRequests, fetchReports } = require('../lib/requests/data');
const { getDroplets, getDropletBySlug, getDropletById, getDraftDroplets } = require('../lib/requests/droplet');
const { getIsEnrolled, getEnrollmentsByAuthorizedUser } = require('../lib/requests/enrollment');
const { getLessonBySlug } = require('../lib/requests/lesson');
const { togglePlaylistEnrollment } = require('../lib/requests/playlist-enrollment');
const { getPlaylistsByAuthor, getPlaylistById, getPlaylistBySlug, getPlaylists } = require('../lib/requests/playlist');
const { getTags, getTagBySlug } = require('../lib/requests/tag');
//import { data } from "./mocks/strapiMock";

const data = require("./mocks/strapiMock");
const mockUsers = require("./mocks/authorizedUsersMock");

jest.mock('../lib/utils', () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn(data => {
    if (Array.isArray(data)) {
      return data.map(item => ({
        id: item.id,
        ...item.attributes
      }));
    }
    return data;
  })
}));

global.fetch = jest.fn();


//Comment this out if working on error testing (suppresses console error logs from error mocking)

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => { }); // Suppress console errors
  jest.spyOn(console, 'warn').mockImplementation(() => { }); // Suppress console warnings
});

afterEach(() => {
  jest.restoreAllMocks(); // Restore console after each test
});



/*// author.ts tests
describe('getAuthorByAuthorizedUserEmail', () => {
  it('should return the expected author when provided with a valid email', async () => {
    const mockAuthor = {
      id: 1,
      name: 'Gillian Palmer',
      authorizedUser: {
        email: 'palmer.gi@northeastern.edu'
      }
    };
    
    fetchAPI.mockResolvedValue([mockAuthor]);
  
    const result = await getAuthorByAuthorizedUserEmail('palmer.gi@northeastern.edu');

    expect(result).toEqual(mockAuthor);
    expect(fetchAPI).toHaveBeenCalledWith(expect.anything(), expect.anything());
    expect(jest.mocked(fetchAPI)).toHaveBeenCalledWith('/authors', {
      urlParams: expect.objectContaining({
        filters: {
          authorizedUser: { 
            email: { 
              $eq: 'palmer.gi@northeastern.edu' 
            } 
          }
        }
      })
    });
  });
  
  it('should throw an error when provided with an invalid email', async () => {
    fetchAPI.mockRejectedValue(new Error("Invalid email"));
  
    const invalidEmail = "invalid@example.com";
  
    await expect(getAuthorByAuthorizedUserEmail(invalidEmail)).rejects.toThrow(
      "Invalid email"
    );
    expect(fetchAPI).toHaveBeenCalledWith(expect.anything(), expect.anything());
  });
});
*/
describe('Authorized User Tests', () => {

  // authorized-user.ts tests
  describe('getAuthorizedUserByEmail', () => {
    it('should return an authorized user based on the given email', async () => {
      const testEmail = 'palmer.gi@northeastern.edu'
      const mockUser = {
        id: 1,
        firstName: 'Gillian',
        lastName: 'Palmer',
        email: 'palmer.gi@northeastern.edu'
      };

      fetchAPI.mockResolvedValue([mockUser]);


      const result = await getAuthorizedUserByEmail(testEmail);

      expect(result).toEqual(mockUser);
      expect(fetchAPI).toHaveBeenCalledWith(expect.anything(), expect.anything());
      expect(jest.mocked(fetchAPI)).toHaveBeenCalledWith('/authorized-users', {
        urlParams: expect.objectContaining({
          filters: {
            email: {
              $eq: testEmail
            }
          }
        })
      });
    });
  });



  describe('fetchAuthorizedUsers', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch and return authorized users', async () => {
      const mockStrapiResponse = {
        data: mockUsers.map(user => ({
          id: user.id,
          attributes: user.attributes
        })),
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 1,
            total: mockUsers.length
          }
        }
      };

      (global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse
      });

      const result = await fetchAuthorizedUsers();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/authorized-users'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer')
          }),
          cache: 'no-store'
        })
      );

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            firstName: expect.any(String),
            lastName: expect.any(String),
            email: expect.stringMatching(/@northeastern.edu$/),
            isEnabled: expect.any(Boolean)
          })
        ])
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(fetchAuthorizedUsers()).rejects.toThrow(
        'Failed to fetch authorized users data.'
      );
    });
  });

  describe('fetchIsAuthorizedUser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return whether the given user is authorized', async () => {
      const mockStrapiResponse = {
        data: [{
          id: 1,
          attributes: {
            name: 'Gillian Palmer',
            authorizedUser: {
              data: {
                attributes: {
                  email: 'palmer.gi@northeastern.edu'
                }
              }
            },
            isEnabled: true,
            roles: {
              data: [{
                attributes: {
                  title: 'User'
                }
              }]
            }
          }
        }]
      };

      (global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse
      });

      const result = await fetchIsAuthorizedUser("palmer.gi@northeastern.edu");
      expect(result).toEqual(true);
    });

    it('should return false for an unauthorized user', async () => {
      const mockStrapiResponse = {
        data: []
      };

      (global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse
      });

      const result = await fetchIsAuthorizedUser("unauthorized@northeastern.edu");
      expect(result).toEqual(false);
    });

    it('should handle fetch errors', async () => {
      (global.fetch).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(fetchIsAuthorizedUser()).rejects.toThrow(
        'Failed to fetch authorized users data.'
      );
    });
  });




  describe('fetchContentCreators', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch and return content creators', async () => {
      const mockStrapiResponse = {
        data: [
          {
            id: 1,
            attributes: {
              firstName: "John",
              lastName: "Doe",
              email: "doe.j@northeastern.edu",
              isEnabled: true,
              roles: {
                data: [
                  {
                    id: 2,
                    attributes: {
                      title: "Content Creator"
                    }
                  }
                ]
              },
              droplets: {
                data: [
                  { id: 5 },
                  { id: 6 }
                ]
              }
            }
          }
        ]
      };

      (global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse
      });

      const result = await fetchContentCreators();

      console.log("result is ", result)

     // Check that the URL contains expected query parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/sort=\["lastName"\]/),
        expect.any(Object)
      );

      // Verify Content Creator role filter
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/filters\[roles\]\[title\]\[\$eq\]=Content%20Creator/),
        expect.any(Object)
      );

      // Verify non-empty droplets filter
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/filters\[droplets\]\[\$null\]=false/),
        expect.any(Object)
      );

      // Verify pagination settings
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/pagination\[pageSize\]=100/),
        expect.any(Object)
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/authorized-users'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer')
          }),
          cache: 'no-store'
        })
      );

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            firstName: expect.any(String),
            lastName: expect.any(String),
            email: expect.stringMatching(/@northeastern.edu$/),
            isEnabled: expect.any(Boolean)
          })
        ])
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(fetchAuthorizedUsers()).rejects.toThrow(
        'Failed to fetch authorized users data.'
      );
    });
  });



})



// authorized-user-roles.ts tests
describe('getAuthorizedUserRoleIdByTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the role ID for a given title', async () => {
    const mockRole = {
      id: 1,
      title: 'User'
    };

    (global.fetch).mockResolvedValue([mockRole]);

    const result = await getAuthorizedUserRoleIdByTitle("User");
    expect(result).toBe(1);
    expect(fetchAPI).toHaveBeenCalledWith('/authorized-user-roles', {
      urlParams: expect.objectContaining({
        filters: {
          title: { $eq: 'User' }
        },
        pagination: {
          pageSize: 1,
          page: 1
        }
      })
    });
  });

  it('should handle error', async () => {
    (fetchAPI).mockRejectedValue(new Error('Failed to fetch role'));

    await expect(getAuthorizedUserRoleIdByTitle('Invalid'))
      .rejects
      .toThrow('Failed to fetch role');
  });
});



// data.ts tests
describe('Data requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDroplets', () => {
    it('should fetch and return droplets', async () => {
      const mockDroplets = [
        { id: 1, name: 'Droplet 1', type: 'knowledge', slug: 'droplet-1' },
        { id: 2, name: 'Droplet 2', type: 'skill', slug: 'droplet-2' }
      ];

      const mockResponse = {
        data: mockDroplets.map(droplet => ({
          id: droplet.id,
          attributes: {
            name: droplet.name,
            type: droplet.type,
            slug: droplet.slug
          }
        }))
      };

      (global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await fetchDroplets();

      expect(result).toEqual(mockDroplets);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/droplets'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer')
          })
        })
      );
    });
    it('should handle fetch errors', async () => {
      (global.fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchDroplets()).rejects.toThrow('Failed to fetch authorized users data.');
    });
  });

  describe('fetchAccessRequests', () => {
    it('should fetch and return access requests', async () => {
      const mockRequests = [
        {
          id: 1,
          givenName: 'John',
          familyName: 'Doe',
          email: 'john@northeastern.edu',
          affiliation: 'Student',
          college: 'KCCS'
        }
      ];

      const mockResponse = {
        data: mockRequests.map(request => ({
          id: request.id,
          attributes: {
            givenName: request.givenName,
            familyName: request.familyName,
            email: request.email,
            affiliation: request.affiliation,
            college: request.college
          }
        }))
      };

      (global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      const result = await fetchAccessRequests();

      expect(result).toEqual(mockRequests);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/access-requests'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer')
          }),
          cache: 'no-store'
        })
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchAccessRequests()).rejects.toThrow('Failed to fetch access requests data.');
    });
  });

  describe('fetchReports', () => {
    it('should fetch and return reports', async () => {
      const mockReports = [
        { id: 1, name: 'Report 1', type: 'knowledge', slug: 'report-1' },
        { id: 2, name: 'Report 2', type: 'skill', slug: 'report-2' }
      ];

      const mockResponse = {
        data: mockReports.map(report => ({
          id: report.id,
          attributes: {
            name: report.name,
            type: report.type,
            slug: report.slug
          }
        }))
      };

      (global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await fetchReports();

      expect(result).toEqual(mockReports);
    });
    it('should handle fetch errors', async () => {
      (global.fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchReports()).rejects.toThrow('Failed to fetch access requests data.');
    });
  });
});



// droplet.ts tests
describe('Droplet tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDroplets', () => {
    it('should get all of the droplets', async () => {
      const mockDroplets = [
        { id: 1, name: 'Droplet 1', type: 'knowledge', slug: 'droplet-1', isHidden: false },
        { id: 2, name: 'Droplet 2', type: 'skill', slug: 'droplet-2', isHidden: false }
      ];

      const mockResponse = {
        data: mockDroplets.map(droplet => ({
          id: droplet.id,
          attributes: {
            name: droplet.name,
            type: droplet.type,
            slug: droplet.slug
          }
        }))
      };

      (fetchAPI).mockResolvedValue(mockDroplets);

      const result = await getDroplets();

      expect(result).toEqual(mockDroplets);
    });
    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch droplets'));

      await expect(getDroplets()).rejects.toThrow();
    });
  });

  describe('getDropletBySlug', () => {
    it('should find and return the droplet corresponding to the given slug', async () => {
      const mockDroplet = {
        id: 1,
        name: 'Droplet 1',
        type: 'knowledge',
        slug: 'droplet-1',
        isHidden: false
      };

      (fetchAPI).mockResolvedValue([mockDroplet]);
      const result = await getDropletBySlug('droplet-1');

      expect(result).toEqual(mockDroplet);
      expect(fetchAPI).toHaveBeenCalledWith('/droplets', {
        urlParams: expect.objectContaining({
          filters: { slug: 'droplet-1' },
          pagination: { pageSize: 1, page: 1 },
        })
      });
    });

    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch droplets'));

      await expect(getDropletBySlug('invalid')).rejects.toThrow();
    });
  });

  describe('getDropletById', () => {
    it('should get a droplet based on a given ID', async () => {
      const mockDroplet = {
        id: 1,
        name: 'Droplet 1',
        type: 'knowledge',
        slug: 'droplet-1',
        isHidden: false
      };

      (fetchAPI).mockResolvedValue(mockDroplet);


      const result = await getDropletById(1);

      expect(result).toEqual(mockDroplet);
      expect(fetchAPI).toHaveBeenCalledWith('/droplets/1', expect.any(Object));
    });
    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch droplets'));

      await expect(getDropletById(100)).rejects.toThrow();
    });
  });

  describe('getDraftDroplets', () => {
    it('should return all of the draft droplets', async () => {
      const mockDroplets = [
        { id: 1, name: 'Droplet 1', type: 'knowledge', slug: 'droplet-1', status: 'draft', isHidden: false },
        { id: 2, name: 'Droplet 2', type: 'skill', slug: 'droplet-2', status: 'draft', isHidden: false }
      ];

      (fetchAPI).mockResolvedValue(mockDroplets);

      const result = await getDraftDroplets();

      expect(result).toEqual(mockDroplets);
    });
    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch droplets'));

      await expect(getDraftDroplets()).rejects.toThrow();
    });
  });
});



// enrollment.ts tests
describe('Enrollment tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getIsEnrolled', () => {
    it('should return whether an authorized user is enrolled', async () => {
      const mockEnrollment = [{
        id: 1,
        name: 'Droplet 1',
        slug: 'droplet-1',
      }];

      (fetchAPI).mockResolvedValue(mockEnrollment);

      const result = await getIsEnrolled(1, 1);

      expect(result).toEqual(true);
    });
    it('should return false when an authorized user is not enrolled', async () => {
      (fetchAPI).mockResolvedValue([]);

      const result = await getIsEnrolled(1, 1);

      expect(result).toEqual(false);
    });
    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch enrollment info'));

      await expect(getIsEnrolled(1, 1)).rejects.toThrow();
    });
  });

  describe('getEnrollmentsByAuthorizedUser', () => {
    it('should find and return the enrollments corresponding to the given authorized user', async () => {
      const mockEnrollment = {
        id: 1,
        name: 'Droplet 1',
        slug: 'droplet-1',
      };

      (fetchAPI).mockResolvedValue(mockEnrollment);
      const result = await getEnrollmentsByAuthorizedUser(1);

      expect(result).toEqual(mockEnrollment);
    });

    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch enrollments'));

      await expect(getEnrollmentsByAuthorizedUser(500)).rejects.toThrow();
    });
  });
});



// lesson.ts tests
describe('getLessonBySlug', () => {
  it('should return the lesson corresponding to the given slug', async () => {
    const mockLesson = [{
      id: 1,
      name: 'Lesson 1',
      slug: 'lesson-1',
    }];

    (fetchAPI).mockResolvedValue([mockLesson]);

    const result = await getLessonBySlug('lesson-1');

    expect(result).toEqual(mockLesson);
  });

  it('should handle fetch errors', async () => {
    (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch lesson info'));

    await expect(getLessonBySlug('fail')).rejects.toThrow();
  });
});



// playlist-enrollment.ts tests



// playlist.ts tests
describe('Playlist tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // describe('getPlaylistsByAuthor', () => {
  //   it('should return the playlists corresponding to a given author', async () => {
  //     const mockPlaylists = [
  //       {
  //         id: 1,
  //         name: 'Droplet 1',
  //         slug: 'droplet-1',
  //         authorId: 1
  //       }
  //     ];

  //     (fetchAPI).mockResolvedValue(mockPlaylists);

  //     const result = await getPlaylistsByAuthor(1);

  //     expect(result).toEqual(mockPlaylists);
  //   });
  //   it('should handle fetch errors', async () => {
  //     (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch playlist info'));

  //     await expect(getPlaylistsByAuthor(5)).rejects.toThrow();
  //   });
  // });

  describe('getPlaylistById', () => {
    it('should return the playlist corresponding to a given id', async () => {
      const mockPlaylist = {
        id: 1,
        attributes: {
          name: 'Test Playlist',
          slug: 'test-playlist',
          isPublic: true,
          droplets: []
        }
      };


      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 1,
            attributes: {
              name: 'Test Playlist',
              slug: 'test-playlist',
              isPublic: true,
              droplets: []
            }
          }
        })
      });

      (fetchAPI).mockReset();
      (fetchAPI).mockResolvedValueOnce({
        data: mockPlaylist
      });

      const result = await getPlaylistById(1);


      expect(result).toEqual(mockPlaylist);
    });

    it('should handle fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch playlist by id.'));
      await expect(getPlaylistById(1)).rejects.toThrow('Failed to fetch playlist by id.');
    });
  });

  describe('getPlaylistBySlug', () => {
    it('should return the playlist corresponding to a given slug', async () => {
      const mockPlaylist = {
        id: 1,
        name: 'Test Playlist',
        slug: 'test-playlist'
      };

      (fetchAPI).mockReset();
      (fetchAPI).mockResolvedValueOnce([mockPlaylist]);

      const result = await getPlaylistBySlug('test-playlist', {
        populate: '*',
        fields: ['*']
      });

      expect(result).toEqual(mockPlaylist);
    });

    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch playlist by id.'));

      await expect(getPlaylistBySlug('invalid-slug')).rejects.toThrow('Failed to fetch playlist by id.');
    });
  });

  describe('getPlaylists', () => {
    it('should find and return all playlists', async () => {
      const mockPlaylists = [
        {
          id: 1,
          name: 'Playlist 1',
          slug: 'playlist-1',
          isPublic: true,
          droplets: []
        },
        {
          id: 2,
          name: 'Playlist 2',
          slug: 'playlist-2',
          isPublic: true,
          droplets: []
        }
      ];

      (fetchAPI).mockReset();
      (fetchAPI).mockResolvedValueOnce(mockPlaylists);
      const result = await getPlaylists({
        populate: {
          droplets: true
        }
      });

      expect(result).toEqual(mockPlaylists);
    });

    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch playlists'));

      await expect(getPlaylists()).rejects.toThrow();
    });
  });
});


// tag.ts tests
describe('Tag tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTags', () => {
    it('should return all of the tags', async () => {
      const mockTags = [
        { id: 1, name: 'JavaScript', slug: 'javascript' },
        { id: 2, name: 'React', slug: 'react' }
      ];

      (fetchAPI).mockReset();
      (fetchAPI).mockResolvedValueOnce(mockTags);

      const result = await getTags();

      expect(result).toEqual(mockTags);
    });
    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch tags'));

      await expect(getTags()).rejects.toThrow();
    });
  });

  describe('getTagBySlug', () => {
    it('should find and return the tag corresponding to the given slug', async () => {
      const mockTag = { id: 1, name: 'JavaScript', slug: 'javascript' };

      (fetchAPI).mockResolvedValue([mockTag]);
      const result = await getTagBySlug('javascript');

      expect(result).toEqual(mockTag);
    });

    it('should handle fetch errors', async () => {
      (fetchAPI).mockRejectedValueOnce(new Error('Failed to fetch tags'));

      await expect(getTagBySlug('invalid')).rejects.toThrow();
    });
  });
});
