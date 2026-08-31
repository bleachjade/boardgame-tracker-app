import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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
1. You can answer ANY question about this game — rules, setup, scoring, strategy, tips, edge cases, theme, components, comparisons to other games, house rules, etc. Not just rulebook lookups.
2. ALWAYS reply in the SAME language the user asked in. If they wrote in Thai, reply fully in Thai. If in English, reply in English. If mixed, default to Thai (the user base is mostly Thai board gamers).
3. Be concise but complete — use short paragraphs or bullet points for setup/rules steps.
4. If you're not fully certain of an exact rule, say so honestly and suggest checking the official rulebook, rather than inventing a rule.
5. Keep tone warm and helpful, like a fellow hobbyist explaining to a friend.`;

    // Convert prior chat turns into Gemini's "contents" format
    const priorTurns = Array.isArray(history)
      ? history.slice(-8).map((h: { role: "user" | "ai"; text: string }) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        }))
      : [];

    const contents = [...priorTurns, { role: "user", parts: [{ text: question }] }];

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    const answer = response.text?.trim();

    if (!answer) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("rule-bot error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}