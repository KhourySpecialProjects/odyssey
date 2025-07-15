import { Slideshow } from "./slideshow";

function StaggeredGallery({
  title,
  descriptions,
  images,
}: {
  title: string;
  descriptions: string[];
  images: string[][];
}) {
  /*
    Admin: you can edit both the description and images

    User: all you can do is view
    */

  return (
    <div className="mx-auto h-screen w-full border border-slate-400 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
        {title}
      </h1>

      <Slideshow images={images[0]} />

      {/*<ul className="p-4 md:space-y-4">
                {images.map((image, index) => {
                    return (<img
                        src={imagePreview}
                        alt="Profile"
                        className="mb-4 h-32 w-32 rounded-full border object-cover"
                    />)
                })}
            </ul>*/}
    </div>
  );
}

export { StaggeredGallery };
