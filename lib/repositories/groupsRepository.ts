import { where } from "firebase/firestore";
import { FirestoreRepository } from "./baseRepository";
import { Group } from "@/lib/types";

export class GroupsRepository extends FirestoreRepository<Group> {
  protected collectionName = "groups";

  protected mapDoc(doc: { id: string } & Record<string, unknown>): Group {
    return {
      id: doc.id,
      name: doc.name as string,
      ownerId: doc.ownerId as string,
      members: doc.members as string[] || [],
      isSystem: doc.isSystem as boolean,
      createdAt: doc.createdAt as Group["createdAt"],
    };
  }

  async getUserGroups(identifier: string): Promise<Group[]> {
    const groups = await this.getAll([
      where("members", "array-contains", identifier)
    ]);
    
    return groups.sort((a, b) => (b.isSystem ? 1 : 0) - (a.isSystem ? 1 : 0));
  }

  async getSystemGroups(ownerId: string): Promise<Group[]> {
    return this.getAll([
      where("ownerId", "==", ownerId),
      where("isSystem", "==", true)
    ]);
  }

  async createSystemGroups(ownerId: string, email: string): Promise<void> {
    const operations = ['Owned', 'Want to buy', 'Pre-ordered'].map(name => ({
      type: "create" as const,
      data: {
        name,
        ownerId,
        members: [email || ownerId],
        isSystem: true,
      }
    }));
    
    await this.batchWrite(operations);
  }

  async inviteToGroup(groupId: string, email: string): Promise<void> {
    const group = await this.getById(groupId);
    if (!group) throw new Error("Group not found");
    
    const updatedMembers = [...new Set([...group.members, email.toLowerCase()])];
    return this.update(groupId, { members: updatedMembers });
  }

  async createGroup(name: string, ownerId: string, email: string): Promise<string> {
    return this.create({
      name,
      ownerId,
      members: [email.toLowerCase()],
      isSystem: false,
    });
  }

  async deleteGroup(groupId: string): Promise<void> {
    return this.delete(groupId);
  }
}

export const groupsRepository = new GroupsRepository();