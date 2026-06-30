import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { gameName, question } = await req.json();

    // The "System Prompt" forces the AI to act exactly like a board game referee
    const systemPrompt = `You are an expert board game referee. The user is currently playing the board game "${gameName}". Answer their rule question accurately, concisely, and entirely in Thai. If the rule is highly situational or you are unsure, advise them to check the official rulebook.`;

    // Example using Google Gemini API (or you can swap to OpenAI)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\nQuestion: " + question }] }
        ]
      })
    });

    const data = await response.json();
    const answer = data.candidates[0].content.parts[0].text;

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: "Failed to connect to AI Guru" }, { status: 500 });
  }
}