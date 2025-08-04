import { Gallery } from "@/types";
import { Slideshow } from "./slideshow";



function StaggeredGallery({
  gallery
}: {
  gallery: Gallery;
}) {

  return (
    <div className="mx-auto h-full w-full text-center pt-16 pb-8 space-y-8">
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
          return (
            <div key={`row-${index}`}>
              {index % 2 == 0 ? (
                <div className="flex flex-row justify-center space-x-8 px-8">
                  <div className="">
                    <Slideshow images={galleryItem.images?.map((image) => image.url) || []} size={500} />
                  </div>
                  <div className="text-left space-y-2">
                    <h1 className="text-3xl font-bold">Title</h1>
                    <p className="text-2xl leading-relaxed">{galleryItem.description}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-row justify-center space-x-8 px-8">
                  <div className="text-left space-y-2">
                    <h1 className="text-3xl font-bold">Title</h1>
                    <p className="text-2xl leading-relaxed">{galleryItem.description}</p>
                  </div>
                  <div className="">
                    <Slideshow images={galleryItem.images?.map((image) => image.url) || []} size={500} />
                  </div>
                </div>
              )
              }
            </div>
          )
        })}
      </ul>
    </div>
  );
}

export { StaggeredGallery };
