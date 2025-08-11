"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

function Slideshow({ images }: { images: string[] }) {
  const [slideshowPosition, setSlideshowPosition] = useState(0);

  const arrowSize = 64;
  const arrowColor = "#262626ff";

  return (
    <div
      className={`relative mx-auto flex h-full w-full scale-100 justify-between overflow-hidden border border-slate-200 bg-slate-50 text-center shadow-[0px_0px_8px_rgb(29,58,138)] dark:shadow-[0px_0px_12px_rgb(0,255,255)]`}
    >
      <button
        onClick={() => setSlideshowPosition((prev) => prev - 1)}
        className={`z-50 p-0 ${slideshowPosition <= 0 ? "opacity-0" : ""}`}
        disabled={slideshowPosition <= 0}
      >
        <ChevronLeft size={arrowSize} color={arrowColor} />
      </button>

      <ul className="">
        {images.map((image, index) => {
          if (images.length === 0) {
            return (
              <div className="flex h-full w-full items-center justify-center border border-slate-200 bg-slate-50">
                <p className="text-slate-500">No images available</p>
              </div>
            );
          }
          return (
            <div key={`${index}`} className="z-10">
              <img
                src={image}
                alt="Gallery Image"
                className="absolute z-10 h-full w-full transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(${(index - slideshowPosition) * 100 - 50}%)`,
                }}
              />
            </div>
          );
        })}
      </ul>

      <button
        onClick={() => setSlideshowPosition((prev) => prev + 1)}
        className={`z-50 ${slideshowPosition >= images.length - 1 ? "opacity-0" : ""}`}
        disabled={slideshowPosition >= images.length - 1}
      >
        <ChevronRight size={arrowSize} color={arrowColor} />
      </button>
    </div>
  );
}

export { Slideshow };
