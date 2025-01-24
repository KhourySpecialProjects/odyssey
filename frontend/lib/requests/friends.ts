import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { AuthorizedUser, Friendship } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { getAuthorizedUserByEmail } from "./authorized-user";
import qs from "qs";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;


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