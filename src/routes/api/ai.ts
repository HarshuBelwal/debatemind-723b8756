import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

interface AIBody {
  task:
    | "debate_reply"
    | "debate_counter"
    | "debate_hint"
    | "debate_judge"
    | "quiz_generate"
    | "argument_analyze"
    | "study_chat";
  payload: Record<string, unknown>;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function langLine(payload: Record<string, unknown>) {
  const language = typeof payload.language === "string" && payload.language ? payload.language : "English";
  return `LANGUAGE: Default to ${language}. However, if the user writes in another language OR explicitly asks you to switch languages (e.g. "reply in Hindi", "speak French", "mujhse hindi main baat karo"), immediately switch and continue in that language for the rest of the conversation. Never refuse a language request — you are fully multilingual. Keep proper nouns in their original form.`;
}

function buildMessages(body: AIBody) {
  const { task, payload } = body;
  const lang = langLine(payload);

  switch (task) {
    case "debate_reply": {
      const { topic, side, transcript } = payload as {
        topic: string; side: string;
        transcript: { role: string; content: string }[];
      };
      const aiSide = side === "for" ? "AGAINST" : side === "against" ? "FOR" : "the strongest opposing view to the user's claim";
      return {
        messages: [
          {
            role: "system",
            content: `You are a sharp, fair debate opponent in DebateMind. Topic: "${topic}". The user is arguing ${side.toUpperCase()}. You must argue ${aiSide}. Keep replies under 110 words. Use clear reasoning, one strong evidence point or example, and end with a pointed challenge or question. Never concede unless they make a truly devastating point. No filler. ${lang}`,
          },
          ...transcript.map((m) => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.content,
          })),
        ],
      };
    }
    case "debate_counter": {
      const { topic, lastUserArgument } = payload as { topic: string; lastUserArgument: string };
      return {
        messages: [
          { role: "system", content: `You are a debate coach. Provide ONE devastating counter-argument to the user's last point on the topic "${topic}". Under 90 words. Sharp, structured, evidence-based. ${lang}` },
          { role: "user", content: lastUserArgument },
        ],
      };
    }
    case "debate_hint": {
      const { topic, side } = payload as { topic: string; side: string };
      return {
        messages: [
          { role: "system", content: `You are a debate coach. Give the user ONE concise tactical hint (under 60 words) for arguing ${side} on: "${topic}". Suggest an angle, framework, or evidence type they could use. No preamble. ${lang}` },
          { role: "user", content: "Give me a hint." },
        ],
      };
    }
    case "study_chat": {
      const { history } = payload as { history: { role: string; content: string }[] };
      return {
        messages: [
          { role: "system", content: `You are Study Buddy in DebateMind: a witty, encouraging tutor for debate, logic, philosophy and quiz prep. Be concise (under 120 words) and actionable. Use markdown sparingly (bold for key terms, lists when helpful). ${lang}` },
          ...history.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        ],
      };
    }
    default:
      return null;
  }
}

function buildToolCall(body: AIBody) {
  const { task, payload } = body;
  const lang = langLine(payload);

  if (task === "quiz_generate") {
    const { category, count } = payload as { category: string; count: number };
    return {
      messages: [
        { role: "system", content: `Generate ${count} hard but fair multiple-choice quiz questions in the "${category}" category. 4 choices each, exactly one correct, plus a 1-sentence explanation. Vary difficulty. ${lang} The "question", every entry in "choices", and "explanation" MUST all be written in the requested language.` },
        { role: "user", content: `Generate ${count} ${category} questions.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_quiz",
          description: "Return generated quiz questions.",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    choices: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                    correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                    explanation: { type: "string" },
                  },
                  required: ["question", "choices", "correctIndex", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_quiz" } },
    };
  }

  if (task === "debate_judge") {
    const { topic, side, transcript } = payload as {
      topic: string; side: string;
      transcript: { role: string; content: string }[];
    };
    const convo = transcript.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    return {
      messages: [
        { role: "system", content: `You are an impartial debate judge. Score fairly based on logic, evidence, rhetoric, and rebuttal quality. ${lang} The "verdict" and every "highlights" entry must be written in the requested language.` },
        { role: "user", content: `Topic: "${topic}"\nUser side: ${side}\n\nTranscript:\n${convo}\n\nJudge this debate.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_judgment",
          description: "Return the debate judgment.",
          parameters: {
            type: "object",
            properties: {
              verdict: { type: "string", description: "1-2 sentence verdict." },
              user_strength: { type: "integer", minimum: 0, maximum: 100 },
              ai_strength: { type: "integer", minimum: 0, maximum: 100 },
              score_awarded: { type: "integer", minimum: 0, maximum: 100, description: "Points earned by the user." },
              highlights: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
            },
            required: ["verdict", "user_strength", "ai_strength", "score_awarded", "highlights"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_judgment" } },
    };
  }

  if (task === "argument_analyze") {
    const { topic, claim, evidence, warrant, rebuttal } = payload as {
      topic: string; claim: string; evidence: string; warrant: string; rebuttal: string;
    };
    return {
      messages: [
        { role: "system", content: `You are an expert in the Toulmin model of argumentation. Critique fairly and constructively. ${lang} All "strengths", "weaknesses" entries and the "improvement" text must be written in the requested language.` },
        { role: "user", content: `Topic: ${topic}\n\nClaim: ${claim}\nEvidence: ${evidence}\nWarrant: ${warrant}\nRebuttal: ${rebuttal}\n\nAnalyze this argument.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_analysis",
          description: "Return Toulmin analysis.",
          parameters: {
            type: "object",
            properties: {
              score: { type: "integer", minimum: 0, maximum: 100 },
              strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
              weaknesses: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
              improvement: { type: "string" },
            },
            required: ["score", "strengths", "weaknesses", "improvement"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_analysis" } },
    };
  }

  return null;
}

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return jsonResponse({ error: "AI is not configured. Missing LOVABLE_API_KEY." }, 500);
        }

        let body: AIBody;
        try {
          body = (await request.json()) as AIBody;
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }
        if (!body || typeof body.task !== "string") {
          return jsonResponse({ error: "Missing task" }, 400);
        }

        const tool = buildToolCall(body);
        const chat = tool ? null : buildMessages(body);
        if (!tool && !chat) {
          return jsonResponse({ error: `Unknown task: ${body.task}` }, 400);
        }

        const requestBody: Record<string, unknown> = {
          model: DEFAULT_MODEL,
          ...(tool ?? chat ?? {}),
        };

        try {
          const r = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (r.status === 429) {
            return jsonResponse({ error: "Rate limit reached. Please wait a few seconds and try again." }, 429);
          }
          if (r.status === 402) {
            return jsonResponse({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
          }
          if (!r.ok) {
            const text = await r.text();
            console.error("AI gateway error:", r.status, text);
            return jsonResponse({ error: "AI gateway returned an error." }, 500);
          }

          const data = await r.json();

          if (tool) {
            const call = data?.choices?.[0]?.message?.tool_calls?.[0];
            const args = call?.function?.arguments;
            if (!args) {
              return jsonResponse({ error: "AI returned no structured output." }, 500);
            }
            try {
              return jsonResponse({ result: JSON.parse(args) });
            } catch {
              return jsonResponse({ error: "AI returned malformed JSON." }, 500);
            }
          }

          const text: string = data?.choices?.[0]?.message?.content ?? "";
          return jsonResponse({ text });
        } catch (e) {
          console.error("AI handler error", e);
          return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
        }
      },
    },
  },
});
