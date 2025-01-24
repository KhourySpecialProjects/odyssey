'use server'
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { AuthorizedUser } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { revalidatePath } from "next/cache";
import qs from "qs";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

interface Friendship {
  friends: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    bio: string;
  }[];
}

export async function fetchFriends(authorizedUser: AuthorizedUser): Promise<AuthorizedUser[]> {
  console.log("user", authorizedUser)
  console.log("id", authorizedUser.id)
  try {
    const query = qs.stringify({
      filters: {
        friends: {
          id: {
            $eq: authorizedUser.id
          }
        }
      },
      populate: {
        friends: {
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
        friendship.friends.filter(friend => friend.id !== authorizedUser.id)
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