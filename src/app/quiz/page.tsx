"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearQuizAnswers,
  loadQuizProgressStep,
  saveQuizAnswers,
  saveQuizProgressStep,
} from "@/lib/quiz-storage";
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

type FlowStep = {
  label: string;
  title: string;
  helper: string;
};

const stageOptions: Option<CurrentStage>[] = [
  { value: "GCSE", label: "GCSE", hint: "You are choosing what comes next." },
  { value: "Year 12", label: "Year 12", hint: "You are exploring options early." },
  { value: "Year 13", label: "Year 13", hint: "Applications or next steps are closer." },
  { value: "College", label: "College", hint: "You are already on a course." },
  { value: "Gap year", label: "Gap year", hint: "You are taking time to decide." },
  { value: "Working", label: "Working", hint: "You are building experience now." },
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
  { value: "needs-building", label: "Building up", hint: "Some grades may need support or a bridge route." },
  { value: "steady", label: "Steady", hint: "Mostly on track for several routes." },
  { value: "strong", label: "Strong", hint: "Competitive for many routes." },
  { value: "high", label: "High", hint: "High academic attainment." },
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

const constraintOptions: Option<string>[] = [
  { value: "debt concern", label: "Keeping debt low" },
  { value: "money pressure", label: "Needing to earn sooner" },
  { value: "location limit", label: "Staying close to home" },
  { value: "practical learning", label: "Avoiding mostly theory" },
  { value: "grade-constrained", label: "Grades may need a bridge" },
  { value: "subject gap", label: "Missing a useful subject" },
  { value: "needs structured study", label: "Needing clear structure" },
  { value: "needs evidence of work", label: "Needing portfolio evidence" },
  { value: "wants broad options", label: "Keeping broad options open" },
  { value: "returning to study", label: "Returning to study" },
];

const debtOptions: Option<DebtPreference>[] = [
  { value: "open", label: "Open to it", hint: "Costs matter, but they are not a blocker." },
  { value: "some-concern", label: "Some concern", hint: "You want the costs to feel clear." },
  { value: "avoid", label: "Prefer to avoid", hint: "Lower-debt routes should get extra weight." },
];

const workStyleOptions: Option<WorkStyle>[] = [
  { value: "academic", label: "Academic", hint: "Reading, essays, theory, research" },
  { value: "practical", label: "Practical", hint: "Learning by doing" },
  { value: "creative", label: "Creative", hint: "Making, designing, experimenting" },
  { value: "people", label: "People-focused", hint: "Helping, explaining, collaborating" },
  { value: "technical", label: "Technical", hint: "Tools, systems, detail, logic" },
];

const flowSteps: FlowStep[] = [
  {
    label: "Stage",
    title: "Where are you right now?",
    helper: "Choose the closest match. It only helps with timing.",
  },
  {
    label: "Subjects",
    title: "What are you studying?",
    helper: "Tap a few subjects or add your own course area.",
  },
  {
    label: "Grades",
    title: "Which grade band feels realistic?",
    helper: "This is about planning, not judging.",
  },
  {
    label: "Interests",
    title: "What feels worth exploring?",
    helper: "Pick anything that feels like it could matter.",
  },
  {
    label: "Constraints",
    title: "Anything the plan should work around?",
    helper: "Pick any that matter, or leave none selected.",
  },
  {
    label: "Career",
    title: "Do you have a target career?",
    helper: "Optional. A rough idea is enough.",
  },
  {
    label: "Course",
    title: "Do you have a target course?",
    helper: "Optional. This can be a subject, course, or training area.",
  },
  {
    label: "Location",
    title: "Where should the search start?",
    helper: "A town, city, or area is enough for this prototype.",
  },
  {
    label: "Travel",
    title: "How far could you travel?",
    helper: "Set the longest normal journey you would consider.",
  },
  {
    label: "Debt",
    title: "How do you feel about debt?",
    helper: "This helps compare lower-cost and higher-cost routes.",
  },
  {
    label: "Earning",
    title: "How important is earning soon?",
    helper: "Move the slider toward the pace that feels right.",
  },
  {
    label: "Style",
    title: "How do you prefer to work?",
    helper: "Choose one or more styles that usually suit you.",
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

function quizAnswersFromForm(answers: QuizFormAnswers): QuizAnswers {
  const targetCareer = answers.targetCareer.trim();
  const targetCourse = answers.targetCourse.trim();

  return {
    currentStage: answers.currentStage,
    subjects: answers.subjects.map((subject) => subject.trim()).filter(Boolean),
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

function splitManualItems(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function mergeUniqueItems(currentItems: string[], additions: string[]) {
  const existing = new Set(currentItems.map((item) => item.toLowerCase()));
  const nextItems = [...currentItems];

  additions.forEach((item) => {
    const key = item.toLowerCase();

    if (!existing.has(key)) {
      existing.add(key);
      nextItems.push(item);
    }
  });

  return nextItems;
}

function getStepMessage(stepIndex: number, answers: QuizFormAnswers) {
  if (stepIndex === 1 && answers.subjects.length === 0) {
    return "Add at least one subject or course area so the planner has something real to compare.";
  }

  if (stepIndex === 3 && answers.interests.length === 0) {
    return "Pick at least one interest so route fit can respond to you.";
  }

  if (stepIndex === 7 && !answers.location.trim()) {
    return "Add a town, city, or area. A rough location is enough.";
  }

  if (stepIndex === 11 && answers.workStyles.length === 0) {
    return "Pick at least one work style. You can choose more than one.";
  }

  return "";
}

function getFirstIncompleteStep(answers: QuizFormAnswers) {
  const invalidStep = flowSteps.findIndex((_, index) => getStepMessage(index, answers));
  return invalidStep >= 0 ? invalidStep : flowSteps.length - 1;
}

function answerButtonClass(selected: boolean) {
  return `min-h-20 w-full rounded-lg border-2 px-4 py-4 text-left shadow-sm transition duration-200 active:translate-y-0.5 ${
    selected
      ? "border-leaf bg-mint shadow-soft"
      : "border-ink/10 bg-white hover:border-leaf/50 hover:bg-mint/40"
  }`;
}

function chipButtonClass(selected: boolean) {
  return `min-h-12 rounded-lg border-2 px-4 py-3 text-left text-sm font-black leading-5 transition duration-200 active:translate-y-0.5 sm:text-base ${
    selected
      ? "border-leaf bg-ink text-white shadow-soft"
      : "border-ink/10 bg-white text-ink hover:border-leaf/50 hover:bg-mint/45"
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
            <span className="block break-words text-lg font-black leading-6 text-ink">{option.label}</span>
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

function WelcomeScreen({
  savedAnswers,
  onBegin,
  onContinue,
  onStartAgain,
}: {
  savedAnswers: QuizAnswers | null;
  onBegin: () => void;
  onContinue: () => void;
  onStartAgain: () => void;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(220,238,255,0.95),transparent_34%),linear-gradient(135deg,#fbf8ef,#dff3e8_58%,#dceeff)] px-4 py-5 text-ink sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-3xl flex-col justify-center">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Routefinder</p>
        <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">Let&apos;s build your route plan</h1>
        <p className="mt-4 max-w-xl text-lg font-semibold leading-8 text-ink/70">
          A few focused questions, then a calm comparison of possible education, training, and work routes.
        </p>

        <div className="mt-8 grid gap-3 sm:max-w-md">
          {savedAnswers ? (
            <>
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-ink px-5 py-4 text-base font-black text-white shadow-soft transition hover:bg-leaf"
              >
                Continue my plan
              </button>
              <button
                type="button"
                onClick={onStartAgain}
                className="inline-flex min-h-14 w-full items-center justify-center rounded-lg border-2 border-ink/10 bg-white px-5 py-4 text-base font-black text-ink transition hover:border-leaf/50 hover:bg-mint"
              >
                Start again
              </button>
              <div className="rounded-lg border border-ink/10 bg-white/80 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-ink/45">Saved on this device</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
                  {savedAnswers.currentStage}, {gradeLabels[savedAnswers.predictedGrades]} grades
                  {savedAnswers.location ? `, ${savedAnswers.location}` : ""}.
                </p>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onBegin}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-ink px-5 py-4 text-base font-black text-white shadow-soft transition hover:bg-leaf"
            >
              Begin
            </button>
          )}
        </div>

        <p className="mt-5 max-w-md text-sm font-semibold leading-6 text-ink/60">
          No account needed. Your answers stay in this browser for now.
        </p>
      </section>
    </main>
  );
}

function ProgressHeader({ currentStep, progress }: { currentStep: number; progress: number }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-[#fbf8ef]/94 px-4 py-4 backdrop-blur sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-leaf">Routefinder</p>
            <p className="mt-1 text-sm font-black text-ink">
              Question {currentStep + 1} of {flowSteps.length}
            </p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2 text-sm font-black text-ink shadow-sm">{progress}%</div>
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
  );
}

export default function QuizPage() {
  const router = useRouter();
  const savedAnswers = useSavedQuizAnswers();
  const [answers, setAnswers] = useState<QuizFormAnswers>(emptyAnswers);
  const [currentStep, setCurrentStep] = useState(0);
  const [flowStarted, setFlowStarted] = useState(false);
  const [stepMessage, setStepMessage] = useState("");
  const [subjectDraft, setSubjectDraft] = useState("");
  const current = flowSteps[currentStep];
  const progress = useMemo(() => Math.round(((currentStep + 1) / flowSteps.length) * 100), [currentStep]);

  useEffect(() => {
    if (!flowStarted) {
      return;
    }

    saveQuizAnswers(quizAnswersFromForm(answers));
    saveQuizProgressStep(currentStep);
  }, [answers, currentStep, flowStarted]);

  function updateAnswers(update: (currentAnswers: QuizFormAnswers) => QuizFormAnswers) {
    setAnswers((currentAnswers) => update(currentAnswers));
    setStepMessage("");
  }

  function startNewFlow() {
    setAnswers(emptyAnswers);
    setCurrentStep(0);
    setSubjectDraft("");
    setStepMessage("");
    setFlowStarted(true);
  }

  function continueSavedFlow() {
    if (!savedAnswers) {
      startNewFlow();
      return;
    }

    const savedForm = formFromSavedAnswers(savedAnswers);
    const savedStep = loadQuizProgressStep(flowSteps.length - 1);

    setAnswers(savedForm);
    setCurrentStep(savedStep ?? getFirstIncompleteStep(savedForm));
    setSubjectDraft("");
    setStepMessage("");
    setFlowStarted(true);
  }

  function startAgain() {
    clearQuizAnswers();
    startNewFlow();
  }

  function addSubjectDraft() {
    const additions = splitManualItems(subjectDraft);

    if (!additions.length) {
      return answers;
    }

    const updatedAnswers = {
      ...answers,
      subjects: mergeUniqueItems(answers.subjects, additions),
    };

    setAnswers(updatedAnswers);
    setSubjectDraft("");
    setStepMessage("");
    return updatedAnswers;
  }

  function handleSubjectKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addSubjectDraft();
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
    const answersToCheck = currentStep === 1 && subjectDraft.trim() ? addSubjectDraft() : answers;
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

    if (currentStep === 0) {
      setFlowStarted(false);
      return;
    }

    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function renderStep() {
    if (currentStep === 0) {
      return (
        <OptionGrid
          options={stageOptions}
          selectedValue={answers.currentStage}
          onSelect={(currentStage) => updateAnswers((draft) => ({ ...draft, currentStage }))}
        />
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-5">
          <MultiChipGrid
            options={subjectOptions}
            selectedValues={answers.subjects}
            onToggle={(subject) => updateAnswers((draft) => ({ ...draft, subjects: toggleValue(draft.subjects, subject) }))}
          />
          <div className="rounded-lg border border-ink/10 bg-white p-3">
            <label className="block text-sm font-black text-ink" htmlFor="subject-draft">
              Add another subject or course area
            </label>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                id="subject-draft"
                value={subjectDraft}
                onChange={(event) => setSubjectDraft(event.target.value)}
                onKeyDown={handleSubjectKeyDown}
                placeholder="e.g. sociology, T Level digital"
                className="min-h-[3.25rem] w-full rounded-lg border-2 border-ink/10 bg-oat px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
              />
              <button
                type="button"
                onClick={addSubjectDraft}
                className="min-h-[3.25rem] rounded-lg bg-ink px-4 py-3 text-sm font-black text-white transition hover:bg-leaf"
              >
                Add
              </button>
            </div>
          </div>
          <SelectedPills
            values={answers.subjects}
            onRemove={(subject) =>
              updateAnswers((draft) => ({ ...draft, subjects: draft.subjects.filter((item) => item !== subject) }))
            }
          />
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <OptionGrid
          options={gradeOptions}
          selectedValue={answers.predictedGrades}
          onSelect={(predictedGrades) => updateAnswers((draft) => ({ ...draft, predictedGrades }))}
        />
      );
    }

    if (currentStep === 3) {
      return (
        <MultiChipGrid
          options={interestOptions}
          selectedValues={answers.interests}
          onToggle={(interest) => updateAnswers((draft) => ({ ...draft, interests: toggleValue(draft.interests, interest) }))}
        />
      );
    }

    if (currentStep === 4) {
      return (
        <div className="grid gap-3">
          <button
            type="button"
            aria-pressed={answers.constraints.length === 0}
            onClick={() => updateAnswers((draft) => ({ ...draft, constraints: [] }))}
            className={answerButtonClass(answers.constraints.length === 0)}
          >
            <span className="block break-words text-lg font-black leading-6 text-ink">Nothing major right now</span>
            <span className="mt-2 block text-sm font-semibold leading-5 text-ink/65">You can still compare backup routes.</span>
          </button>
          <MultiChipGrid
            options={constraintOptions}
            selectedValues={answers.constraints}
            onToggle={(constraint) =>
              updateAnswers((draft) => ({ ...draft, constraints: toggleValue(draft.constraints, constraint) }))
            }
          />
        </div>
      );
    }

    if (currentStep === 5) {
      return (
        <label className="block text-sm font-black text-ink" htmlFor="target-career">
          Career idea
          <input
            id="target-career"
            value={answers.targetCareer}
            onChange={(event) => updateAnswers((draft) => ({ ...draft, targetCareer: event.target.value }))}
            placeholder="e.g. software developer"
            className="mt-3 min-h-14 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-4 text-lg font-semibold text-ink outline-none transition focus:border-leaf"
          />
        </label>
      );
    }

    if (currentStep === 6) {
      return (
        <label className="block text-sm font-black text-ink" htmlFor="target-course">
          Course or training idea
          <input
            id="target-course"
            value={answers.targetCourse}
            onChange={(event) => updateAnswers((draft) => ({ ...draft, targetCourse: event.target.value }))}
            placeholder="e.g. computer science"
            className="mt-3 min-h-14 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-4 text-lg font-semibold text-ink outline-none transition focus:border-leaf"
          />
        </label>
      );
    }

    if (currentStep === 7) {
      return (
        <label className="block text-sm font-black text-ink" htmlFor="location">
          Town, city, or area
          <input
            id="location"
            value={answers.location}
            onChange={(event) => updateAnswers((draft) => ({ ...draft, location: event.target.value }))}
            placeholder="e.g. Manchester"
            className="mt-3 min-h-14 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-4 text-lg font-semibold text-ink outline-none transition focus:border-leaf"
          />
        </label>
      );
    }

    if (currentStep === 8) {
      return (
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-ink/60">Maximum travel time</p>
              <p className="mt-2 text-5xl font-black leading-none text-ink">{answers.maxTravelMinutes}</p>
            </div>
            <p className="pb-1 text-sm font-black uppercase tracking-wide text-ink/50">minutes</p>
          </div>
          <input
            type="range"
            min={10}
            max={150}
            step={5}
            value={answers.maxTravelMinutes}
            onChange={(event) =>
              updateAnswers((draft) => ({ ...draft, maxTravelMinutes: Number(event.target.value) }))
            }
            className="mt-7 w-full accent-leaf"
            aria-label="Maximum travel time in minutes"
          />
          <div className="mt-3 flex justify-between text-xs font-black uppercase tracking-wide text-ink/45">
            <span>Nearby</span>
            <span>Wider search</span>
          </div>
        </div>
      );
    }

    if (currentStep === 9) {
      return (
        <OptionGrid
          options={debtOptions}
          selectedValue={answers.debtPreference}
          onSelect={(debtPreference) => updateAnswers((draft) => ({ ...draft, debtPreference }))}
        />
      );
    }

    if (currentStep === 10) {
      return (
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
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
            aria-label="How important earning soon is"
          />
          <div className="mt-3 flex justify-between text-xs font-black uppercase tracking-wide text-ink/45">
            <span>Can wait</span>
            <span>Soon matters</span>
          </div>
        </div>
      );
    }

    return (
      <MultiChipGrid
        options={workStyleOptions}
        selectedValues={answers.workStyles}
        onToggle={(workStyle) =>
          updateAnswers((draft) => ({ ...draft, workStyles: toggleValue(draft.workStyles, workStyle) }))
        }
      />
    );
  }

  if (!flowStarted) {
    return (
      <WelcomeScreen
        savedAnswers={savedAnswers}
        onBegin={startNewFlow}
        onContinue={continueSavedFlow}
        onStartAgain={startAgain}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#fbf8ef,#dceeff_48%,#dff3e8)] text-ink">
      <ProgressHeader currentStep={currentStep} progress={progress} />

      <section className="mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-3xl flex-col justify-center px-4 pb-32 pt-7 sm:px-6">
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
            {stepMessage || "Saved on this device as you go."}
          </div>
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-[#fbf8ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-[3.25rem] flex-1 items-center justify-center rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-sm font-black text-ink transition hover:border-leaf/45 hover:bg-mint"
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
