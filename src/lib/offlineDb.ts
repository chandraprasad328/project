import {
  AccessibilityPrefs,
  DoubtChatMessage,
  ExamAttempt,
  LearningModule,
  PracticeAttempt,
  QuestionItem,
  SubjectInfo,
  TeacherRecommendation,
} from '../shared/types';

const DB_NAME = 'learnlocal-offline-v2';
const DB_VERSION = 2;

export interface CachedClassPack {
  classLevel: number;
  subjects: SubjectInfo[];
  modules: LearningModule[];
  questions: QuestionItem[];
  downloadedAt: string;
  downloadedSubjectIds: string[];
  pendingSubjectIds?: string[]; // supports resumable interrupted downloads
  sizeKB?: number;
}

export function estimatePackSizeKB(modules: LearningModule[], questions: QuestionItem[]): number {
  try {
    const bytes = new Blob([JSON.stringify({ modules, questions })]).size;
    return Math.max(1, Math.round(bytes / 1024));
  } catch {
    return Math.max(12, modules.length * 4 + questions.length);
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('curriculumPacks')) {
        db.createObjectStore('curriculumPacks', { keyPath: 'classLevel' });
      }
      if (!db.objectStoreNames.contains('attempts')) {
        const store = db.createObjectStore('attempts', { keyPath: 'id' });
        store.createIndex('studentId', 'studentId', { unique: false });
      }
      if (!db.objectStoreNames.contains('exams')) {
        const store = db.createObjectStore('exams', { keyPath: 'id' });
        store.createIndex('studentId', 'studentId', { unique: false });
      }
      if (!db.objectStoreNames.contains('chatHistory')) {
        db.createObjectStore('chatHistory', { keyPath: 'userId' });
      }
      if (!db.objectStoreNames.contains('recommendations')) {
        db.createObjectStore('recommendations', { keyPath: 'studentId' });
      }
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'userId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveClassPackOffline(pack: CachedClassPack): Promise<void> {
  const db = await openDB();
  const sizeKB = pack.sizeKB ?? estimatePackSizeKB(pack.modules, pack.questions);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('curriculumPacks', 'readwrite');
    tx.objectStore('curriculumPacks').put({ ...pack, sizeKB });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getClassPackOffline(classLevel: number): Promise<CachedClassPack | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('curriculumPacks', 'readonly');
      const req = tx.objectStore('curriculumPacks').get(classLevel);
      req.onsuccess = () => resolve((req.result as CachedClassPack) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveAttemptOffline(attempt: PracticeAttempt): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attempts', 'readwrite');
    tx.objectStore('attempts').put(attempt);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStudentAttemptsOffline(studentId: string): Promise<PracticeAttempt[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('attempts', 'readonly');
      const index = tx.objectStore('attempts').index('studentId');
      const req = index.getAll(studentId);
      req.onsuccess = () => {
        const list = (req.result as PracticeAttempt[]) || [];
        list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function reconcileStudentAttemptsOffline(
  studentId: string,
  serverAttempts: PracticeAttempt[]
): Promise<void> {
  const db = await openDB();
  const existing = await getStudentAttemptsOffline(studentId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attempts', 'readwrite');
    const store = tx.objectStore('attempts');
    for (const item of existing) {
      if (item.synced) {
        store.delete(item.id);
      }
    }
    for (const att of serverAttempts) {
      store.put({ ...att, synced: true });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getUnsyncedAttemptsOffline(studentId: string): Promise<PracticeAttempt[]> {
  const all = await getStudentAttemptsOffline(studentId);
  return all.filter((a) => !a.synced);
}

export async function markAttemptsSyncedOffline(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attempts', 'readwrite');
    const store = tx.objectStore('attempts');
    ids.forEach((id) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result as PracticeAttempt | undefined;
        if (item) {
          item.synced = true;
          store.put(item);
        }
      };
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Exam Attempt Offline Storage & Reconciliation
export async function saveExamOffline(exam: ExamAttempt): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exams', 'readwrite');
    tx.objectStore('exams').put(exam);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStudentExamsOffline(studentId: string): Promise<ExamAttempt[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readonly');
      const index = tx.objectStore('exams').index('studentId');
      const req = index.getAll(studentId);
      req.onsuccess = () => {
        const list = (req.result as ExamAttempt[]) || [];
        list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function reconcileStudentExamsOffline(
  studentId: string,
  serverExams: ExamAttempt[]
): Promise<void> {
  const db = await openDB();
  const existing = await getStudentExamsOffline(studentId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exams', 'readwrite');
    const store = tx.objectStore('exams');
    for (const item of existing) {
      if (item.synced) store.delete(item.id);
    }
    for (const ex of serverExams) {
      store.put({ ...ex, synced: true });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getUnsyncedExamsOffline(studentId: string): Promise<ExamAttempt[]> {
  const all = await getStudentExamsOffline(studentId);
  return all.filter((e) => !e.synced);
}

export async function markExamsSyncedOffline(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exams', 'readwrite');
    const store = tx.objectStore('exams');
    ids.forEach((id) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result as ExamAttempt | undefined;
        if (item) {
          item.synced = true;
          store.put(item);
        }
      };
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveChatHistoryOffline(userId: string, messages: DoubtChatMessage[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('chatHistory', 'readwrite');
      tx.objectStore('chatHistory').put({ userId, messages: messages.slice(-60) });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore storage errors gracefully
  }
}

export async function getChatHistoryOffline(userId: string): Promise<DoubtChatMessage[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('chatHistory', 'readonly');
      const req = tx.objectStore('chatHistory').get(userId);
      req.onsuccess = () => {
        const res = req.result as { userId: string; messages: DoubtChatMessage[] } | undefined;
        resolve(res?.messages || []);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveRecommendationsOffline(studentId: string, items: TeacherRecommendation[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('recommendations', 'readwrite');
      tx.objectStore('recommendations').put({ studentId, items });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}

export async function getRecommendationsOffline(studentId: string): Promise<TeacherRecommendation[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('recommendations', 'readonly');
      const req = tx.objectStore('recommendations').get(studentId);
      req.onsuccess = () => {
        const res = req.result as { studentId: string; items: TeacherRecommendation[] } | undefined;
        resolve(res?.items || []);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveAccessibilityPrefsOffline(userId: string, prefs: AccessibilityPrefs): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('preferences', 'readwrite');
      tx.objectStore('preferences').put({ userId, prefs });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}

export async function getAccessibilityPrefsOffline(userId: string): Promise<AccessibilityPrefs | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('preferences', 'readonly');
      const req = tx.objectStore('preferences').get(userId);
      req.onsuccess = () => {
        const res = req.result as { userId: string; prefs: AccessibilityPrefs } | undefined;
        resolve(res?.prefs || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
