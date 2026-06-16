import { NextResponse } from "next/server";

export async function GET() {
  try {
    const token = process.env.BGG_API_TOKEN;
    if (!token) {
      console.error("Missing BGG_API_TOKEN in environment variables.");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    // We added a User-Agent so BGG knows we are a friendly app, not a malicious bot!
    const res = await fetch("https://boardgamegeek.com/xmlapi2/hot?type=boardgame", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      console.error("BGG Hot API Error:", res.status, res.statusText);
      throw new Error(`BGG returned status ${res.status}`);
    }
    
    const xmlText = await res.text();
    return new NextResponse(xmlText, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error: any) {
    console.error("Hotness Route Server Error:", error.message);
    return NextResponse.json({ error: "Failed fetching BGG Hotness" }, { status: 500 });
  }
}