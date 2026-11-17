import { where, orderBy } from "firebase/firestore";
import { FirestoreRepository } from "./baseRepository";
import { GameNight } from "@/lib/types";

export class GameNightsRepository extends FirestoreRepository<GameNight> {
  protected collectionName = "gameNights";

  protected mapDoc(doc: { id: string } & Record<string, unknown>): GameNight {
    return {
      id: doc.id,
      title: doc.title as string,
      date: doc.date as string,
      time: doc.time as string | undefined,
      location: doc.location as string | undefined,
      hostId: doc.hostId as string,
      hostName: doc.hostName as string,
      participants: doc.participants as string[] || [],
      proposedGames: doc.proposedGames as GameNight["proposedGames"],
      rsvps: doc.rsvps as Record<string, "yes" | "no"> || {},
      votes: doc.votes as Record<string, string[]> || {},
      createdAt: doc.createdAt as GameNight["createdAt"],
    };
  }

  async getUserGameNights(userId: string): Promise<GameNight[]> {
    const gameNights = await this.getAll([
      where("participants", "array-contains", userId)
    ]);
    
    return gameNights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async subscribeToUserGameNights(userId: string, callback: (gameNights: GameNight[]) => void): Promise<() => void> {
    return this.subscribe([
      where("participants", "array-contains", userId)
    ], (gameNights) => {
      const sorted = gameNights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      callback(sorted);
    });
  }

  async createGameNight(data: Omit<GameNight, "id">): Promise<string> {
    return this.create(data);
  }

  async updateRSVP(eventId: string, userName: string, status: "yes" | "no"): Promise<void> {
    const event = await this.getById(eventId);
    if (!event) throw new Error("Event not found");
    
    const updatedRsvps = { ...event.rsvps, [userName]: status };
    return this.update(eventId, { rsvps: updatedRsvps });
  }

  async updateVotes(eventId: string, userName: string, gameIds: string[]): Promise<void> {
    const event = await this.getById(eventId);
    if (!event) throw new Error("Event not found");
    
    const updatedVotes = { ...event.votes, [userName]: gameIds };
    return this.update(eventId, { votes: updatedVotes });
  }

  async deleteGameNight(eventId: string): Promise<void> {
    return this.delete(eventId);
  }
}

export const gameNightsRepository = new GameNightsRepository();