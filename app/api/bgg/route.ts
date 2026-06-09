import { NextResponse } from 'next/server';

// Rich mock data corresponding to the IDs in our search mock
const MOCK_GAME_DETAILS: Record<string, any> = {
  "161936": {
    bggId: "161936", name: "Pandemic Legacy: Season 1", year: "2015",
    image: "https://cf.geekdo-images.com/PjOqolP-7X8xUv_xO_v1xg__imagepage/img/E_O9Q4H_9p6L8mHqB8p_p4Q5eEw=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2452831.png",
    minPlayers: "2", maxPlayers: "4", playTime: "60", description: "Mutating diseases are spreading..."
  },
  "174430": {
    bggId: "174430", name: "Gloomhaven", year: "2017",
    image: "https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__imagepage/img/zdBTeRPOkX9Zp7qXmI2Gv8qE0qg=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2437871.jpg",
    minPlayers: "1", maxPlayers: "4", playTime: "120", description: "Vanquish monsters with strategic card play."
  },
  "167791": {
    bggId: "167791", name: "Terraforming Mars", year: "2016",
    image: "https://cf.geekdo-images.com/wg9oOLcsKvDesSUdZQp1GQ__imagepage/img/hEqKz0Lp8m6t0bV-e4lH2I_y95o=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3536616.jpg",
    minPlayers: "1", maxPlayers: "5", playTime: "120", description: "Compete to tame the Red Planet."
  },
  "266192": {
    bggId: "266192", name: "Wingspan", year: "2019",
    image: "https://cf.geekdo-images.com/yLZJCVLlJhCGefC3kIVp-Q__imagepage/img/1w-A8wA_8A4C-zE4o_W7_z_Y_Q4=/fit-in/900x600/filters:no_upscale():strip_icc()/pic4458123.jpg",
    minPlayers: "1", maxPlayers: "5", playTime: "70", description: "Attract a beautiful and diverse collection of birds."
  },
  "230802": {
    bggId: "230802", name: "Azul", year: "2017",
    image: "https://cf.geekdo-images.com/aPSH88dq0T09tC1h7KjTng__imagepage/img/9wK4-x5b3v4x7_x7X6Z_k_W2y3A=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3701201.jpg",
    minPlayers: "2", maxPlayers: "4", playTime: "45", description: "Draft tiles to decorate the royal palace."
  },
  "148228": {
    bggId: "148228", name: "Splendor", year: "2014",
    image: "https://cf.geekdo-images.com/rwOMxx4q5yuElIvo-1-OFw__imagepage/img/gM4G2yT2v6Z8tQ_l9C2W5L4vX4U=/fit-in/900x600/filters:no_upscale():strip_icc()/pic1904079.jpg",
    minPlayers: "2", maxPlayers: "4", playTime: "30", description: "Collect gems to become a Renaissance merchant."
  }
};

// Fallback generator for dynamic IDs
const generateFallbackDetails = (id: string) => {
  // Extract the original query name from the ID string if possible
  const nameMatch = id.includes('mock') ? "Dynamic Mock Game" : `Unknown Game ${id}`;
  
  return {
    bggId: id,
    name: nameMatch,
    image: "https://via.placeholder.com/400x400/e2e8f0/475569?text=Mock+Game+Cover", 
    year: "2024",
    minPlayers: "1",
    maxPlayers: "6",
    playTime: "45",
    description: "This is dynamically generated mock data to test the UI."
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing game IDs' }, { status: 400 });
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400));

  const idArray = ids.split(',');
  
  // Map requested IDs to our mock details, or generate placeholders if missing
  const results = idArray.map(id => MOCK_GAME_DETAILS[id] || generateFallbackDetails(id));

  return NextResponse.json(results);
}