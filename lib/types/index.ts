export type FirestoreDate = {
  seconds?: number;
  nanoseconds?: number;
  toMillis?: () => number;
  toDate?: () => Date;
} | null;

export interface Game {
  id: string;
  bggId: string;
  name: string;
  image?: string;
  year?: string;
  minPlayers: string;
  maxPlayers: string;
  playTime: string;
  minPlayTime?: string;
  maxPlayTime?: string;
  minAge?: string;
  description?: string;
  description_th?: string;
  weight?: string;
  categories: string[];
  mechanics: string[];
  bestPlayers?: string;
  communityAge?: string;
  dimensions?: { width: number; length: number; depth: number };
  isExpansion: boolean;
  baseGameId?: string;
  groupIds: string[];
  userId: string;
  ownerNickname: string;
  addedAt: FirestoreDate;
  pricePaid?: number;
  rating?: string; rank?: number;
  isPinned?: boolean;
}

export interface UserProfile {
  id?: string;
  uid: string;
  nickname: string;
  email: string;
  isCouple: boolean;
  partnerId: string | null;
  friendsList: string[];
  createdAt: FirestoreDate;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  isSystem: boolean;
  createdAt: FirestoreDate;
}

export interface GamePlay {
  id: string;
  gameId: string;
  bggId: string;
  gameName: string;
  players: PlayerScore[];
  isCoop: boolean;
  playMode: "score" | "winner" | "coop";
  coopResult?: "win" | "loss";
  teamScore?: number;
  memoryPhoto?: string;
  playedAt: FirestoreDate;
  loggedBy: string;
  userId: string;
  isSharedCopy?: boolean;
}

export interface PlayerScore {
  name: string;
  score: number;
  rawExpression?: string;
}

export interface GameNight {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  hostId: string;
  hostName: string;
  participants: string[];
  proposedGames: ProposedGame[];
  rsvps: Record<string, "yes" | "no">;
  votes: Record<string, string[]>;
  createdAt: FirestoreDate;
}

export interface ProposedGame {
  id: string;
  name: string;
  image?: string;
  maxPlayers?: string;
}

export interface SearchResult {
  id: string;
  name: string;
  year?: string;
}

export interface EnrichedGame extends SearchResult {
  bggId: string;
  image?: string;
  minPlayers: string;
  maxPlayers: string;
  playTime: string;
  minPlayTime?: string;
  maxPlayTime?: string;
  minAge?: string;
  description?: string;
  weight?: string;
  categories: string[];
  mechanics: string[];
  bestPlayers?: string;
  communityAge?: string;
  dimensions?: { width: number; length: number; depth: number };
  isExpansion: boolean;
  baseGameId?: string;
  rating?: string; rank?: number;
}

export interface UserPreferences {
  theme?: "light" | "dark";
}

export interface AuthContextType {
  user: import("firebase/auth").User | null;
  userProfile: UserProfile | null;
  userNickname: string;
  loading: boolean;
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  userGroups: Group[];
}