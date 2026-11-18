import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};

const getCachedBggImages = unstable_cache(
  async (id: string) => {
    const response = await fetch(
      `https://api.geekdo.com/api/images?ajax=1&gallery=all&objectid=${encodeURIComponent(id)}&objecttype=thing&pageid=1&showcount=12&size=large&sort=hot`,
      {
        headers: {
          'User-Agent': 'BoardgameTracker/1.0',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`BGG image API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const images = Array.isArray(data?.images) ? data.images : [];

    return Array.from(
      new Set(
        images
          .map((image: { imageurl_lg?: string; imageurl?: string }) => image?.imageurl_lg || image?.imageurl)
          .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
      )
    );
  },
  ['bgg-images'],
  { revalidate: 86400, tags: ['bgg'] }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing game ID' }, { status: 400 });
  }

  try {
    const urls = await getCachedBggImages(id);
    return NextResponse.json(urls, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('BGG Gallery Proxy Error:', error);
    return NextResponse.json([]);
  }
}
