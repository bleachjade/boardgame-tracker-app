import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Try the primary model first, fall back to alternates if overloaded
const MODEL_CHAIN = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.6-flash-lite"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(contents: any[], systemPrompt: string) {
  let lastError: any;

  for (const model of MODEL_CHAIN) {
    // Up to 3 attempts per model with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction: systemPrompt, temperature: 0.4 },
        });
        const answer = response.text?.trim();
        if (answer) return answer;
        throw new Error("Empty response");
      } catch (err: any) {
        lastError = err;
        const isOverloaded = err?.status === 503 || err?.message?.includes("UNAVAILABLE");
        if (!isOverloaded) break; // real error, don't retry this model — move to next
        await sleep(500 * Math.pow(2, attempt)); // 500ms, 1s, 2s
      }
    }
  }

  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const { gameName, question, description, mechanics, minPlayers, maxPlayers, playTime, history } = await req.json();

    if (!gameName || !question) {
      return NextResponse.json({ error: "Missing gameName or question" }, { status: 400 });
    }

    const systemPrompt = `You are "Rule Guru", a friendly, knowledgeable board game expert assistant.
You are answering questions about the board game: "${gameName}".

Game context (use if relevant, but you may also rely on your own general knowledge of this game):
- Players: ${minPlayers ?? "?"}–${maxPlayers ?? "?"}
- Play time: ${playTime ?? "unknown"} minutes
- Mechanics: ${Array.isArray(mechanics) && mechanics.length ? mechanics.join(", ") : "unknown"}
- Publisher description: ${description ? description.replace(/<[^>]*>/g, "").slice(0, 1500) : "not available"}

Rules for answering:
1. You can answer ANY question about this game — rules, setup, scoring, strategy, tips, edge cases, theme, components, comparisons to other games, house rules, etc.
2. ALWAYS reply in the SAME language the user asked in. If Thai, reply fully in Thai. If English, reply in English. If mixed, default to Thai.
3. Be concise but complete — use short paragraphs or bullet points for setup/rules steps.
4. If you're not fully certain of an exact rule, say so honestly and suggest checking the official rulebook.
5. Keep tone warm and helpful, like a fellow hobbyist explaining to a friend.`;

    const priorTurns = Array.isArray(history)
      ? history.slice(-8).map((h: { role: "user" | "ai"; text: string }) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        }))
      : [];

    const contents = [...priorTurns, { role: "user", parts: [{ text: question }] }];

    const answer = await generateWithRetry(contents, systemPrompt);

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("rule-bot error:", err);

    const isOverloaded = err?.status === 503 || err?.message?.includes("UNAVAILABLE");
    return NextResponse.json(
      {
        error: isOverloaded
          ? "AI service is temporarily overloaded"
          : "AI request failed",
      },
      { status: isOverloaded ? 503 : 500 }
    );
  }
}