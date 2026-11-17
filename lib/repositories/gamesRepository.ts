import { query, where, orderBy, limit, QueryConstraint } from "firebase/firestore";
import { FirestoreRepository } from "./baseRepository";
import { Game } from "@/lib/types";

export class GamesRepository extends FirestoreRepository<Game> {
  protected collectionName = "userGames";

  protected mapDoc(doc: { id: string } & Record<string, unknown>): Game {
    return {
      id: doc.id,
      bggId: doc.bggId as string,
      name: doc.name as string,
      image: doc.image as string | undefined,
      year: doc.year as string | undefined,
      minPlayers: doc.minPlayers as string,
      maxPlayers: doc.maxPlayers as string,
      playTime: doc.playTime as string,
      minPlayTime: doc.minPlayTime as string | undefined,
      maxPlayTime: doc.maxPlayTime as string | undefined,
      minAge: doc.minAge as string | undefined,
      description: doc.description as string | undefined,
      weight: doc.weight as string | undefined,
      categories: doc.categories as string[] || [],
      mechanics: doc.mechanics as string[] || [],
      bestPlayers: doc.bestPlayers as string | undefined,
      communityAge: doc.communityAge as string | undefined,
      dimensions: doc.dimensions as { width: number; length: number; depth: number } | undefined,
      isExpansion: doc.isExpansion as boolean,
      baseGameId: doc.baseGameId as string | undefined,
      groupIds: doc.groupIds as string[] || [],
      userId: doc.userId as string,
      ownerNickname: doc.ownerNickname as string,
      addedAt: doc.addedAt,
      pricePaid: doc.pricePaid as number | undefined,
      description_th: doc.description_th as string | undefined,
      rating: doc.rating as string | undefined,
      isPinned: doc.isPinned as boolean | undefined,
    };
  }

  async getUserGames(userId: string, partnerId?: string): Promise<Game[]> {
    const targetUids = [userId];
    if (partnerId) targetUids.push(partnerId);
    
    return this.getAll([
      where("userId", "in", targetUids),
      orderBy("addedAt", "desc")
    ]);
  }

  async getGamesByGroup(groupId: string): Promise<Game[]> {
    return this.getAll([
      where("groupIds", "array-contains", groupId),
      orderBy("addedAt", "desc")
    ]);
  }

  async getGameByBggId(userId: string, bggId: string): Promise<Game | null> {
    const games = await this.getAll([
      where("userId", "==", userId),
      where("bggId", "==", bggId),
      limit(1)
    ]);
    return games[0] || null;
  }

  async updateGameGroups(gameId: string, groupIds: string[]): Promise<void> {
    return this.update(gameId, { groupIds });
  }

  async bulkAssignToGroups(gameIds: string[], groupIds: string[]): Promise<void> {
    const operations = await Promise.all(gameIds.map(async (id) => {
      const game = await this.getById(id);
      return {
        type: "update" as const,
        id,
        data: { groupIds: [...new Set([...(game?.groupIds || []), ...groupIds])] }
      };
    }));
    
    await this.batchWrite(operations);
  }
}

// Export singleton instance
export const gamesRepository = new GamesRepository();