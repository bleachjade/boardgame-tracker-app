import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const CACHE_HEADERS = {
  "Content-Type": "application/xml",
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

const getCachedHotXml = unstable_cache(
  async () => {
    const token = process.env.BGG_API_TOKEN;
    if (!token) {
      console.error("Missing BGG_API_TOKEN in environment variables.");
      throw new Error("Server configuration error");
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

    return res.text();
  },
  ['bgg-hot'],
  { revalidate: 21600, tags: ['bgg'] }
);

export async function GET() {
  try {
    const xmlText = await getCachedHotXml();
    return new NextResponse(xmlText, { headers: CACHE_HEADERS });
  } catch (error: any) {
    console.error("Hotness Route Server Error:", error.message);
    return NextResponse.json({ error: "Failed fetching BGG Hotness" }, { status: 500 });
  }
}