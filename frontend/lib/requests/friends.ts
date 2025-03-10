"use server";
import { flattenAttributes } from "@/lib/utils";
import { AuthorizedUser, Friendship } from "@/types";
import { revalidatePath } from "next/cache";
import qs from "qs";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function fetchFriends(
  authorizedUser: AuthorizedUser,
): Promise<AuthorizedUser[]> {
  try {
    const query = qs.stringify({
      filters: {
        authorized_users: {
          id: {
            $eq: authorizedUser.id,
          },
        },
      },
      populate: {
        authorized_users: {
          fields: [
            "id",
            "email",
            "firstName",
            "lastName",
            "bio",
            "github",
            "linkedin",
            "profilePhoto",
          ],
          populate: {
            blocked: {
              fields: ["id"],
            },
            was_blocked: {
              fields: ["id"],
            },
          },
        },
      },
      sort: ["authorized_users.lastName:asc"],
      pagination: {
        pageSize: 250,
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

    const allFriends = friendships.flatMap((friendship: Friendship) =>
      friendship.authorized_users.filter(
        (friend) =>
          friend.id !== authorizedUser.id &&
          !authorizedUser.was_blocked.some(
            (blockedUser) => blockedUser.id === friend.id,
          ) &&
          !authorizedUser.blocked.some(
            (blockedUser) => blockedUser.id === friend.id,
          ),
      ),
    );
    return Array.from(
      new Map<number, AuthorizedUser>(
        allFriends.map((friend: AuthorizedUser) => [friend.id, friend]),
      ).values(),
    );
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch friends data.");
  }
}

export async function getSentRequest(
  requester: AuthorizedUser,
  requestee: AuthorizedUser,
): Promise<boolean> {
  try {
    const query = qs.stringify({
      filters: {
        sent_requests: {
          id: {
            $eq: requestee.id,
          },
        },
      },
      populate: [],
      pagination: {
        pageSize: 250,
        page: 1,
      },
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    const friendships = flattenAttributes(data.data);

    return friendships.length != 0;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch friends data.");
  }
}

export async function getSentRequestIds(
  requester: AuthorizedUser,
): Promise<Number[]> {
  try {
    const query = qs.stringify({
      filters: {
        received_requests: {
          id: {
            $eq: requester.id,
          },
        },
      },
      pagination: {
        pageSize: 250,
        page: 1,
      },
      fields: ["id"],
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    const friendships: AuthorizedUser[] = flattenAttributes(data.data);

    return friendships.map((user) => user.id);
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
            authorized_users: [requestId, userId],
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
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
              disconnect: [requestId],
            },
          },
        }),
      },
    );

    if (!deleteResponse.ok) {
      console.error("Delete Response:", await deleteResponse.text());
      throw new Error("Failed to delete friend request");
    }
    revalidatePath("/settings/friends");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function sendFriendRequest(
  requester: AuthorizedUser,
  requestee: AuthorizedUser,
) {
  const token = process.env.STRAPI_ACCESS_TOKEN;
  try {
    const sentToResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${requestee.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          data: {
            received_requests: {
              connect: [requester.id],
            },
          },
        }),
      },
    );

    if (!sentToResponse.ok) {
      console.error("Send Response:", await sentToResponse.text());
      throw new Error("Failed to send friend request");
    }

    // Add requestee to requester's sent_requests
    const sentFromResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${requester.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          data: {
            sent_requests: {
              connect: [requestee.id],
            },
          },
        }),
      },
    );

    if (!sentFromResponse.ok) {
      console.error("Sent Response:", await sentFromResponse.text());
      throw new Error("Failed to add to sent requests");
    }

    revalidatePath("/settings/friends");
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
              disconnect: [requestId],
            },
          },
        }),
      },
    );

    if (!deleteResponse.ok) {
      console.error("Delete Response:", await deleteResponse.text());
      throw new Error("Failed to delete friend request");
    }
    revalidatePath("/settings/friends");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function cancelFriendRequest(userId: number, requestId: number) {
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
            sent_requests: {
              disconnect: [requestId],
            },
          },
        }),
      },
    );

    if (!deleteResponse.ok) {
      console.error("Delete Response:", await deleteResponse.text());
      throw new Error("Failed to delete friend request");
    }
    revalidatePath("/settings/friends");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function unblockUser(userId: number, requestId: number) {
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
            blocked: {
              disconnect: [requestId],
            },
          },
        }),
      },
    );

    if (!deleteResponse.ok) {
      console.error("Delete Response:", await deleteResponse.text());
      throw new Error("Failed to unblock user");
    }
    revalidatePath("/settings/friends");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function BlockUser(userId: number, requestId: number) {
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
            blocked: {
              connect: [requestId],
            },
          },
        }),
      },
    );

    if (!deleteResponse.ok) {
      console.error("Delete Response:", await deleteResponse.text());
      throw new Error("Failed to block user");
    }
    revalidatePath("/settings/friends");
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
            authorized_users: {
              id: {
                $eq: userId,
              },
            },
          },
          {
            authorized_users: {
              id: {
                $eq: friendId,
              },
            },
          },
        ],
      },
    });

    const findResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/friendships?${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await findResponse.json();
    const friendship = data.data[0];

    if (!friendship) {
      console.error("friendship not found");
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
      },
    );

    if (!deleteResponse.ok) {
      console.error("Delete Response:", await deleteResponse.text());
      throw new Error("Failed to delete friendship");
    }
    revalidatePath("/settings/friends");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function fetchFriendshipsById(
  userId: number,
): Promise<Friendship[]> {
  try {
    const query = qs.stringify({
      sort: [],
      fields: [],
      filters: {
        authorized_users: {
          id: {
            $eq: userId,
          },
        },
      },
      populate: {
        authorized_users: {
          fields: [
            "id",
            "email",
            "firstName",
            "lastName",
            "bio",
            "github",
            "linkedin",
            "profilePhoto",
          ],
          populate: {
            blocked: {
              fields: ["id"],
            },
            was_blocked: {
              fields: ["id"],
            },
          },
        },
      },
      pagination: {
        pageSize: 250,
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

export async function fetchSuggestionsById(
  userId: number,
): Promise<AuthorizedUser[]> {
  try {
    // Get all friendships where userId is involved
    const userFriendships = await fetchFriendshipsById(userId);

    // Get all direct friends (AuthorizedUsers that aren't the userId)
    const directFriends = userFriendships.flatMap((friendship) =>
      friendship.authorized_users.filter(
        (user) =>
          user.id !== userId &&
          !user.blocked.some(
            (blockedUser: AuthorizedUser) =>
              blockedUser.id === userId &&
              !user.was_blocked.some(
                (blockedUser: AuthorizedUser) => blockedUser.id === userId,
              ),
          ),
      ),
    );
    console.log("direct", directFriends);

    // Get all friends of friends
    const friendsOfFriends = await Promise.all(
      directFriends.map(async (friend) => {
        // Get all friendships for each direct friend
        const friendFriendships = await fetchFriendshipsById(friend.id);
        console.log("friend friend", friendFriendships);

        // Return all users from these friendships except the direct friend and original user
        return friendFriendships
          .flatMap((friendship) =>
            friendship.authorized_users.filter(
              (user) =>
                user.id !== friend.id &&
                user.id !== userId &&
                !directFriends.some(
                  (newUser: AuthorizedUser) => newUser.id === user.id,
                ) &&
                !user.was_blocked.some(
                  (blockedUser: AuthorizedUser) => blockedUser.id === userId,
                ),
            ),
          )
          .sort((a, b) => a.lastName.localeCompare(b.lastName));
      }),
    );

    // Flatten the array and remove duplicates based on user ID
    const uniqueFriendsOfFriends = Array.from(
      new Map(friendsOfFriends.flat().map((user) => [user.id, user])).values(),
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
