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
        <div className="flex flex-col gap-2 items-center bg-slate-50 border border-slate-200 p-6 mt-12 rounded-lg">
            <p className="text-lg text-left text-slate-600 dark:text-slate-300"><strong className="text-2xl text-black mr-2">Did you know?</strong>{droplet.funFact}</p>
            <Link
                className="w-full"
                href={`/d/${droplet.slug}`}
            >
                <Button className="w-1/2 text-lg bg-[#8BB5E7] text-slate-900 border border-slate-400"
                    after={<ArrowRightIcon />}>Dive deeper in <strong>{droplet.name}</strong></Button>
            </Link>
        </div>
    )

}