"use client";

import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { changeEnrollmentRating } from "@/lib/requests/enrollment";
import { getEnrollByID } from "@/lib/requests/enrollment";

interface StarRatingProps {
  value: number;
  enrollmentID: string;
  average: boolean;
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
      } catch (error) {
        console.error("Error updating rating:", error);
      }
    }
  };

  if (average == true) {
    return (
      <div className="flex space-x-1">
        {[...Array(5)].map((_, index) => {
          const ratingValue = index + 1;
          return (
            <label key={index} className="cursor-pointer">
              <Star
                fill={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                stroke={
                  ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"
                }
                className="w-8 h-8"
              />
            </label>
          );
        })}
        <div className="">
          <p className="ml-3 block w-full text-3xl font-normal text-slate-950 text-3xl">
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
                onClick={() => {
                  handleRatingClick(ratingValue);
                }}
                fill={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                stroke={
                  ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"
                }
                className="w-8 h-8"
              />
            </label>
          );
        })}
      </div>
    );
  }
};

export { StarRating };
