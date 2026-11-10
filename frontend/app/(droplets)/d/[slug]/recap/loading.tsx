import DropletPageLoading from "../loading";

// The recap title sits one pt-6 down with responsive padding (see page.tsx)
export default function Loading() {
  return <DropletPageLoading className="px-4 pt-6 sm:px-8 lg:px-40" />;
}
