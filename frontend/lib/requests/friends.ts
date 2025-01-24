'use server'
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { AuthorizedUser, Friendship } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { revalidatePath } from "next/cache";
import qs from "qs";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function fetchFriends(authorizedUser: AuthorizedUser): Promise<AuthorizedUser[]> {
  try {
    const query = qs.stringify({
      filters: {
        authorized_users: {
          id: {
            $eq: authorizedUser.id
          }
        }
      },
      populate: {
        authorized_users: {
          fields: ["id", "email", "firstName", "lastName", "bio", "received_requests"]
        }
      },
      pagination: {
        pageSize: 25,
        page: 1,
      },
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/friendships?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    const friendships = flattenAttributes(data.data);
    
    return friendships
      .flatMap((friendship: Friendship) => 
        friendship.authorized_users.filter(friend => friend.id !== authorizedUser.id)
      );
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch friends data.");
  }
}

export async function acceptFriendRequest(userId: number, requestId: number) {
  const token = process.env.STRAPI_ACCESS_TOKEN;
  try {
    const friendshipResponse = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/friendships",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            friends: [requestId, userId],
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },    
      }
    );
  
    if (!friendshipResponse.ok) {
      console.error("Friendship Response:", await friendshipResponse.text());
      throw new Error("Failed to create friendship");
    }
    const deleteResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          data: {
            received_requests: {
              disconnect: [requestId]
            }
          },
        }),
      }
    );
  
    if (!deleteResponse.ok) {
      console.error("Delete Response:", await deleteResponse.text());
      throw new Error("Failed to delete friend request");
    }
    revalidatePath('/settings/friends');
  return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function rejectFriendRequest(userId: number, requestId: number) {
  const token = process.env.STRAPI_ACCESS_TOKEN;
  try {
    const deleteResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          data: {
            received_requests: {
              disconnect: [requestId]
            }
          },
        }),
      }
    );
  
    if (!deleteResponse.ok) {
      console.error("Delete Response:", await deleteResponse.text());
      throw new Error("Failed to delete friend request");
    }
    revalidatePath('/settings/friends');
  return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function removeFriend(userId: number, friendId: number) {
  const token = process.env.STRAPI_ACCESS_TOKEN;
  try {
    const query = qs.stringify({
      filters: {
        $and: [
          {
            friends: {
              id: {
                $eq: userId
              }
            }
          },
          {
            friends: {
              id: {
                $eq: friendId
              }
            }
          }
        ]
      }
    });

    const findResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/friendships?${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await findResponse.json();
    const friendship = data.data[0];

    if (!friendship) {
      console.error("friendship not found")
      throw new Error("Friendship not found");
    }

    const deleteResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/friendships/${friendship.id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      }
    );
  
    if (!deleteResponse.ok) {
      console.error("Delete Response:", await deleteResponse.text());
      throw new Error("Failed to delete friendship");
    }
    revalidatePath('/settings/friends');
  return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}


export async function fetchFriendshipsById(userId: number): Promise<Friendship[]> {
    try {
        const query = qs.stringify({
            sort: [],
            fields: [],
            filters: {
                authorized_users: {
                    id: {
                        $eq: userId
                    }
                }
            },
            populate: {
                authorized_users: { 
                    populate: {
                        friendships: {
                            populate: {
                                authorized_users: {
                                    fields: ["id", "email"]
                                }
                            }
                        }
                    },
                    fields: ["id", "email"] 
                },
            },
            pagination: {
                pageSize: 25,
                page: 1,
            },
        });
        const response = await fetch(
            NEXT_PUBLIC_STRAPI_API_URL + "/api/friendships?" + query,
            {
                headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
                cache: "no-store",
            },
        );
        const data = await response.json();
        const authorizedUsers = flattenAttributes(data.data);
        return authorizedUsers;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch authorized users data.");
    }
}

export async function fetchSuggestionsById(userId: number): Promise<AuthorizedUser[]> {
    try {
        // Get all friendships where userId is involved
        const userFriendships = await fetchFriendshipsById(userId);
        
        // Get all direct friends (AuthorizedUsers that aren't the userId)
        const directFriends = userFriendships.flatMap(friendship => 
            friendship.authorized_users.filter(user => user.id !== userId)
        );
        
        // Get all friends of friends
        const friendsOfFriends = await Promise.all(
            directFriends.map(async friend => {
                // Get all friendships for each direct friend
                const friendFriendships = await fetchFriendshipsById(friend.id);
                
                // Return all users from these friendships except the direct friend and original user
                return friendFriendships.flatMap(friendship =>
                    friendship.authorized_users.filter(user => 
                        user.id !== friend.id && user.id !== userId
                    )
                );
            })
        );
        
        // Flatten the array and remove duplicates based on user ID
        const uniqueFriendsOfFriends = Array.from(
            new Map(
                friendsOfFriends.flat().map(user => [user.id, user])
            ).values()
        );
        
        return uniqueFriendsOfFriends;
    } catch (error) {
        console.error("Error in fetchSuggestionsById:", error);
        throw new Error("Failed to fetch friend suggestions");
    }
}

/*
export async function fetchSuggestions(): Promise<Friendship[]> {
    try {
        const query = qs.stringify({
            sort: [],
            fields: [],
            populate: {
                authorized_users: { 
                    populate: {
                        friendships: {
                            fields: ["authorized_users"]
                        }
                    },
                    fields: ["id", "email"] },
            },
            pagination: {
                pageSize: 25,
                page: 1,
            },
        });
        const response = await fetch(
            NEXT_PUBLIC_STRAPI_API_URL + "/api/friendships?" + query,
            {
                headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
                cache: "no-store",
            },
        );
        const data = await response.json();
        const authorizedUsers = flattenAttributes(data.data);
        return authorizedUsers;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch authorized users data.");
    }
}

export async function getSuggestionsFromEmail(userEmail: string) {

    const curUser = await getAuthorizedUserByEmail(userEmail);


    //all of the current user's Friendships
    const userFriends = (await fetchSuggestions()).filter(friendship =>
        friendship.authorized_users.some(user => user.id === curUser.id),
    );

    console.log("this is", userFriends)


    //array of AuthorizedUser objects of the given user's friends
    const friendFriendships = userFriends.map((friendship) => {
        if (friendship?.authorized_users[0] === 29) {
            return friendship?.authorized_users[0]
        } else {
            return friendship?.authorized_users[1]
        }
    })

    /*
    const suggestions = friendFriendships.map((friendID) => {
        const suggestionFunc = async () => {
            return (await fetchSuggestions()).filter(friendship =>
                friendship.authorized_users.some(user => user.id === friendID.id)
            );
        }
        return suggestionFunc();
    })

        return friendFriendships;



}
*/