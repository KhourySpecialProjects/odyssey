import Link from "next/link";

export default function Footer() {
  return (
    <footer className="z-60 flex h-20 w-full grid-cols-2 items-center justify-center border-t border-t-[#919191] px-4">
      <div className="flex scale-75 gap-x-10 md:scale-100">
        <Link className="text-xl font-semibold" href="/about">
          About Odyssey
        </Link>
        <Link className="text-xl font-semibold" href="/website-creators">
          Website Creators
        </Link>
        <Link className="text-xl font-semibold" href="/content-creators">
          Content Creators
        </Link>
        <div className="flex items-center">
          <Link className="text-xl font-semibold" href="/faq">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
}
