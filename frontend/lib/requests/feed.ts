import { Announcement } from "@/types";
import qs from "qs";
import { flattenAttributes } from "../utils";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function fetchAnnouncements(
  ): Promise<Announcement[]> {
    try {
      const query = qs.stringify({
        sort: ['firstCreated:desc'],
        filters: {},
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
          pageSize: 25,
          page: 1,
        },
      });
  
      const response = await fetch(
        NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements?" + query,
        {
          headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
          cache: "no-store",
        },
      );
      const data = await response.json();
      return flattenAttributes(data.data);
  
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to fetch announcement data.");
    }
  }



  export async function fetchNewestAnnouncements(
    ): Promise<Announcement[]> {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const formattedDate = oneWeekAgo.toISOString(); 
        const query = qs.stringify({
          sort: ['firstCreated:desc'],
          filters: {firstCreated: {
            $gte: formattedDate, 
          }},
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
            pageSize: 25,
            page: 1,
          },
        });
    
        const response = await fetch(
          NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements?" + query,
          {
            headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
            cache: "no-store",
          },
        );
        const data = await response.json();
        
        return flattenAttributes(data.data);
    
      } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to fetch announcement data.");
      }
    }