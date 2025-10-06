"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { createFavorite, deleteFavorite } from "@/lib/requests/favorite";
import { Button } from "@/components/ui/button";

interface FavoriteButtonProps {
  dropletId: number;
  initialFavoriteId?: number | null; // If already favorited, pass the favorite ID
  onToggle?: (isFavorited: boolean) => void; // Optional callback
}

export function FavoriteButton({
  dropletId,
  initialFavoriteId = null,
  onToggle,
}: FavoriteButtonProps) {
  const [favoriteId, setFavoriteId] = useState<number | null>(
    initialFavoriteId,
  );
  const [isLoading, setIsLoading] = useState(false);

  const isFavorited = favoriteId !== null;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);

    try {
      if (isFavorited && favoriteId) {
        // Unfavorite
        await deleteFavorite(favoriteId);
        setFavoriteId(null);
        onToggle?.(false);
      } else {
        // Favorite
        const result = await createFavorite(dropletId);
        setFavoriteId(result.id);
        onToggle?.(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={isFavorited ? "Unfavorite" : "Favorite"}
    >
      <Star
        className={
          isFavorited ? "fill-yellow-400 text-yellow-400" : "text-gray-500"
        }
        size={24}
      />
    </Button>
  );
}
