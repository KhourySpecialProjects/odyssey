import { ArrowRightIcon } from "lucide-react"
import { Button } from "../ui/button"

export function FunFact({
    fact,
}: {
    fact: string
}) {

    return (
        <div className="flex flex-col gap-2 items-center bg-slate-50 border border-slate-200 p-4 mt-12 rounded-lg">
            <p className="text-lg text-left text-slate-600 dark:text-slate-300"><strong className="text-2xl text-black mr-2">Did you know?</strong>{fact}</p>
            <Button className="w-1/2 text-lg bg-[#8BB5E7] text-slate-900 border border-slate-400"
                after={<ArrowRightIcon />}>Dive deeper in <strong>Cryptography</strong></Button>
        </div>
    )

}