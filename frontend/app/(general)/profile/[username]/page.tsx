"use client";

import React, { useState, useEffect } from "react";
import { User, Linkedin, Github } from "lucide-react";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

import { AuthorizedUser, Droplet, Enrollment } from "@/types";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";

export default function PublicProfilePage() {
  const [userData, setUserData] = useState<AuthorizedUser | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Extract email from URL path or query parameter
        // Example: /profile/user@example.com or /profile?email=user@example.com
        const pathParts = window.location.pathname.split("/");
        const emailFromPath =
          pathParts[pathParts.length - 1] + "@northeastern.edu";

        const urlParams = new URLSearchParams(window.location.search);
        const emailFromQuery = urlParams.get("email");

        const userEmail = emailFromQuery || decodeURIComponent(emailFromPath);

        if (!userEmail) {
          setError("No user specified");
          setLoading(false);
          return;
        }

        const user: AuthorizedUser = (await getAuthorizedUserByEmail(
          userEmail,
        )) as AuthorizedUser;
        // Check if user profile is public (you'll need to add isPublic field to AuthorizedUser)
        // For now, assuming all enabled users are public
        if (!user.isPublic) {
          setError("Profile not available");
          setLoading(false);
          return;
        }

        setUserData(user);
        setEnrollments(
          (await getEnrollmentsByAuthorizedUser(user.id, {
            populate: {
              viewedLessons: {
                fields: ["id", "name", "slug"],
              },
              droplet: {
                populate: {
                  lessons: {
                    fields: ["id", "name", "slug"],
                  },
                },
              },
            },
          })) || ["check"],
        );
        setLoading(false);
      } catch (err) {
        setError("Profile not found");
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-800">
            Profile Not Found
          </h1>
          <p className="text-gray-600">
            This profile is either private or does not exist.
          </p>
        </div>
      </div>
    );
  }

  // Separate droplets into completed and created
  // Created droplets are in userData.droplets
  const createdDroplets = (userData.droplets || []).map((droplet, index) => ({
    ...droplet,
    uniqueKey: `created-${droplet.id}-${index}`,
  }));

  // Completed droplets are from enrollments with 100% completion

  const completedDroplets = (enrollments || [])
    .filter((enrollment) => enrollment.isComplete)
    .map((enrollment, index) => ({
      ...enrollment.droplet,
      uniqueKey: `completed-${enrollment.droplet?.id}-${index}`,
    }))
    .filter((droplet) => droplet.id); // Filter out any null/undefined droplets

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        {/* ===== LAYOUT CHANGE: Two-column grid layout ===== */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ===== LEFT SIDEBAR START - Profile Info ===== */}
          <div className="lg:col-span-3">
            <div className="sticky top-8 rounded-lg bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center">
                {/* Profile Photo */}
                <div className="mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-gray-300 bg-gray-100">
                  {userData.profilePhoto ? (
                    <img
                      src={userData.profilePhoto}
                      alt={`${userData.firstName} ${userData.lastName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-gray-400" />
                  )}
                </div>

                {/* Name */}
                <h1 className="mb-2 text-center text-xl font-bold text-gray-900">
                  {userData.firstName} {userData.lastName}
                </h1>

                {/* Bio */}
                {userData.bio && (
                  <div
                    className="mb-6 text-center text-sm text-gray-600"
                    dangerouslySetInnerHTML={{ __html: userData.bio }}
                  />
                )}

                {/* Social Links */}
                <div className="flex gap-3">
                  {userData.linkedin && (
                    <a
                      href={
                        userData.linkedin.startsWith("http")
                          ? userData.linkedin
                          : `https://${userData.linkedin}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 w-12 items-center justify-center rounded border-2 border-gray-300 transition-colors hover:bg-gray-50"
                      aria-label="LinkedIn"
                    >
                      <span className="text-sm font-semibold text-gray-700">
                        <Linkedin></Linkedin>
                      </span>
                    </a>
                  )}
                  {userData.github && (
                    <a
                      href={
                        userData.github.startsWith("http")
                          ? userData.github
                          : `https://${userData.github}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 w-12 items-center justify-center rounded border-2 border-gray-300 transition-colors hover:bg-gray-50"
                      aria-label="GitHub"
                    >
                      <span className="text-sm font-semibold text-gray-700">
                        git
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* ===== LEFT SIDEBAR END ===== */}

          {/* ===== RIGHT SIDE START - Droplets ===== */}
          <div className="space-y-8 lg:col-span-9">
            {/* Droplets Completed */}
            {completedDroplets.length > 0 && (
              <div className="rounded-lg bg-white p-8 shadow-sm">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  Droplets completed
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {/* Map over completed droplets, create clickable cards */}
                  {completedDroplets.map((droplet) => (
                    <div
                      key={droplet.id}
                      onClick={() => setSelectedId(droplet.id)}
                      className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-gray-300 p-6 transition-colors hover:border-gray-400"
                    >
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900">
                          {droplet.name}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Droplets Created */}
            {createdDroplets.length > 0 && (
              <div className="rounded-lg bg-white p-8 shadow-sm">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  Droplets Created
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {createdDroplets.map((droplet) => (
                    <div
                      key={droplet.uniqueKey}
                      onClick={() => setSelectedId(droplet.id)}
                      className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-gray-300 p-6 transition-colors hover:border-gray-400"
                    >
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900">
                          {droplet.name}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show message if no droplets */}
            {completedDroplets.length === 0 && createdDroplets.length === 0 && (
              <div className="rounded-lg bg-white p-8 text-center shadow-sm">
                <p className="text-gray-600">No droplets to display yet.</p>
              </div>
            )}
          </div>
          {/* ===== RIGHT SIDE END ===== */}
        </div>
        {/* ===== LAYOUT CHANGE END ===== */}
      </div>

      {/* Displaying droplet description */}
      {selectedId && (
        <div
          className="bg-opacity-20 fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-96 rounded-lg border-2 border-gray-300 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {completedDroplets.find((d) => d.id === selectedId)?.name ||
                  createdDroplets.find((d) => d.id === selectedId)?.name}
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="text-sm text-gray-700">
              {completedDroplets.find((d) => d.id === selectedId)
                ?.description ||
                createdDroplets.find((d) => d.id === selectedId)?.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
