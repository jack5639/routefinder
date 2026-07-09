"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearRoutefinderLocalState } from "@/lib/app-storage";
import { loadQuizAnswers, loadQuizProgressStep, saveQuizAnswers, saveQuizProgressStep } from "@/lib/quiz-storage";
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

type FlowStep = {
  label: string;
  title: string;
  helper: string;
};

const flowSteps: FlowStep[] = [
  {
    label: "Subjects and grades",
    title: "What subjects are you currently studying, and what grades are you working at or predicted to get?",
    helper: "A rough grade band is enough. This helps the demo compare feasibility without judging you.",
  },
  {
    label: "Place and travel",
    title: "Where are you based, and how far would you realistically travel or move for the right opportunity?",
    helper: "Use the distance that would feel realistic on a normal week, not the absolute maximum once.",
  },
  {
    label: "Day to day",
    title: "When you imagine life after school or college, what would you like your day-to-day life to feel like?",
    helper: "Pick the work styles and money pace that feel closest today. They can change later.",
  },
  {
    label: "Interests",
    title: "What are you naturally interested in, even if you're not sure it could become a job?",
    helper: "Choose anything that keeps showing up in your attention, hobbies, lessons, or conversations.",
  },
  {
    label: "Ideas and avoids",
    title: "Is there anything you already think you might want to do, study, or avoid?",
    helper: "This is optional. A messy idea or a clear avoid can both make the comparison more useful.",
  },
];

const stageOptions: Option<CurrentStage>[] = [
  { value: "GCSE", label: "GCSE" },
  { value: "Year 12", label: "Year 12" },
  { value: "Year 13", label: "Year 13" },
  { value: "College", label: "College" },
  { value: "Gap year", label: "Gap year" },
  { value: "Working", label: "Working" },
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
  { value: "needs-building", label: "Building up", hint: "Some routes may need support or a bridge." },
  { value: "steady", label: "Steady", hint: "You are broadly on track for several routes." },
  { value: "strong", label: "Strong", hint: "Many competitive routes may stay in view." },
  { value: "high", label: "High", hint: "High academic attainment." },
];

const travelPresets: Option<string>[] = [
  { value: "30", label: "Stay local", hint: "Around 30 minutes" },
  { value: "60", label: "Commute", hint: "Around 60 minutes" },
  { value: "120", label: "Wider search", hint: "Around 2 hours" },
  { value: "180", label: "Could move", hint: "Compare routes beyond daily travel" },
];

const workStyleOptions: Option<WorkStyle>[] = [
  { value: "academic", label: "Ideas and study", hint: "Reading, theory, essays, research" },
  { value: "practical", label: "Hands-on", hint: "Learning by doing and practising" },
  { value: "creative", label: "Creative", hint: "Making, designing, experimenting" },
  { value: "people", label: "People-focused", hint: "Helping, explaining, collaborating" },
  { value: "technical", label: "Technical", hint: "Systems, tools, detail, logic" },
];

const debtOptions: Option<DebtPreference>[] = [
  { value: "open", label: "Open to costs", hint: "Costs matter, but are not a blocker." },
  { value: "some-concern", label: "Cost-aware", hint: "Costs need to feel clear." },
  { value: "avoid", label: "Prefer lower debt", hint: "Lower-debt routes get more weight." },
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

const avoidOptions: Option<string>[] = [
  { value: "debt concern", label: "High debt" },
  { value: "money pressure", label: "Waiting too long to earn" },
  { value: "location limit", label: "Moving far away" },
  { value: "practical learning", label: "Mostly theory" },
  { value: "grade-constrained", label: "Grade pressure" },
  { value: "subject gap", label: "Missing a useful subject" },
  { value: "needs structured study", label: "Loose structure" },
  { value: "needs evidence of work", label: "Portfolio pressure" },
  { value: "wants broad options", label: "Closing options too early" },
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

const gradeLabels: Record<GradeBand, string> = {
  "needs-building": "building up",
  steady: "steady",
  strong: "strong",
  high: "high",
};

const earnSoonLabels: Record<number, string> = {
  1: "Happy to wait",
  2: "Soon would help",
  3: "Balanced",
  4: "Quite important",
  5: "Very important",
};

function formFromSavedAnswers(answers: QuizAnswers): QuizFormAnswers {
  return {
    ...answers,
    targetCareer: answers.targetCareer ?? "",
    targetCourse: answers.targetCourse ?? "",
  };
}

function cleanList(values: string[]) {
  const seen = new Set<string>();
  const cleanValues: string[] = [];

  values.forEach((value) => {
    const cleanValue = value.trim().replace(/\s+/g, " ");
    const key = cleanValue.toLowerCase();

    if (cleanValue && !seen.has(key)) {
      seen.add(key);
      cleanValues.push(cleanValue);
    }
  });

  return cleanValues;
}

function quizAnswersFromForm(answers: QuizFormAnswers): QuizAnswers {
  const targetCareer = answers.targetCareer.trim();
  const targetCourse = answers.targetCourse.trim();

  return {
    currentStage: answers.currentStage,
    subjects: cleanList(answers.subjects),
    predictedGrades: answers.predictedGrades,
    interests: cleanList(answers.interests),
    ...(targetCareer ? { targetCareer } : {}),
    ...(targetCourse ? { targetCourse } : {}),
    location: answers.location.trim(),
    maxTravelMinutes: answers.maxTravelMinutes,
    debtPreference: answers.debtPreference,
    earnSoon: answers.earnSoon,
    workStyles: answers.workStyles,
    constraints: cleanList(answers.constraints),
  };
}

function splitManualItems(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function mergeUniqueItems(currentItems: string[], additions: string[]) {
  return cleanList([...currentItems, ...additions]);
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function getStepMessage(stepIndex: number, answers: QuizFormAnswers) {
  if (stepIndex === 0 && answers.subjects.length === 0) {
    return "Add at least one subject or course area so the planner has something concrete to compare.";
  }

  if (stepIndex === 1 && !answers.location.trim()) {
    return "Add a town, city, or area. A rough location is enough for this demo.";
  }

  if (stepIndex === 2 && answers.workStyles.length === 0) {
    return "Pick at least one day-to-day style. More than one is fine.";
  }

  if (stepIndex === 3 && answers.interests.length === 0) {
    return "Pick at least one interest so fit can respond to what naturally catches your attention.";
  }

  return "";
}

function getFirstIncompleteStep(answers: QuizFormAnswers) {
  const invalidStep = flowSteps.findIndex((_, index) => getStepMessage(index, answers));
  return invalidStep >= 0 ? invalidStep : flowSteps.length - 1;
}

function chipButtonClass(selected: boolean) {
  return `min-h-12 rounded-lg border-2 px-4 py-3 text-left text-sm font-black leading-5 transition active:translate-y-0.5 sm:text-base ${
    selected
      ? "border-leaf bg-ink text-white shadow-soft"
      : "border-ink/10 bg-white text-ink hover:border-leaf/50 hover:bg-mint/45"
  }`;
}

function answerButtonClass(selected: boolean) {
  return `min-h-20 rounded-lg border-2 px-4 py-4 text-left transition active:translate-y-0.5 ${
    selected
      ? "border-leaf bg-mint text-ink shadow-soft"
      : "border-ink/10 bg-white text-ink hover:border-leaf/50 hover:bg-mint/40"
  }`;
}

function OptionGrid<T extends string>({
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
            className={answerButtonClass(selected)}
          >
            <span className="block break-words text-base font-black leading-6 sm:text-lg">{option.label}</span>
            {option.hint ? <span className="mt-2 block text-sm font-semibold leading-5 text-ink/65">{option.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function MultiChipGrid<T extends string>({
  options,
  selectedValues,
  onToggle,
}: {
  options: Option<T>[];
  selectedValues: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = selectedValues.includes(option.value);

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(option.value)}
            className={chipButtonClass(selected)}
          >
            <span className="block break-words">{option.label}</span>
            {option.hint ? (
              <span className={`mt-1 block text-xs font-semibold leading-5 ${selected ? "text-white/75" : "text-ink/60"}`}>
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function SelectedPills({ values, onRemove }: { values: string[]; onRemove: (value: string) => void }) {
  if (!values.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          aria-label={`Remove ${value}`}
          onClick={() => onRemove(value)}
          className="min-h-10 rounded-lg bg-mint px-3 py-2 text-sm font-black text-ink transition hover:bg-sky"
        >
          <span className="break-words">{value}</span>
          <span aria-hidden="true" className="ml-2 text-ink/50">
            x
          </span>
        </button>
      ))}
    </div>
  );
}

function TextInput({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-black text-ink" htmlFor={id}>
      {label}
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-14 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-4 text-base font-semibold text-ink outline-none transition focus:border-leaf"
      />
    </label>
  );
}

function LoadingQuiz() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-oat px-4 text-ink">
      <p className="rounded-lg bg-white px-4 py-3 text-sm font-black shadow-soft">Opening your Routefinder quiz...</p>
    </main>
  );
}

export default function QuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuizFormAnswers>(emptyAnswers);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);
  const [stepMessage, setStepMessage] = useState("");
  const [subjectDraft, setSubjectDraft] = useState("");
  const [interestDraft, setInterestDraft] = useState("");
  const current = flowSteps[currentStep];
  const progress = useMemo(() => Math.round(((currentStep + 1) / flowSteps.length) * 100), [currentStep]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedAnswers = loadQuizAnswers();

      if (savedAnswers) {
        const savedForm = formFromSavedAnswers(savedAnswers);
        const savedStep = loadQuizProgressStep(flowSteps.length - 1);

        setAnswers(savedForm);
        setCurrentStep(savedStep ?? getFirstIncompleteStep(savedForm));
      }

      setHasLoadedSavedState(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedState) {
      return;
    }

    saveQuizAnswers(quizAnswersFromForm(answers));
    saveQuizProgressStep(currentStep);
  }, [answers, currentStep, hasLoadedSavedState]);

  function updateAnswers(update: (currentAnswers: QuizFormAnswers) => QuizFormAnswers) {
    setAnswers((currentAnswers) => update(currentAnswers));
    setStepMessage("");
  }

  function addDraftValue(kind: "subject" | "interest") {
    const draft = kind === "subject" ? subjectDraft : interestDraft;
    const additions = splitManualItems(draft);

    if (!additions.length) {
      return answers;
    }

    const updatedAnswers =
      kind === "subject"
        ? { ...answers, subjects: mergeUniqueItems(answers.subjects, additions) }
        : { ...answers, interests: mergeUniqueItems(answers.interests, additions) };

    setAnswers(updatedAnswers);
    setStepMessage("");

    if (kind === "subject") {
      setSubjectDraft("");
    } else {
      setInterestDraft("");
    }

    return updatedAnswers;
  }

  function handleDraftKeyDown(kind: "subject" | "interest", event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addDraftValue(kind);
  }

  function startAgain() {
    clearRoutefinderLocalState();
    setAnswers(emptyAnswers);
    setCurrentStep(0);
    setSubjectDraft("");
    setInterestDraft("");
    setStepMessage("Started again. Saved quiz answers and the saved roadmap were cleared.");
  }

  function finishQuiz(nextAnswers: QuizFormAnswers) {
    const invalidStep = flowSteps.findIndex((_, index) => getStepMessage(index, nextAnswers));

    if (invalidStep >= 0) {
      setCurrentStep(invalidStep);
      setStepMessage(getStepMessage(invalidStep, nextAnswers));
      return;
    }

    saveQuizAnswers(quizAnswersFromForm(nextAnswers));
    saveQuizProgressStep(flowSteps.length - 1);
    router.push("/results");
  }

  function goNext() {
    const withSubjectDraft = currentStep === 0 && subjectDraft.trim() ? addDraftValue("subject") : answers;
    const answersToCheck = currentStep === 3 && interestDraft.trim() ? addDraftValue("interest") : withSubjectDraft;
    const message = getStepMessage(currentStep, answersToCheck);

    if (message) {
      setStepMessage(message);
      return;
    }

    setStepMessage("");

    if (currentStep === flowSteps.length - 1) {
      finishQuiz(answersToCheck);
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, flowSteps.length - 1));
  }

  function goBack() {
    setStepMessage("");
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function renderManualEntry(kind: "subject" | "interest") {
    const isSubject = kind === "subject";
    const draft = isSubject ? subjectDraft : interestDraft;
    const setDraft = isSubject ? setSubjectDraft : setInterestDraft;
    const id = isSubject ? "subject-draft" : "interest-draft";

    return (
      <div className="rounded-lg border border-ink/10 bg-white p-3">
        <label className="block text-sm font-black text-ink" htmlFor={id}>
          {isSubject ? "Add another subject or course area" : "Add another interest"}
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            id={id}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => handleDraftKeyDown(kind, event)}
            placeholder={isSubject ? "e.g. sociology, T Level digital" : "e.g. music, fixing things"}
            className="min-h-[3.25rem] w-full rounded-lg border-2 border-ink/10 bg-oat px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
          />
          <button
            type="button"
            onClick={() => addDraftValue(kind)}
            className="min-h-[3.25rem] rounded-lg bg-ink px-4 py-3 text-sm font-black text-white transition hover:bg-leaf"
          >
            Add
          </button>
        </div>
      </div>
    );
  }

  function renderStep() {
    if (currentStep === 0) {
      return (
        <div className="space-y-6">
          <section>
            <p className="mb-3 text-sm font-black text-ink">I am currently in</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {stageOptions.map((option) => {
                const selected = answers.currentStage === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateAnswers((draft) => ({ ...draft, currentStage: option.value }))}
                    className={chipButtonClass(selected)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-3 text-sm font-black text-ink">Subjects or course areas</p>
            <MultiChipGrid
              options={subjectOptions}
              selectedValues={answers.subjects}
              onToggle={(subject) => updateAnswers((draft) => ({ ...draft, subjects: toggleValue(draft.subjects, subject) }))}
            />
          </section>

          {renderManualEntry("subject")}
          <SelectedPills
            values={answers.subjects}
            onRemove={(subject) =>
              updateAnswers((draft) => ({ ...draft, subjects: draft.subjects.filter((item) => item !== subject) }))
            }
          />

          <section>
            <p className="mb-3 text-sm font-black text-ink">Grade band</p>
            <OptionGrid
              options={gradeOptions}
              selectedValue={answers.predictedGrades}
              onSelect={(predictedGrades) => updateAnswers((draft) => ({ ...draft, predictedGrades }))}
            />
          </section>
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <TextInput
            id="location"
            label="Town, city, or area"
            value={answers.location}
            onChange={(location) => updateAnswers((draft) => ({ ...draft, location }))}
            placeholder="e.g. Manchester"
          />

          <section>
            <p className="mb-3 text-sm font-black text-ink">A realistic travel or move range</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {travelPresets.map((preset) => {
                const presetMinutes = Number(preset.value);
                const selected = answers.maxTravelMinutes === presetMinutes;

                return (
                  <button
                    key={preset.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateAnswers((draft) => ({ ...draft, maxTravelMinutes: presetMinutes }))}
                    className={answerButtonClass(selected)}
                  >
                    <span className="block text-base font-black text-ink">{preset.label}</span>
                    <span className="mt-2 block text-sm font-semibold text-ink/65">{preset.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black text-ink/60">Maximum normal journey</p>
                <p className="mt-2 text-5xl font-black leading-none text-ink">{answers.maxTravelMinutes}</p>
              </div>
              <p className="pb-1 text-sm font-black uppercase tracking-wide text-ink/50">minutes</p>
            </div>
            <input
              type="range"
              min={10}
              max={180}
              step={5}
              value={answers.maxTravelMinutes}
              onChange={(event) =>
                updateAnswers((draft) => ({ ...draft, maxTravelMinutes: Number(event.target.value) }))
              }
              className="mt-7 w-full accent-leaf"
              aria-label="Maximum travel or move range in minutes"
            />
            <div className="mt-3 flex justify-between text-xs font-black uppercase tracking-wide text-ink/45">
              <span>Nearby</span>
              <span>Could move</span>
            </div>
          </section>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-6">
          <section>
            <p className="mb-3 text-sm font-black text-ink">A day that sounds more like you</p>
            <MultiChipGrid
              options={workStyleOptions}
              selectedValues={answers.workStyles}
              onToggle={(workStyle) =>
                updateAnswers((draft) => ({ ...draft, workStyles: toggleValue(draft.workStyles, workStyle) }))
              }
            />
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black text-ink/60">Earning soon</p>
                <p className="mt-2 text-5xl font-black leading-none text-ink">{answers.earnSoon}</p>
              </div>
              <p className="pb-1 text-sm font-black text-leaf">{earnSoonLabels[answers.earnSoon]}</p>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={answers.earnSoon}
              onChange={(event) => updateAnswers((draft) => ({ ...draft, earnSoon: Number(event.target.value) }))}
              className="mt-7 w-full accent-leaf"
              aria-label="How important earning soon feels"
            />
            <div className="mt-3 flex justify-between text-xs font-black uppercase tracking-wide text-ink/45">
              <span>Can wait</span>
              <span>Soon matters</span>
            </div>
          </section>

          <section>
            <p className="mb-3 text-sm font-black text-ink">How costs or debt feel right now</p>
            <OptionGrid
              options={debtOptions}
              selectedValue={answers.debtPreference}
              onSelect={(debtPreference) => updateAnswers((draft) => ({ ...draft, debtPreference }))}
            />
          </section>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-5">
          <MultiChipGrid
            options={interestOptions}
            selectedValues={answers.interests}
            onToggle={(interest) => updateAnswers((draft) => ({ ...draft, interests: toggleValue(draft.interests, interest) }))}
          />
          {renderManualEntry("interest")}
          <SelectedPills
            values={answers.interests}
            onRemove={(interest) =>
              updateAnswers((draft) => ({ ...draft, interests: draft.interests.filter((item) => item !== interest) }))
            }
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            id="target-career"
            label="Something I might want to do"
            value={answers.targetCareer}
            onChange={(targetCareer) => updateAnswers((draft) => ({ ...draft, targetCareer }))}
            placeholder="e.g. software developer, nurse, not sure yet"
          />
          <TextInput
            id="target-course"
            label="Something I might want to study"
            value={answers.targetCourse}
            onChange={(targetCourse) => updateAnswers((draft) => ({ ...draft, targetCourse }))}
            placeholder="e.g. computer science, health and social care"
          />
        </div>

        <section>
          <p className="mb-3 text-sm font-black text-ink">Things to handle carefully or avoid</p>
          <button
            type="button"
            aria-pressed={answers.constraints.length === 0}
            onClick={() => updateAnswers((draft) => ({ ...draft, constraints: [] }))}
            className={`${answerButtonClass(answers.constraints.length === 0)} mb-3 w-full`}
          >
            <span className="block text-base font-black text-ink">Nothing major right now</span>
            <span className="mt-2 block text-sm font-semibold text-ink/65">The route cards will still show watch-outs.</span>
          </button>
          <MultiChipGrid
            options={avoidOptions}
            selectedValues={answers.constraints}
            onToggle={(constraint) =>
              updateAnswers((draft) => ({ ...draft, constraints: toggleValue(draft.constraints, constraint) }))
            }
          />
        </section>
      </div>
    );
  }

  if (!hasLoadedSavedState) {
    return <LoadingQuiz />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#fbf8ef,#dceeff_48%,#dff3e8)] text-ink">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-[#fbf8ef]/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-leaf">Routefinder demo</p>
              <p className="mt-1 text-sm font-black text-ink">
                Question {currentStep + 1} of {flowSteps.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white px-3 py-2 text-sm font-black text-ink shadow-sm">{progress}%</div>
              <button
                type="button"
                onClick={startAgain}
                className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-black text-ink transition hover:bg-[#ffe0d8]"
              >
                Start again
              </button>
            </div>
          </div>
          <div
            role="progressbar"
            aria-label="Quiz progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="mt-4 h-3 overflow-hidden rounded-full bg-white"
          >
            <div className="h-full rounded-full bg-leaf transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-3xl flex-col px-4 pb-32 pt-7 sm:px-6">
        <div key={currentStep} className="motion-reduce:animate-none animate-[questionIn_260ms_ease-out]">
          <p className="text-sm font-black uppercase tracking-wide text-leaf">{current.label}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">{current.title}</h1>
          <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-ink/70">{current.helper}</p>

          <div className="mt-8">{renderStep()}</div>

          <div
            aria-live="polite"
            className={`mt-5 rounded-lg px-4 py-3 text-sm font-bold leading-6 ${
              stepMessage ? "border border-coral/30 bg-[#fff0eb] text-ink" : "bg-white/75 text-ink/60"
            }`}
          >
            {stepMessage ||
              `Saved on this device. Current grade band: ${gradeLabels[answers.predictedGrades]}; travel: ${answers.maxTravelMinutes} min.`}
          </div>
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-[#fbf8ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 0}
            className="inline-flex min-h-[3.25rem] flex-1 items-center justify-center rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-sm font-black text-ink transition hover:border-leaf/45 hover:bg-mint disabled:cursor-not-allowed disabled:opacity-45"
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-[3.25rem] flex-[1.45] items-center justify-center rounded-lg bg-ink px-4 py-3 text-sm font-black text-white shadow-soft transition hover:bg-leaf"
          >
            {currentStep === flowSteps.length - 1 ? "Show my routes" : "Continue"}
          </button>
        </div>
      </footer>
    </main>
  );
}
