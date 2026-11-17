import { query, where, orderBy, QueryConstraint, limit } from "firebase/firestore";
import { FirestoreRepository } from "./baseRepository";
import { GamePlay } from "@/lib/types";

export class GamePlaysRepository extends FirestoreRepository<GamePlay> {
  protected collectionName = "gamePlays";

  protected mapDoc(doc: { id: string } & Record<string, unknown>): GamePlay {
    return {
      id: doc.id,
      gameId: doc.gameId as string,
      bggId: doc.bggId as string,
      gameName: doc.gameName as string,
      players: doc.players as GamePlay["players"],
      isCoop: doc.isCoop as boolean,
      playMode: doc.playMode as GamePlay["playMode"],
      coopResult: doc.coopResult as GamePlay["coopResult"],
      teamScore: doc.teamScore as number | undefined,
      memoryPhoto: doc.memoryPhoto as string | undefined,
      playedAt: doc.playedAt,
      loggedBy: doc.loggedBy as string,
      userId: doc.userId as string,
      isSharedCopy: doc.isSharedCopy as boolean | undefined,
    };
  }

  async getPlayCounts(userId: string, partnerId?: string): Promise<Record<string, number>> {
    const targetUids = [userId];
    if (partnerId) targetUids.push(partnerId);
    
    const plays = await this.getAll([
      where("userId", "in", targetUids)
    ]);
    
    const counts: Record<string, number> = {};
    plays.forEach(play => {
      const key = String(play.bggId);
      counts[key] = (counts[key] || 0) + 1;
    });
    
    return counts;
  }

  async getGameHistory(bggId: string, userId: string, partnerId?: string): Promise<GamePlay[]> {
    const targetUids = [userId];
    if (partnerId) targetUids.push(partnerId);
    
    return this.getAll([
      where("bggId", "==", bggId),
      where("userId", "in", targetUids),
      orderBy("playedAt", "desc")
    ]);
  }

  async subscribeToGameHistory(bggId: string, userId: string, partnerId: string | undefined, callback: (plays: GamePlay[]) => void): Promise<() => void> {
    const targetUids = [userId];
    if (partnerId) targetUids.push(partnerId);
    
    return this.subscribe([
      where("bggId", "==", bggId),
      where("userId", "in", targetUids)
    ], (plays) => {
      const sorted = plays.sort((a, b) => (b.playedAt?.seconds || 0) - (a.playedAt?.seconds || 0));
      callback(sorted);
    });
  }
}

export const gamePlaysRepository = new GamePlaysRepository();