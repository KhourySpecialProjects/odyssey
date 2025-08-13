import { Gallery } from "@/types";
import { Slideshow } from "./slideshow";

function StaggeredGallery({ gallery }: { gallery: Gallery }) {
  return (
    <div className="mx-auto h-full w-full space-y-12 pb-8 text-center">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          {gallery.title}
        </h1>
        <p className="mt-4 text-lg leading-normal text-balance text-slate-600 dark:text-slate-300">
          Check out Odyssey's many features!
        </p>
      </div>

      <ul className="space-y-20 p-4">
        {gallery.items.map((galleryItem, index) => {
          const isEven = index % 2 === 0;
          return (
            <li key={`row-${index}`}>
              <div className="flex flex-col items-center justify-center md:gap-8 md:px-8 lg:flex-row">
                <div
                  className={`order-1 ${isEven ? "lg:order-1" : "lg:order-2"} mb-4 space-y-2 text-left lg:mb-0 lg:w-1/2`}
                >
                  <h1 className="text-2xl font-bold sm:text-3xl">
                    {galleryItem.title || "Title"}
                  </h1>
                  <p className="text-xl leading-relaxed text-slate-700 sm:text-2xl dark:text-white">
                    {galleryItem.description}
                  </p>
                </div>

                <div
                  className={`order-2 ${isEven ? "lg:order-2" : "lg:order-1"} lg:w-1/2`}
                >
                  <div className="mx-auto aspect-square w-full max-w-[500px]">
                    <Slideshow images={galleryItem.image_urls || []} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { StaggeredGallery };
