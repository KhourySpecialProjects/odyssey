"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

function Slideshow({ images }: { images: string[] }) {
  const [slideshowPosition, setSlideshowPosition] = useState(0);

  return (
    <div className="relative mx-auto flex h-[300px] w-[300px] justify-between border border-slate-200 bg-slate-50 text-center overflow-hidden">
      <button
        onClick={() => setSlideshowPosition((prev) => prev - 1)}
        className={`z-50`}
        disabled={slideshowPosition <= 0}
      >
        <ChevronLeft size={64} color="#8d8b8bff" />
      </button>

      <ul className="">
        {images.map((image, index) => {
          return (
            <div key={`${index}`} className="z-10">
              <img
                src={image}
                alt="Profile"
                className={`transition-scale absolute z-10 h-full w-full ${index === slideshowPosition ? "right-0" : "right-full opacity-0"} text-gray-900 duration-500 ease-in-out`}
              />
            </div>
          );
        })}
      </ul>

      <button
        onClick={() => setSlideshowPosition((prev) => prev + 1)}
        className={`z-50`}
        disabled={slideshowPosition >= images.length - 1}
      >
        <ChevronRight size={64} color="#8d8b8bff" />
      </button>
    </div>
  );
}

export { Slideshow };
