import { ArrowRightIcon } from "lucide-react"
import { Button } from "../ui/button"
import Link from "next/link"
import { Droplet } from "@/types"

export function FunFact({
    droplet,
}: {
    droplet: Droplet;
}) {

    return (
        <div className="flex flex-col gap-2 items-center bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-500 p-6 mt-12 rounded-lg">
            <p className="text-lg text-left text-slate-600 dark:text-slate-300"><strong className="text-2xl text-black mr-2 dark:text-slate-300">Did you know?</strong>{droplet.funFact}</p>
            <Link
                className="w-full"
                href={`/d/${droplet.slug}`}
            >
                <Button 
                    className="w-1/2 h-auto text-lg bg-sky-200 hover:scale-105 hover:bg-sky-200 dark:bg-blue-400 dark:hover:bg-blue-400 text-slate-900"
                >
                    <p className="whitespace-normal text-wrap">Dive deeper in <strong className="">{droplet.name}</strong></p>
                    <ArrowRightIcon />
                </Button>
                
            </Link>
        </div>
    )

}