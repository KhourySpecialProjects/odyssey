'use client'

import React, { useState, useEffect } from 'react';
import { User, Linkedin, Github } from 'lucide-react';
import { getAuthorizedUserByEmail } from '@/lib/requests/authorized-user';

import { AuthorizedUser, Droplet } from '@/types';



export default function PublicProfilePage() {
  const [userData, setUserData] = useState<AuthorizedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Extract email from URL path or query parameter
        // Example: /profile/user@example.com or /profile?email=user@example.com
        const pathParts = window.location.pathname.split('/');
        const emailFromPath = pathParts[pathParts.length - 1];
        
        const urlParams = new URLSearchParams(window.location.search);
        const emailFromQuery = urlParams.get('email');
        
        const userEmail = emailFromQuery || decodeURIComponent(emailFromPath);

        if (!userEmail) {
          setError('No user specified');
          setLoading(false);
          return;
        }


        const user: AuthorizedUser = await getAuthorizedUserByEmail(userEmail) as AuthorizedUser;
        
        // Check if user profile is public (you'll need to add isPublic field to AuthorizedUser)
        // For now, assuming all enabled users are public
        if (!user.isEnabled) {
          setError('Profile not available');
          setLoading(false);
          return;
        }

        setUserData(user);
        setLoading(false);
      } catch (err) {
        setError('Profile not found');
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile Not Found</h1>
          <p className="text-gray-600">This profile is either private or does not exist.</p>
        </div>
      </div>
    );
  }

  // Separate droplets into completed (from enrollments/playlists) and created
  const completedDroplets = userData.droplets || [];
  
  // Flatten playlists and add unique keys to handle duplicate droplet IDs
  const createdDroplets = userData.created_playlists?.flatMap((playlist, playlistIndex) => 
    (playlist.droplets || []).map((droplet, dropletIndex) => ({
      ...droplet,
      uniqueKey: `${playlist.id}-${droplet.id}-${playlistIndex}-${dropletIndex}`
    }))
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* ===== LAYOUT CHANGE: Two-column grid layout ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ===== LEFT SIDEBAR START - Profile Info ===== */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <div className="flex flex-col items-center">
                {/* Profile Photo */}
                <div className="w-32 h-32 rounded-full border-4 border-gray-300 flex items-center justify-center bg-gray-100 mb-4 overflow-hidden">
                  {userData.profilePhoto ? (
                    <img 
                      src={userData.profilePhoto} 
                      alt={`${userData.firstName} ${userData.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>

                {/* Name */}
                <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">
                  {userData.firstName} {userData.lastName}
                </h1>

                {/* Bio */}
                {userData.bio && (
                  <div 
                    className="text-gray-600 text-center text-sm mb-6"
                    dangerouslySetInnerHTML={{ __html: userData.bio }}
                  />
                )}

                {/* Social Links */}
                <div className="flex gap-3">
                  {userData.linkedin && (
                    <a
                      href={userData.linkedin.startsWith('http') ? userData.linkedin : `https://${userData.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 border-2 border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <span className="text-sm font-semibold text-gray-700"><Linkedin></Linkedin></span>
                    </a>
                  )}
                  {userData.github && (
                    <a
                      href={userData.github.startsWith('http') ? userData.github : `https://${userData.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 border-2 border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 transition-colors"
                      aria-label="GitHub"
                    >
                      <span className="text-sm font-semibold text-gray-700">Git</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* ===== LEFT SIDEBAR END ===== */}

          {/* ===== RIGHT SIDE START - Droplets ===== */}
          <div className="lg:col-span-9 space-y-8">
            {/* Droplets Completed */}
            {completedDroplets.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Droplets completed
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {completedDroplets.map((droplet) => (
                    <div
                      key={droplet.id}
                      className="border-2 border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors cursor-pointer min-h-32 flex flex-col items-center justify-center"
                    >
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900">{droplet.name}</h3>
                        {droplet.name && (
                          <p className="text-sm text-gray-600 mt-2">{droplet.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Droplets Created */}
            {createdDroplets.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Droplets Created
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {createdDroplets.map((droplet) => (
                    <div
                      key={droplet.uniqueKey}
                      className="border-2 border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors cursor-pointer min-h-32 flex flex-col items-center justify-center"
                    >
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900">{droplet.name}</h3>
                        {droplet.name && (
                          <p className="text-sm text-gray-600 mt-2">{droplet.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show message if no droplets */}
            {completedDroplets.length === 0 && createdDroplets.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600">No droplets to display yet.</p>
              </div>
            )}
          </div>
          {/* ===== RIGHT SIDE END ===== */}
          
        </div>
        {/* ===== LAYOUT CHANGE END ===== */}
      </div>
    </div>
  );
}