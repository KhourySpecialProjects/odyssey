import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex h-20 w-full grid-cols-2 items-center justify-between border-t border-t-[#919191] bg-white px-4">
      <Link className="text-xl font-semibold" href="/content-creators">
        Content Creators
      </Link>
      <Link className="text-xl font-semibold" href="/about">
        About Odyssey
      </Link>
      <Link className="text-xl font-semibold" href="/website-creators">
        Website Creators
      </Link>
    </footer>
  );
}
