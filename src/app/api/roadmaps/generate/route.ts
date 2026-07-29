import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCatalogueRoute } from "@/lib/catalog/queries";
import { normaliseQuizAnswers } from "@/lib/quiz-storage";
import { generatedRoadmapJsonSchema, validateGeneratedRoadmap } from "@/lib/roadmaps/generated-roadmap";
import {
  buildRoadmapGenerationInput,
  normaliseRoadmapFollowUpAnswers,
} from "@/lib/roadmaps/roadmap-generation-input";
import { scoreRoute } from "@/lib/scoring";

export const runtime = "nodejs";

const ROADMAP_MODEL = "gpt-5.5";
const ROADMAP_TIMEOUT_MS = 15_000;

const roadmapInstructions = `
You generate cautious, useful UK education and early-career roadmaps for 16-19-year-olds.
Use only the JSON context supplied by the app. Do not invent live providers, vacancies, local availability, exact deadlines, exact costs, funding outcomes, offers, admissions outcomes, or job outcomes.
Write concrete actions that a student can take, but do not use "best route", "you should", "you cannot", "guaranteed", "definitely", or certainty language.
Use supportive, non-judgmental wording. Frame constraints as planning needs, not personal failings.
Every task must make clear whether it is based on quiz data, demo route data, needs checking, or is a suggested next action.
Return exactly five sections in this order: This week, This month, Before applying/enrolling, What could unlock more options, Backup plan.
Each section must contain two to four tasks. Keep backup options aligned to the route data in the input.
`;

function jsonError(reason: string, message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      reason,
      message,
    },
    { status },
  );
}

async function readRequestBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getResponseOutputText(response: unknown) {
  if (!response || typeof response !== "object") {
    return null;
  }

  const candidate = response as {
    output_text?: unknown;
    output?: unknown;
  };

  if (typeof candidate.output_text === "string") {
    return candidate.output_text;
  }

  if (!Array.isArray(candidate.output)) {
    return null;
  }

  const textParts = candidate.output.flatMap((item) => {
    if (!item || typeof item !== "object" || !Array.isArray((item as { content?: unknown }).content)) {
      return [];
    }

    return (item as { content: unknown[] }).content
      .map((contentItem) => {
        if (!contentItem || typeof contentItem !== "object") {
          return "";
        }

        const text = (contentItem as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      })
      .filter(Boolean);
  });

  return textParts.length ? textParts.join("\n") : null;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return jsonError(
      "missing-api-key",
      "OPENAI_API_KEY is not configured, so the template roadmap is being used instead.",
      503,
    );
  }

  const body = await readRequestBody(request);

  if (!body) {
    return jsonError("invalid-request", "Request body must be valid JSON.", 400);
  }

  const routeId = typeof body.routeId === "string" ? body.routeId.trim() : "";
  const route = getCatalogueRoute(routeId);
  const answers = normaliseQuizAnswers(body.answers);
  const followUps = normaliseRoadmapFollowUpAnswers(body.followUps);

  if (!route) {
    return jsonError("unknown-route", "The requested route could not be found.", 404);
  }

  if (!answers) {
    return jsonError("invalid-answers", "A valid saved quiz profile is required to generate a custom roadmap.", 400);
  }

  const scored = scoreRoute(route, answers);
  const generatedAt = new Date().toISOString();
  const roadmapInput = buildRoadmapGenerationInput({
    route,
    scored,
    answers,
    followUps,
    generatedAt,
  });
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), ROADMAP_TIMEOUT_MS);

  try {
    const response = await client.responses.create(
      {
        model: ROADMAP_MODEL,
        instructions: roadmapInstructions,
        input: JSON.stringify(roadmapInput),
        reasoning: {
          effort: "medium",
        },
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "generated_custom_roadmap",
            strict: true,
            schema: generatedRoadmapJsonSchema as unknown as Record<string, unknown>,
          },
        },
        store: false,
      },
      {
        signal: abortController.signal,
      },
    );
    const outputText = getResponseOutputText(response);

    if (!outputText) {
      return jsonError("empty-output", "The model response did not contain a roadmap.", 502);
    }

    let parsedRoadmap: unknown;

    try {
      parsedRoadmap = JSON.parse(outputText);
    } catch {
      return jsonError("malformed-output", "The model returned a roadmap that was not valid JSON.", 502);
    }

    const validation = validateGeneratedRoadmap(parsedRoadmap, {
      routeId: route.id,
      backupOptions: route.backupOptions,
    });

    if (!validation.ok) {
      return NextResponse.json(
        {
          ok: false,
          reason: "validation-failed",
          message: "The generated roadmap did not pass safety and usefulness checks.",
          errors: validation.errors,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      roadmap: validation.roadmap,
    });
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === "AbortError";

    return jsonError(
      isAbortError ? "timeout" : "generation-failed",
      isAbortError
        ? "Roadmap generation timed out, so the template roadmap is being used instead."
        : "Roadmap generation failed, so the template roadmap is being used instead.",
      isAbortError ? 504 : 502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
