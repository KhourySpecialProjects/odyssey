import Link from "next/link";
import { ReportBugButton } from "../debug/reportBugButton";
import { getCurrentUser } from "@/lib/auth/session";
import Wave from "react-wavify";
import { Separator } from "../ui/separator";
import Image from "next/image";
import { DarkMode } from "../explore/dark-mode";

export default async function Footer() {
  const user = await getCurrentUser();
  const linkStyles =
    "text-sm font-semibold md:text-xl text-white hover:scale-105";
  return (
    <footer className="z-60 flex w-full flex-col items-center bg-[#83C1E1] dark:bg-[#3A6B85]">
      <Wave
        fill="#2F5569"
        paused={false}
        style={{ display: "flex" }}
        options={{
          height: 2,
          amplitude: 20,
          speed: 0.15,
          points: 3,
        }}
        className="bg-transparent dark:bg-transparent"
      />

      <div className="-my-10 flex min-h-[250px] w-full flex-row justify-between bg-[#2F5569] px-6 pt-4 pb-24 md:px-16">
        <div className="flex w-1/2 flex-row justify-start gap-4 md:w-1/4">
          <Separator
            orientation={"vertical"}
            className="h-full w-[3px] bg-slate-200 dark:bg-slate-200"
          />
          <div className="flex flex-col items-center justify-center gap-10 py-4">
            <Link className={linkStyles} href="/about">
              About Odyssey
            </Link>
            <Link className={linkStyles} href="/website-creators">
              Website Creators
            </Link>
            <Link className={linkStyles} href="/content-creators">
              Content Creators
            </Link>
            <Link className={linkStyles} href="/faq">
              FAQ
            </Link>
          </div>
        </div>
        <div className="hidden w-1/2 items-center justify-center md:flex">
          <Link href="/">
            <Image
              src={"/circular_logo.svg"}
              alt="Khoury Odyssey Logo"
              width={150}
              height={150}
              priority
            />
          </Link>
        </div>
        <div className="flex w-1/2 flex-col items-end justify-between md:w-1/4">
          <Link
            href="https://github.com/KhourySpecialProjects/odyssey"
            legacyBehavior
            role="link"
          >
            <a target="_blank" rel="noopener noreferrer">
              <Image
                src={"/github.svg"}
                alt="Odyssey Github Repo"
                width={50}
                height={50}
                priority
                className="hover:scale-105"
              />
            </a>
          </Link>
          <DarkMode className="mx-2 scale-[1.2]" />
          <ReportBugButton user={user} />
        </div>
      </div>
    </footer>
  );
}
