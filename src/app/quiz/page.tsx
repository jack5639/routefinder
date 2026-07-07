"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { saveQuizAnswers } from "@/lib/quiz-storage";
import { useSavedQuizAnswers } from "@/lib/use-saved-quiz-answers";
import type { CurrentStage, DebtPreference, GradeBand, QuizAnswers, WorkStyle } from "@/types";

type QuizFormAnswers = Omit<QuizAnswers, "targetCareer" | "targetCourse"> & {
  targetCareer: string;
  targetCourse: string;
};

type Option<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

const stageOptions: Option<CurrentStage>[] = [
  { value: "GCSE", label: "GCSE", hint: "Choosing next steps soon" },
  { value: "Year 12", label: "Year 12", hint: "Exploring choices early" },
  { value: "Year 13", label: "Year 13", hint: "Applications are getting closer" },
  { value: "College", label: "College", hint: "On a course already" },
  { value: "Gap year", label: "Gap year", hint: "Taking time to decide" },
  { value: "Working", label: "Working", hint: "Building experience now" },
];

const subjectOptions: Option<string>[] = [
  { value: "maths", label: "Maths" },
  { value: "english", label: "English" },
  { value: "computer science", label: "Computer science" },
  { value: "business", label: "Business" },
  { value: "biology", label: "Biology" },
  { value: "physics", label: "Physics" },
  { value: "health and social care", label: "Health and social care" },
  { value: "art", label: "Art or design" },
  { value: "media", label: "Media" },
  { value: "economics", label: "Economics" },
];

const gradeOptions: Option<GradeBand>[] = [
  { value: "needs-building", label: "Building up", hint: "Some grades may need support" },
  { value: "steady", label: "Steady", hint: "Mostly on track" },
  { value: "strong", label: "Strong", hint: "Competitive for many routes" },
  { value: "high", label: "High", hint: "High academic attainment" },
];

const interestOptions: Option<string>[] = [
  { value: "technology", label: "Technology" },
  { value: "problem solving", label: "Problem solving" },
  { value: "health", label: "Health" },
  { value: "people", label: "Helping people" },
  { value: "business", label: "Business" },
  { value: "design", label: "Design" },
  { value: "engineering", label: "Engineering" },
  { value: "gaming", label: "Games" },
  { value: "community", label: "Community" },
  { value: "writing", label: "Writing" },
];

const debtOptions: Option<DebtPreference>[] = [
  { value: "open", label: "Open to it", hint: "Costs are a factor, not a blocker" },
  { value: "some-concern", label: "Some concern", hint: "You want the numbers to feel clear" },
  { value: "avoid", label: "Prefer to avoid", hint: "Lower-debt routes should get extra weight" },
];

const workStyleOptions: Option<WorkStyle>[] = [
  { value: "academic", label: "Academic", hint: "Reading, essays, theory, research" },
  { value: "practical", label: "Practical", hint: "Learning by doing" },
  { value: "creative", label: "Creative", hint: "Making, designing, experimenting" },
  { value: "people", label: "People-focused", hint: "Helping, explaining, collaborating" },
  { value: "technical", label: "Technical", hint: "Tools, systems, detail, logic" },
];

const constraintOptions: Option<string>[] = [
  { value: "debt concern", label: "Debt concern" },
  { value: "money pressure", label: "Need to earn soon" },
  { value: "location limit", label: "Need to stay local" },
  { value: "practical learning", label: "Prefer hands-on learning" },
  { value: "grade-constrained", label: "Grades may limit options" },
  { value: "subject gap", label: "Missing a subject" },
  { value: "needs structured study", label: "Want more structure" },
  { value: "needs evidence of work", label: "Need portfolio evidence" },
];

const steps = [
  {
    label: "Stage",
    title: "Where are you right now?",
    helper: "Pick the closest match. This just helps the planner understand timing.",
  },
  {
    label: "Study",
    title: "What are you studying?",
    helper: "Choose subjects or course areas and the grade band that feels realistic today.",
  },
  {
    label: "Interests",
    title: "What feels worth exploring?",
    helper: "A few interests are enough. Targets are helpful, but optional.",
  },
  {
    label: "Location",
    title: "What needs to fit around travel?",
    helper: "Routes can change a lot when distance and local options matter.",
  },
  {
    label: "Money",
    title: "How should money and earning be weighted?",
    helper: "There is no right answer here. The planner just uses your preference.",
  },
  {
    label: "Style",
    title: "How do you like to work?",
    helper: "This helps compare academic, practical, workplace, and portfolio routes.",
  },
];

const emptyAnswers: QuizFormAnswers = {
  currentStage: "Year 12",
  subjects: [],
  predictedGrades: "steady",
  interests: [],
  targetCareer: "",
  targetCourse: "",
  location: "",
  maxTravelMinutes: 45,
  debtPreference: "some-concern",
  earnSoon: 3,
  workStyles: [],
  constraints: [],
};

function formFromSavedAnswers(answers: QuizAnswers): QuizFormAnswers {
  return {
    ...answers,
    targetCareer: answers.targetCareer ?? "",
    targetCourse: answers.targetCourse ?? "",
  };
}

function quizAnswersFromForm(answers: QuizFormAnswers): QuizAnswers {
  const targetCareer = answers.targetCareer.trim();
  const targetCourse = answers.targetCourse.trim();

  return {
    currentStage: answers.currentStage,
    subjects: answers.subjects,
    predictedGrades: answers.predictedGrades,
    interests: answers.interests,
    ...(targetCareer ? { targetCareer } : {}),
    ...(targetCourse ? { targetCourse } : {}),
    location: answers.location.trim(),
    maxTravelMinutes: answers.maxTravelMinutes,
    debtPreference: answers.debtPreference,
    earnSoon: answers.earnSoon,
    workStyles: answers.workStyles,
    constraints: answers.constraints,
  };
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function getStepMessage(stepIndex: number, answers: QuizFormAnswers) {
  if (stepIndex === 1 && answers.subjects.length === 0) {
    return "Choose at least one subject or course area so feasibility has something real to use.";
  }

  if (stepIndex === 2 && answers.interests.length === 0) {
    return "Choose at least one interest so the route fit can respond to you.";
  }

  if (stepIndex === 3 && !answers.location.trim()) {
    return "Add a town, city, or area. A rough location is enough for this prototype.";
  }

  if (stepIndex === 5 && answers.workStyles.length === 0) {
    return "Pick at least one work style. You can choose more than one.";
  }

  return "";
}

function ChoiceGrid<T extends string>({
  options,
  selectedValue,
  onSelect,
}: {
  options: Option<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = selectedValue === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(option.value)}
            className={`min-h-20 rounded-lg border-2 px-4 py-3 text-left transition ${
              selected
                ? "border-leaf bg-mint shadow-soft"
                : "border-ink/10 bg-white hover:border-leaf/45 hover:bg-mint/45"
            }`}
          >
            <span className="block text-base font-black text-ink">{option.label}</span>
            {option.hint ? <span className="mt-1 block text-sm font-semibold leading-5 text-ink/60">{option.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function MultiChoiceGrid<T extends string>({
  options,
  selectedValues,
  onToggle,
}: {
  options: Option<T>[];
  selectedValues: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = selectedValues.includes(option.value);

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(option.value)}
            className={`min-h-16 rounded-lg border-2 px-4 py-3 text-left transition ${
              selected
                ? "border-leaf bg-mint shadow-soft"
                : "border-ink/10 bg-white hover:border-leaf/45 hover:bg-mint/45"
            }`}
          >
            <span className="block text-base font-black text-ink">{option.label}</span>
            {option.hint ? <span className="mt-1 block text-sm font-semibold leading-5 text-ink/60">{option.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export default function QuizPage() {
  const router = useRouter();
  const savedAnswers = useSavedQuizAnswers();
  const savedFormAnswers = useMemo(
    () => (savedAnswers ? formFromSavedAnswers(savedAnswers) : emptyAnswers),
    [savedAnswers],
  );
  const [draftAnswers, setDraftAnswers] = useState<QuizFormAnswers | null>(null);
  const answers = draftAnswers ?? savedFormAnswers;
  const [currentStep, setCurrentStep] = useState(0);
  const [stepMessage, setStepMessage] = useState("");
  const current = steps[currentStep];
  const progress = useMemo(() => Math.round(((currentStep + 1) / steps.length) * 100), [currentStep]);

  function updateAnswers(update: (currentAnswers: QuizFormAnswers) => QuizFormAnswers) {
    setDraftAnswers((currentAnswers) => update(currentAnswers ?? answers));
  }

  function goNext() {
    const message = getStepMessage(currentStep, answers);

    if (message) {
      setStepMessage(message);
      return;
    }

    setStepMessage("");
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goBack() {
    setStepMessage("");
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const invalidStep = steps.findIndex((_, index) => getStepMessage(index, answers));

    if (invalidStep >= 0) {
      setCurrentStep(invalidStep);
      setStepMessage(getStepMessage(invalidStep, answers));
      return;
    }

    saveQuizAnswers(quizAnswersFromForm(answers));
    router.push("/results");
  }

  function renderStep() {
    if (currentStep === 0) {
      return (
        <ChoiceGrid
          options={stageOptions}
          selectedValue={answers.currentStage}
          onSelect={(currentStage) => updateAnswers((draft) => ({ ...draft, currentStage }))}
        />
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-ink/55">Subjects or course areas</p>
            <MultiChoiceGrid
              options={subjectOptions}
              selectedValues={answers.subjects}
              onToggle={(subject) => updateAnswers((draft) => ({ ...draft, subjects: toggleValue(draft.subjects, subject) }))}
            />
          </div>
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-ink/55">Predicted grade band</p>
            <ChoiceGrid
              options={gradeOptions}
              selectedValue={answers.predictedGrades}
              onSelect={(predictedGrades) => updateAnswers((draft) => ({ ...draft, predictedGrades }))}
            />
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-ink/55">Interests</p>
            <MultiChoiceGrid
              options={interestOptions}
              selectedValues={answers.interests}
              onToggle={(interest) => updateAnswers((draft) => ({ ...draft, interests: toggleValue(draft.interests, interest) }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-ink/65">
              Target career, if you have one
              <input
                value={answers.targetCareer}
                onChange={(event) => updateAnswers((draft) => ({ ...draft, targetCareer: event.target.value }))}
                placeholder="e.g. software developer"
                className="mt-2 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
              />
            </label>
            <label className="text-sm font-bold text-ink/65">
              Target course, if useful
              <input
                value={answers.targetCourse}
                onChange={(event) => updateAnswers((draft) => ({ ...draft, targetCourse: event.target.value }))}
                placeholder="e.g. computer science"
                className="mt-2 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
              />
            </label>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-5">
          <label className="block text-sm font-bold text-ink/65">
            Location
            <input
              value={answers.location}
              onChange={(event) => updateAnswers((draft) => ({ ...draft, location: event.target.value }))}
              placeholder="Town, city, or area"
              className="mt-2 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
            />
          </label>
          <label className="block text-sm font-bold text-ink/65">
            Maximum travel time
            <span className="mt-2 flex items-center justify-between rounded-lg border-2 border-ink/10 bg-white px-4 py-3">
              <span className="text-3xl font-black text-ink">{answers.maxTravelMinutes}</span>
              <span className="text-sm font-black uppercase tracking-wide text-ink/45">minutes</span>
            </span>
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={answers.maxTravelMinutes}
              onChange={(event) =>
                updateAnswers((draft) => ({ ...draft, maxTravelMinutes: Number(event.target.value) }))
              }
              className="mt-4 w-full accent-leaf"
            />
          </label>
        </div>
      );
    }

    if (currentStep === 4) {
      return (
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-ink/55">Debt preference</p>
            <ChoiceGrid
              options={debtOptions}
              selectedValue={answers.debtPreference}
              onSelect={(debtPreference) => updateAnswers((draft) => ({ ...draft, debtPreference }))}
            />
          </div>
          <label className="block text-sm font-bold text-ink/65">
            How important is earning soon?
            <span className="mt-2 flex items-center justify-between rounded-lg border-2 border-ink/10 bg-white px-4 py-3">
              <span className="text-3xl font-black text-ink">{answers.earnSoon}</span>
              <span className="text-sm font-black uppercase tracking-wide text-ink/45">out of 5</span>
            </span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={answers.earnSoon}
              onChange={(event) => updateAnswers((draft) => ({ ...draft, earnSoon: Number(event.target.value) }))}
              className="mt-4 w-full accent-leaf"
            />
          </label>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-black uppercase tracking-wide text-ink/55">Work styles</p>
          <MultiChoiceGrid
            options={workStyleOptions}
            selectedValues={answers.workStyles}
            onToggle={(workStyle) =>
              updateAnswers((draft) => ({ ...draft, workStyles: toggleValue(draft.workStyles, workStyle) }))
            }
          />
        </div>
        <div>
          <p className="mb-3 text-sm font-black uppercase tracking-wide text-ink/55">Constraints</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={answers.constraints.length === 0}
              onClick={() => updateAnswers((draft) => ({ ...draft, constraints: [] }))}
              className={`min-h-16 rounded-lg border-2 px-4 py-3 text-left transition ${
                answers.constraints.length === 0
                  ? "border-leaf bg-mint shadow-soft"
                  : "border-ink/10 bg-white hover:border-leaf/45 hover:bg-mint/45"
              }`}
            >
              <span className="block text-base font-black text-ink">No big constraints right now</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-ink/60">You can still explore backups.</span>
            </button>
            {constraintOptions.map((option) => {
              const selected = answers.constraints.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    updateAnswers((draft) => ({ ...draft, constraints: toggleValue(draft.constraints, option.value) }))
                  }
                  className={`min-h-16 rounded-lg border-2 px-4 py-3 text-left transition ${
                    selected
                      ? "border-leaf bg-mint shadow-soft"
                      : "border-ink/10 bg-white hover:border-leaf/45 hover:bg-mint/45"
                  }`}
                >
                  <span className="block text-base font-black text-ink">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Route-builder quiz</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">Build a route from your real answers.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          Small choices first, calmer comparisons after. You can change your answers whenever you want.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-3xl rounded-lg border border-ink/10 bg-oat p-3 shadow-soft sm:p-4">
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-leaf">
                Step {currentStep + 1} of {steps.length}
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-ink">{current.title}</h2>
            </div>
            <div className="rounded-lg bg-mint px-3 py-2 text-center">
              <div className="text-[0.65rem] font-bold uppercase text-ink/55">Done</div>
              <div className="text-xl font-black text-ink">{progress}%</div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/70">{current.helper}</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-oat">
            <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <span
                key={step.label}
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  index <= currentStep ? "bg-mint text-ink" : "bg-oat text-ink/45"
                }`}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-ink/10 bg-white p-4">{renderStep()}</div>

        {stepMessage ? (
          <div className="mt-3 rounded-lg border border-coral/25 bg-[#fff0eb] px-4 py-3 text-sm font-bold leading-6 text-ink">
            {stepMessage}
          </div>
        ) : (
          <div className="mt-3 rounded-lg bg-mint px-4 py-3 text-sm font-bold leading-6 text-ink/75">
            Nice and steady. These answers stay on this device for now.
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 0}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-45"
          >
            Back
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex min-h-12 flex-[1.4] items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="inline-flex min-h-12 flex-[1.4] items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf"
            >
              Show my routes
            </button>
          )}
        </div>
      </form>
    </AppShell>
  );
}
