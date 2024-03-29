import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function Quiz({ data }: { data: any }) {
  return (
    <div className="px-6 py-12 my-12 -mx-6 border rounded-md not-prose bg-slate-50 border-slate-200">
      <div className="text-center">
        <h2 className="text-3xl font-black">Let&rsquo;s Check In!</h2>
        <p className="mt-1 text-slate-500">
          Test your knowledge and see what you just learned.
        </p>
      </div>

      <div>
        {data.questions.map((q: any) => (
          <div
            key={q.id}
            className="w-full max-w-lg p-6 mx-auto mt-8 bg-white border rounded-md divide-slate-200 border-slate-200"
          >
            <div
              className="text-center text-pretty"
              dangerouslySetInnerHTML={{ __html: q.content }}
            ></div>
            <RadioGroup className="mt-6">
              {q.answerOptions.map((a: any, number: number) => (
                <div key={a.id}>
                  <RadioGroupItem
                    value={a.id}
                    id={a.id}
                    className="sr-only peer"
                  />
                  <Label
                    htmlFor={a.id}
                    className="flex cursor-pointer flex-row items-center gap-4 rounded-md border border-slate-200 hover:border-sky-700 bg-popover p-4 hover:bg-slate-50 transition-colors hover:text-sky-700 peer-data-[state=checked]:border-sky-700 [&:has([data-state=checked])]:border-sky-700"
                  >
                    <span className="flex items-center justify-center w-8 h-8 text-sm font-bold border rounded-full border-sky-700 bg-slate-100 text-sky-700">
                      {number === 0
                        ? "A"
                        : number === 1
                        ? "B"
                        : number === 2
                        ? "C"
                        : number === 3
                        ? "D"
                        : "?"}
                    </span>
                    {a.content}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
    </div>
  );
}
