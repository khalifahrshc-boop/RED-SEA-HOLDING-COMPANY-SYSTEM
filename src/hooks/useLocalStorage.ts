import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  const skipNextFirestoreUpdate = useRef(false);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error("Error parsing storage change:", error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-window updates
    const handleCustomUpdate = () => {
      const item = window.localStorage.getItem(key);
      if (item) setStoredValue(JSON.parse(item));
    };
    window.addEventListener(`local-storage-update-${key}`, handleCustomUpdate);
    
    let unsubscribeFirestore = () => {};
    let unsubscribeAuth = () => {};
    
    // Setup Firestore sync when authenticated (listening for auth state changes)
    if (db && auth) {
      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        // Clear previous firestore snapshot listener
        unsubscribeFirestore();
        unsubscribeFirestore = () => {};

        if (user) {
          const docRef = doc(db, 'app_data', key);
          
          // Delay initialization slighty to prevent rapid re-renders on boot if offline
          const timerId = setTimeout(() => {
            unsubscribeFirestore = onSnapshot(docRef, (snapshot) => {
              if (snapshot.exists()) {
                if (skipNextFirestoreUpdate.current) {
                  skipNextFirestoreUpdate.current = false;
                  return;
                }
                try {
                  const dataStr = snapshot.data().data;
                  if (dataStr && dataStr !== window.localStorage.getItem(key)) {
                     window.localStorage.setItem(key, dataStr);
                     setStoredValue(JSON.parse(dataStr));
                  }
                } catch(e) {}
              }
            }, (err) => {
              console.warn("Firestore sync error for key", key, err);
            });
          }, 500);

          const prevFirestore = unsubscribeFirestore;
          unsubscribeFirestore = () => {
            clearTimeout(timerId);
            prevFirestore();
          };
        }
      });
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(`local-storage-update-${key}`, handleCustomUpdate);
      unsubscribeFirestore();
      unsubscribeAuth();
    };
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue((prev: T) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        const stringified = JSON.stringify(valueToStore);
        
        // Defer side effects
        Promise.resolve().then(() => {
          try {
            const currentStr = window.localStorage.getItem(key);
            if (currentStr !== stringified) {
              window.localStorage.setItem(key, stringified);
              window.dispatchEvent(new Event(`local-storage-update-${key}`));
              
              if (auth.currentUser && db) {
                 skipNextFirestoreUpdate.current = true;
                 setDoc(doc(db, 'app_data', key), { data: stringified }).catch((e) => {
                   skipNextFirestoreUpdate.current = false;
                   console.error("Firestore save error:", e);
                 });
              }
            }
          } catch (e) {
            console.error(e);
          }
        });

        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}
