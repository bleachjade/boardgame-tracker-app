import { NextResponse } from 'next/server';

// A small database of popular mock games
const MOCK_SEARCH_RESULTS = [
  { id: "161936", name: "Pandemic Legacy: Season 1", year: "2015" },
  { id: "174430", name: "Gloomhaven", year: "2017" },
  { id: "167791", name: "Terraforming Mars", year: "2016" },
  { id: "266192", name: "Wingspan", year: "2019" },
  { id: "230802", name: "Azul", year: "2017" },
  { id: "148228", name: "Splendor", year: "2014" }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  // Simulate a 600ms network delay for realistic UI testing
  await new Promise(resolve => setTimeout(resolve, 600));

  // Filter the mock data based on the query (case-insensitive)
  const exactMatches = MOCK_SEARCH_RESULTS.filter(game => 
    game.name.toLowerCase().includes(q.toLowerCase())
  );

  // If we found matches in our hardcoded list, return them
  if (exactMatches.length > 0) {
    return NextResponse.json(exactMatches);
  }

  // If no match was found, dynamically generate some fake results using their query!
  const dynamicMockResults = [
    { id: `mock-${Date.now()}-1`, name: `${q}: The Board Game`, year: "2024" },
    { id: `mock-${Date.now()}-2`, name: `${q}: The Dice Game`, year: "2025" },
    { id: `mock-${Date.now()}-3`, name: `${q} Legacy`, year: "2026" }
  ];

  return NextResponse.json(dynamicMockResults);
}