import { where, limit } from "firebase/firestore";
import { FirestoreRepository } from "./baseRepository";
import { UserProfile } from "@/lib/types";

export class UsersRepository extends FirestoreRepository<UserProfile> {
  protected collectionName = "users";

  protected mapDoc(doc: { id: string } & Record<string, unknown>): UserProfile {
    return {
      uid: doc.uid as string,
      nickname: doc.nickname as string,
      email: doc.email as string,
      isCouple: doc.isCouple as boolean,
      partnerId: doc.partnerId as string | null,
      friendsList: doc.friendsList as string[] || [],
      createdAt: doc.createdAt as UserProfile["createdAt"],
    };
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const users = await this.getAll([
      where("email", "==", email.toLowerCase()),
      limit(1)
    ]);
    return users[0] || null;
  }

  async getFriendsList(userId: string): Promise<UserProfile[]> {
    const user = await this.getById(userId);
    if (!user || !user.friendsList?.length) return [];
    
    const chunks = chunkArray(user.friendsList, 10);
    const friends: UserProfile[] = [];
    
    for (const chunk of chunks) {
      const results = await this.getAll([
        where("uid", "in", chunk)
      ]);
      friends.push(...results);
    }
    
    return friends;
  }

  async addFriend(userId: string, friendUid: string): Promise<void> {
    const user = await this.getById(userId);
    if (!user) throw new Error("User not found");
    
    const updatedFriends = [...new Set([...(user.friendsList || []), friendUid])];
    return this.update(userId, { friendsList: updatedFriends });
  }

  async removeFriend(userId: string, friendUid: string): Promise<void> {
    const user = await this.getById(userId);
    if (!user) throw new Error("User not found");
    
    const updatedFriends = (user.friendsList || []).filter(id => id !== friendUid);
    return this.update(userId, { friendsList: updatedFriends });
  }

  async linkPartner(userId: string, partnerEmail: string): Promise<void> {
    const partner = await this.getUserByEmail(partnerEmail);
    if (!partner) throw new Error("Partner not found");
    if (partner.uid === userId) throw new Error("Cannot link to yourself");
    
    const user = await this.getById(userId);
    if (!user) throw new Error("User not found");
    
    await this.update(userId, { isCouple: true, partnerId: partner.uid });
    await this.update(partner.uid, { isCouple: true, partnerId: userId });
  }

  async unlinkPartner(userId: string): Promise<void> {
    const user = await this.getById(userId);
    if (!user || !user.isCouple || !user.partnerId) return;
    
    await this.update(userId, { isCouple: false, partnerId: null });
    await this.update(user.partnerId, { isCouple: false, partnerId: null });
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export const usersRepository = new UsersRepository();