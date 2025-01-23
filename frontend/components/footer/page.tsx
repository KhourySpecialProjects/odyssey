import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex h-20 w-full grid-cols-2 items-center justify-between border-t border-t-[#919191] bg-white px-4">
      
      < Link className="text-xl font-semibold" href="/about">
        About Odyssey
      </Link>
      <Link
        href="https://github.com/KhourySpecialProjects/odyssey/tree/main"
        target="_blank"
        className="flex items-center gap-2"
      >
        <Image
          src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg"
          height={20}
          width={20}
          alt="Github Logo"
          className="mt-[-0.25rem]"
        />
        <h2 className="text-xl font-semibold">View Odyssey on GitHub</h2>
      </Link>
    </footer>
  );
}
