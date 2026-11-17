import { FirestoreRepository } from "./baseRepository";

// Mock Firestore
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  QueryConstraint: jest.fn(),
  DocumentData: jest.fn(),
  Firestore: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

// Create a test implementation
class TestRepository extends FirestoreRepository<{ id?: string; name: string; value: number }> {
  protected collectionName = "testCollection";

  protected mapDoc(doc: { id: string } & Record<string, unknown>) {
    return {
      id: doc.id,
      name: doc.name as string,
      value: doc.value as number,
    };
  }
}

describe("FirestoreRepository", () => {
  let repository: TestRepository;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockGetDocs: any;
  let mockGetDoc: any;
  let mockAddDoc: any;
  let mockUpdateDoc: any;
  let mockDeleteDoc: any;
  let mockWriteBatch: any;
  let mockOnSnapshot: any;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new TestRepository();
    
    // Import mocked functions
    const { collection, doc, query, getDocs, getDoc, addDoc, updateDoc, deleteDoc, writeBatch, onSnapshot } = require("firebase/firestore");
    mockCollection = collection;
    mockDoc = doc;
    mockQuery = query;
    mockGetDocs = getDocs;
    mockGetDoc = getDoc;
    mockAddDoc = addDoc;
    mockUpdateDoc = updateDoc;
    mockDeleteDoc = deleteDoc;
    mockWriteBatch = writeBatch;
    mockOnSnapshot = onSnapshot;
  });

  describe("getById", () => {
    it("should return mapped document when found", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: "doc1",
        data: () => ({ name: "Test", value: 42 })
      });

      const result = await repository.getById("doc1");
      
      expect(mockDoc).toHaveBeenCalledWith({}, "testCollection", "doc1");
      expect(mockGetDoc).toHaveBeenCalled();
      expect(result).toEqual({ id: "doc1", name: "Test", value: 42 });
    });

    it("should return null when document not found", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await repository.getById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return mapped documents", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: "doc1", data: () => ({ name: "Test 1", value: 1 }) },
          { id: "doc2", data: () => ({ name: "Test 2", value: 2 }) }
        ]
      });

      const result = await repository.getAll([]);
      
      expect(mockCollection).toHaveBeenCalledWith({}, "testCollection");
      expect(mockQuery).toHaveBeenCalled();
      expect(mockGetDocs).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "doc1", name: "Test 1", value: 1 });
      expect(result[1]).toEqual({ id: "doc2", name: "Test 2", value: 2 });
    });
  });

  describe("create", () => {
    it("should create document with timestamp", async () => {
      mockAddDoc.mockResolvedValue({ id: "newDoc" });

      const result = await repository.create({ name: "New", value: 100 });
      
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: "New",
          value: 100,
          createdAt: expect.anything()
        })
      );
      expect(result).toBe("newDoc");
    });
  });

  describe("update", () => {
    it("should update document", async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await repository.update("doc1", { value: 200 });
      
      expect(mockDoc).toHaveBeenCalledWith({}, "testCollection", "doc1");
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { value: 200 }
      );
    });
  });

  describe("delete", () => {
    it("should delete document", async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await repository.delete("doc1");
      
      expect(mockDoc).toHaveBeenCalledWith({}, "testCollection", "doc1");
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("should set up subscription and return unsubscribe function", () => {
      const mockUnsubscribe = jest.fn();
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);
      
      const callback = jest.fn();
      const unsubscribe = repository.subscribe([], callback);
      
      expect(mockQuery).toHaveBeenCalled();
      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe("function");
      
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it("should call callback with mapped documents on snapshot", () => {
      const mockUnsubscribe = jest.fn();
      let snapshotCallback: Function;
      mockOnSnapshot.mockImplementation((_, cb) => {
        snapshotCallback = cb;
        return mockUnsubscribe;
      });
      
      const callback = jest.fn();
      repository.subscribe([], callback);
      
      // Simulate snapshot
      snapshotCallback!({
        docs: [
          { id: "doc1", data: () => ({ name: "Test 1", value: 1 }) },
          { id: "doc2", data: () => ({ name: "Test 2", value: 2 }) }
        ]
      });
      
      expect(callback).toHaveBeenCalledWith([
        { id: "doc1", name: "Test 1", value: 1 },
        { id: "doc2", name: "Test 2", value: 2 }
      ]);
    });
  });

  describe("batchWrite", () => {
    it("should batch create operations", async () => {
      const mockBatch = { set: jest.fn(), update: jest.fn(), delete: jest.fn(), commit: jest.fn() };
      mockWriteBatch.mockReturnValue(mockBatch);

      await repository.batchWrite([
        { type: "create", data: { name: "New 1", value: 1 } },
        { type: "create", data: { name: "New 2", value: 2 } }
      ]);
      
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should batch update operations", async () => {
      const mockBatch = { set: jest.fn(), update: jest.fn(), delete: jest.fn(), commit: jest.fn() };
      mockWriteBatch.mockReturnValue(mockBatch);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ name: "Existing", value: 0, groupIds: [] })
      });

      await repository.batchWrite([
        { type: "update", id: "doc1", data: { value: 100 } },
        { type: "update", id: "doc2", data: { value: 200 } }
      ]);
      
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should batch delete operations", async () => {
      const mockBatch = { set: jest.fn(), update: jest.fn(), delete: jest.fn(), commit: jest.fn() };
      mockWriteBatch.mockReturnValue(mockBatch);

      await repository.batchWrite([
        { type: "delete", id: "doc1" },
        { type: "delete", id: "doc2" }
      ]);
      
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});