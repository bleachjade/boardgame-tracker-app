import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  onSnapshot, 
  serverTimestamp,
  QueryConstraint,
  DocumentData,
  DocumentReference,
  Firestore
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface BaseRepository<T extends { id?: string; createdAt?: any }> {
  getById(id: string): Promise<T | null>;
  getAll(constraints?: QueryConstraint[]): Promise<T[]>;
  create(data: Omit<T, "id" | "createdAt">): Promise<string>;
  update(id: string, data: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
  subscribe(constraints: QueryConstraint[], callback: (data: T[]) => void): () => void;
}

export abstract class FirestoreRepository<T extends { id?: string }> implements BaseRepository<T> {
  protected abstract collectionName: string;
  protected abstract mapDoc(doc: DocumentData & { id: string }): T;

  protected getCollectionRef() {
    return collection(db, this.collectionName);
  }

  protected getDocRef(id: string) {
    return doc(db, this.collectionName, id);
  }

  async getById(id: string): Promise<T | null> {
    const docRef = this.getDocRef(id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return this.mapDoc({ id: docSnap.id, ...docSnap.data() });
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.getCollectionRef(), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.mapDoc({ id: doc.id, ...doc.data() }));
  }

  async create(data: Omit<T, "id" | "createdAt">): Promise<string> {
    const docRef = await addDoc(this.getCollectionRef(), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = this.getDocRef(id);
    // Cast both to any to bypass strict generic constraints
    await updateDoc(docRef as any, data as any);
  }

  async delete(id: string): Promise<void> {
    const docRef = this.getDocRef(id);
    await deleteDoc(docRef as any);
  }

  subscribe(constraints: QueryConstraint[], callback: (data: T[]) => void): () => void {
    const q = query(this.getCollectionRef(), ...constraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => this.mapDoc({ id: doc.id, ...doc.data() }));
      callback(data);
    });
  }

  protected async batchWrite(operations: Array<{ type: "create" | "update" | "delete"; id?: string; data?: Partial<T> }>): Promise<void> {
    const batch = writeBatch(db);
    
    operations.forEach(op => {
      if (op.type === "create" && op.data) {
        const docRef = doc(this.getCollectionRef());
        batch.set(docRef, { ...op.data, createdAt: serverTimestamp() });
      } else if (op.type === "update" && op.id && op.data) {
        const docRef = this.getDocRef(op.id);
        batch.update(docRef as any, op.data as any);
      } else if (op.type === "delete" && op.id) {
        const docRef = this.getDocRef(op.id);
        batch.delete(docRef as any);
      }
    });
    
    await batch.commit();
  }
}