import { Gallery } from "@/types";
import { Slideshow } from "./slideshow";

function StaggeredGallery({ gallery }: { gallery: Gallery }) {
  return (
    <div className="mx-auto h-full w-full space-y-8 pt-16 pb-8 text-center">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {gallery.title}
        </h1>
        <p className="mt-4 text-lg leading-normal text-balance text-slate-600 dark:text-slate-300">
          Check out Odyssey's many features!
        </p>
      </div>

      <ul className="p-4 md:space-y-8">
        {gallery.items.map((galleryItem, index) => {
          const isEven = index % 2 === 0;
          return (
            <li key={`row-${index}`}>
              <div className="flex flex-col justify-center px-8 lg:flex-row lg:space-x-8">
                <div
                  className={`order-1 lg:order-${isEven ? 1 : 2} mb-4 space-y-2 text-left lg:mb-0`}
                >
                  <h1 className="text-3xl font-bold">
                    {galleryItem.title || "Title"}
                  </h1>
                  <p className="text-2xl leading-relaxed">
                    {galleryItem.description}
                  </p>
                </div>

                <div className={`order-2 lg:order-${isEven ? 2 : 1} `}>
                  <Slideshow images={galleryItem.image_urls || []} size={500} />
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
