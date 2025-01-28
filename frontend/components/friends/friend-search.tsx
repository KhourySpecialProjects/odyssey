"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChangeEvent } from "react";
import { AuthorizedUser } from "@/types";
import { AuthorizedUserBlock } from "../admin/users/authorized-user";
import { FriendSuggestionsBlock } from "./friend-suggestions-block";

interface FriendSearchProps {
    authUsers: AuthorizedUser[];
    curUser: AuthorizedUser;
}

export function FriendSearch({ authUsers, curUser }: FriendSearchProps) {
    const [searchTerm, setSearchItem] = useState("");
    const [isHovered, setIsHovered] = useState(false);
    const [searchResults, setSearchResults] = useState(authUsers);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const searchTerm = e.target.value;
        setSearchItem(searchTerm);

        if (!searchTerm.trim()) {
            setSearchResults(authUsers);
            return;
        }

        const filtered = authUsers.filter(
            (user) =>
                user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email
                    ?.substring(0, user.email?.length - 17)
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                (
                    user.firstName?.toLowerCase() +
                    " " +
                    user.lastName?.toLowerCase()
                ).includes(searchTerm.toLowerCase()),
        );

        //console.log("number of auth users", authUsers)

        if (filtered?.length === 0) {
            setSearchResults([]);
        } else {
            setSearchResults(filtered);
        }
    };

    return (
        <div className="relative w-full flex justify-center mb-4">
            <div className="relative">
                <Input
                    type="search"
                    placeholder="Search..."
                    className="w-full md:w-[125px] lg:w-[500px] flex items-center justify-center"
                    value={searchTerm}
                    onChange={(e) => handleInputChange(e)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                />

                {isHovered && (
                    <div
                        className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {searchResults.length > 0 ? (
                            <ul className="md:space-y-4 p-4">
                                {searchResults.slice(0,10).map((user) => (
                                    <FriendSuggestionsBlock
                                        suggUser={user}
                                        curUser={curUser}
                                        display={true}
                                        key={user.id}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <p>There are no authorized users.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
