import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { defaultQuizAnswers } from "@/data/default-answers";

const quizSections = [
  {
    title: "Where are you now?",
    prompt: "Current stage",
    value: defaultQuizAnswers.currentStage,
    options: ["GCSE", "Year 12", "Year 13", "College", "Gap year", "Working"],
  },
  {
    title: "What feels interesting?",
    prompt: "Interests",
    value: defaultQuizAnswers.interests.join(", "),
    options: ["technology", "health", "business", "design", "people", "engineering"],
  },
  {
    title: "What needs to fit around life?",
    prompt: "Constraints",
    value: defaultQuizAnswers.constraints.join(", "),
    options: ["debt concern", "location limit", "money pressure", "practical learning"],
  },
];

export default function QuizPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Route-builder quiz</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">Start with what matters now.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          This prototype uses a mock answer set so the full flow works today. The inputs below show
          the structure planned for the first real quiz.
        </p>

        <form className="mt-6 space-y-4">
          {quizSections.map((section) => (
            <fieldset key={section.title} className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
              <legend className="px-1 text-lg font-black text-ink">{section.title}</legend>
              <label className="mt-3 block text-sm font-bold text-ink/65" htmlFor={section.prompt}>
                {section.prompt}
              </label>
              <input
                id={section.prompt}
                value={section.value}
                readOnly
                className="mt-2 w-full rounded-lg border border-ink/15 bg-oat px-4 py-3 text-sm font-semibold text-ink outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {section.options.map((option) => (
                  <span key={option} className="rounded-full bg-mint px-3 py-2 text-xs font-bold text-ink/75">
                    {option}
                  </span>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-ink/65">
                Predicted grades
                <select
                  defaultValue={defaultQuizAnswers.predictedGrades}
                  className="mt-2 w-full rounded-lg border border-ink/15 bg-oat px-4 py-3 text-sm font-semibold text-ink"
                >
                  <option value="needs-building">Building up</option>
                  <option value="steady">Steady</option>
                  <option value="strong">Strong</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="text-sm font-bold text-ink/65">
                Travel distance
                <input
                  type="number"
                  defaultValue={defaultQuizAnswers.maxTravelMinutes}
                  className="mt-2 w-full rounded-lg border border-ink/15 bg-oat px-4 py-3 text-sm font-semibold text-ink"
                />
              </label>
            </div>
          </div>
        </form>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/results"
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf"
          >
            Use mock answers
          </Link>
          <Link
            href="/simulator"
            className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
          >
            Try what-if simulator
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
