import { GradientBackground } from "@/components/gradient-bg";
import { StaggeredGallery } from "@/components/ui/staggered-gallery";
import { getGalleryBySlug } from "@/lib/requests/galleries";
import { Gallery } from "@/types";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Features",
};

export default async function FeaturesPage() {
    const gallery: Gallery | void = await getGalleryBySlug("features");

    return (
        <GradientBackground className="flex-grow">
            <StaggeredGallery gallery={gallery} />
        </GradientBackground>
    );
}
