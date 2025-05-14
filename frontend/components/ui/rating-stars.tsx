"use client";

import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { changeEnrollmentRating } from "@/lib/requests/enrollment";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { toast } from "sonner";

interface StarRatingProps {
  value: number;
  enrollmentID: string;
  average: boolean;
  uniqueId?: string;
}

/**
 * This function creates the 5 star rating component
 *  with the option to make it an interactive individual rating tool
 * or a static representation of the average rating of a Droplet.
 * (the average prop toggles this)
 * @param value - initial value to set the stars
 * @param enrollmentID - id of the enrollment if this is being used for rating, otherwise ""
 * @param average - false to make the stars interactive, true for not
 */
const StarRating: React.FC<StarRatingProps> = ({
  value: initialValue,
  enrollmentID,
  average,
  uniqueId = "default",
}) => {
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(initialValue);

  useEffect(() => {
    const fetchRating = async () => {
      if (!average && enrollmentID) {
        try {
          const enrollment = await getEnrollByID(enrollmentID);
          if (enrollment?.rating) {
            setRating(enrollment.rating);
          }
        } catch (error) {
          console.error("Error fetching rating:", error);
        }
      }
    };
    fetchRating();
  }, [enrollmentID, average]);

  const handleRatingClick = async (newRating: number) => {
    if (!average && enrollmentID) {
      try {
        await changeEnrollmentRating(newRating, enrollmentID);
        setRating(newRating);
        setHover(newRating);
        toast.success("Rating submitted successfully");
      } catch (error) {
        console.error("Error updating rating:", error);
      }
    }
  };

  const gradientIds = [...Array(5)].map(
    (_, i) => `star-gradient-${uniqueId}-${i}`,
  );

  if (average == true) {
    return (
      <div className="flex space-x-1">
        {[...Array(5)].map((_, index) => {
          const ratingValue = index + 1;
          const fillPercentage =
            ratingValue <= Math.floor(rating)
              ? 100
              : ratingValue > Math.ceil(rating)
                ? 0
                : (rating % 1) * 100;
          return (
            <label key={index} className="cursor-default">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient
                    id={gradientIds[index]}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset={`${fillPercentage}%`} stopColor="#ffc107" />
                    <stop offset={`${fillPercentage}%`} stopColor="#e4e5e9" />
                  </linearGradient>
                </defs>
                <path
                  d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                  fill={`url(#${gradientIds[index]})`}
                  stroke={ratingValue <= rating ? "#ffc107" : "#e4e5e9"}
                />
              </svg>
            </label>
          );
        })}
        <div className="">
          <p className="ml-3 block w-full text-3xl font-normal text-slate-950 dark:text-slate-300">
            {rating.toFixed(1)}
          </p>
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex space-x-1">
        {[...Array(5)].map((_, index) => {
          const ratingValue = index + 1;
          return (
            <label key={index} className="cursor-pointer">
              <input
                type="radio"
                className="hidden"
                value={ratingValue}
                checked={ratingValue == rating}
                onChange={() => handleRatingClick(ratingValue)}
              />
              <Star
                onMouseEnter={() => setHover(ratingValue)}
                onMouseLeave={() => setHover(0)}
                fill={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                stroke={
                  ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"
                }
                className="h-8 w-8"
              />
            </label>
          );
        })}
      </div>
    );
  }
};

export { StarRating };
