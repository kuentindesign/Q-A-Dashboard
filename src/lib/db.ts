import { db, auth } from './firebase';
import { Classroom } from '../types';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Fetch all classrooms for a logged-in user
export async function getClassroomsFromCloud(uid: string): Promise<Classroom[]> {
  const path = 'classrooms';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snapshot = await getDocs(q);
    const classrooms: Classroom[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      classrooms.push({
        id: data.id,
        name: data.name,
        description: data.description,
        students: data.students || [],
        createdAt: data.createdAt,
      });
    });
    // Sort by createdAt desc
    return classrooms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Save or update a classroom in Firestore
export async function saveClassroomToCloud(classroom: Classroom, uid: string): Promise<void> {
  const path = `classrooms/${classroom.id}`;
  try {
    const docRef = doc(db, 'classrooms', classroom.id);
    await setDoc(docRef, {
      id: classroom.id,
      userId: uid,
      name: classroom.name,
      description: classroom.description,
      students: classroom.students,
      createdAt: classroom.createdAt,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete a classroom from Firestore
export async function deleteClassroomFromCloud(classroomId: string): Promise<void> {
  const path = `classrooms/${classroomId}`;
  try {
    const docRef = doc(db, 'classrooms', classroomId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Upload/Merge Local classrooms into Cloud
export async function mergeLocalClassroomsToCloud(localClassrooms: Classroom[], uid: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const classroom of localClassrooms) {
      const docRef = doc(db, 'classrooms', classroom.id);
      batch.set(docRef, {
        id: classroom.id,
        userId: uid,
        name: classroom.name,
        description: classroom.description,
        students: classroom.students,
        createdAt: classroom.createdAt,
        updatedAt: new Date().toISOString()
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'classrooms/batch');
  }
}
