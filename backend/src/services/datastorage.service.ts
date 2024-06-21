import { Firestore } from '@google-cloud/firestore';

export class DataStorageService<T extends object> {
  private collectionName: string;

  private firestore = new Firestore({
    databaseId: process.env.DATABASE_ID || 'voice-assistant',
  });

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  public async getObject(docId: string): Promise<T> {
    const docRef = this.firestore.collection(this.collectionName).doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error(`Document not found: ${docId}`);
    }

    return doc.data() as T;
  }

  public async saveObject(docId: string, data: T): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(docId);
    await docRef.set(data);
  }

  public async createObject(data: T): Promise<string> {
    const docRef = this.firestore.collection(this.collectionName).doc();
    await docRef.set(data);
    return docRef.id;
  }

  public async deleteObject(docId: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(docId);
    await docRef.delete();
  }

  public async hasObject(docId: string): Promise<boolean> {
    const docRef = this.firestore.collection(this.collectionName).doc(docId);
    const doc = await docRef.get();
    return doc.exists;
  }

  public async listObjectIds(): Promise<string[]> {
    const querySnapshot = await this.firestore.collection(this.collectionName).get();
    return querySnapshot.docs.map(doc => doc.id);
  }
}
