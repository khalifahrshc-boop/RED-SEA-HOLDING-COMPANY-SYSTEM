import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

function convertTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (Array.isArray(obj)) return obj.map(convertTimestamps);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object' && typeof val.toDate === 'function') {
      result[key] = val.toDate().toISOString();
    } else if (val && typeof val === 'object') {
      result[key] = convertTimestamps(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

function cleanData(data: any): any {
  const result = { ...data };
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialValue: T[]
): [T[], (value: T[] | ((val: T[]) => T[])) => void] {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>(initialValue);
  const lastSyncData = useRef<T[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // For local responsiveness, if initial data differs from lastSyncData when mounting,
    // we assume we load from initialValue first. We don't overwrite until snapshot.
    const unsubscribe = onSnapshot(query(collection(db, collectionName)), (snapshot) => {
      const remoteData = snapshot.docs.map(doc => {
        const item = convertTimestamps(doc.data());
        return { ...item, id: doc.id } as T;
      });
      lastSyncData.current = remoteData;
      setData(remoteData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
    });

    return () => unsubscribe();
  }, [user, collectionName]);

  const updateData = React.useCallback(async (action: T[] | ((val: T[]) => T[])) => {
    const nextData = typeof action === 'function' ? (action as Function)(data) : action;
    setData(nextData);

    if (!user) return;

    const previousData = lastSyncData.current;
    lastSyncData.current = nextData;

    try {
      // Find changed or new items
      const changedOrNew = nextData.filter((item: T) => {
        const prev = previousData.find(p => p.id === item.id);
        if (!prev) return true;
        return JSON.stringify(prev) !== JSON.stringify(item);
      });

      for (const item of changedOrNew) {
        const { id, ...rest } = item;
        await setDoc(doc(db, collectionName, id), cleanData(rest), { merge: true });
      }

      // Find deleted items
      const deletedIds = previousData
        .filter(prev => !nextData.some(n => n.id === prev.id))
        .map(prev => prev.id);

      for (const id of deletedIds) {
        await deleteDoc(doc(db, collectionName, id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  }, [user, collectionName, data]);

  return [data, updateData];
}
