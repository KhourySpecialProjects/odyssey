import Link from "next/link";
import { ReportBugButton } from "../debug/reportBugButton";
import { getCurrentUser } from "@/lib/auth/session";
import Wave from 'react-wavify';
import { Separator } from "../ui/separator";
import Image from "next/image";
import { DarkMode } from "../explore/dark-mode";

export default async function Footer() {
  const user = await getCurrentUser();
  return (
    <footer className="z-60 flex flex-col w-full items-center bg-[#83C1E1] dark:bg-[#3A6B85]">
      <Wave fill='#2F5569'
        paused={false}
        style={{ display: 'flex',
         }}
        options={{
          height: 2,
          amplitude: 20,
          speed: 0.15,
          points: 3
        }}
        className="bg-transparent dark:bg-transparent"
      />


      <div className="w-full min-h-[250px] bg-[#2F5569] flex flex-row justify-between px-8 pt-4 pb-24 -my-6">
        <div className="flex flex-row justify-between gap-4">
          <Separator orientation={"vertical"} className="bg-slate-200 dark:bg-slate-200 h-full w-[4px]" />
          <div className="flex flex-col items-center justify-center gap-8">
            <Link className="text-sm font-semibold md:text-xl text-white" href="/about">
              About Odyssey
            </Link>
            <Link
              className="text-sm font-semibold md:text-xl text-white"
              href="/website-creators"
            >
              Website Creators
            </Link>
            <Link
              className="text-sm font-semibold md:text-xl text-white"
              href="/content-creators"
            >
              Content Creators
            </Link>
            <Link className="text-sm font-semibold md:text-xl text-white" href="/faq">
              FAQ
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Link href="/">
            <Image
              src={'/circular_logo.svg'}
              alt="Khoury Odyssey Logo"
              width={100}
              height={100}
              priority
            />
          </Link>
        </div>
        <div className="flex flex-col justify-between items-end">
          <Link href="https://github.com/KhourySpecialProjects/odyssey" legacyBehavior role="link">
            <a target="_blank" rel="noopener noreferrer">
              <Image
                src={'/github.svg'}
                alt="Odyssey Github Repo"
                width={50}
                height={50}
                priority
              />
            </a>
          </Link>
          <DarkMode className="scale-[1.2] mx-2" />
          <ReportBugButton user={user} />
        </div>
      </div>


    </footer>
  );
}
