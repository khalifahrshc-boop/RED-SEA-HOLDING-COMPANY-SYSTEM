import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { AppNotification } from '../types';

const COLLECTION_NAME = 'notifications';

export const notificationService = {
  // Send a notification
  send: async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        ...notification,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  // Subscribe to notifications for a specific user/department
  subscribe: (
    userDept: string, 
    isAdmin: boolean, 
    callback: (notifications: AppNotification[]) => void
  ) => {
    let q;
    if (isAdmin) {
      // Admins see all notifications
      q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    } else {
      // Users see notifications for their department or 'All'
      q = query(
        collection(db, COLLECTION_NAME), 
        where('department', 'in', [userDept, 'All']),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Handle Timestamp conversion
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        } as AppNotification;
      });
      callback(notifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  // Mark as read
  markAsRead: async (id: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  // Delete
  delete: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  },

  // Clear all for a specific user role/department
  clearAll: async (type: 'notifications' | 'messages', notifications: AppNotification[]) => {
    try {
      // Firestore doesn't support bulk delete easily without Batch, and we have the list
      // So we iterate and delete. For scale, Cloud Functions are better, but this works for now.
      const promises = notifications.map(n => deleteDoc(doc(db, COLLECTION_NAME, n.id)));
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
    }
  }
};
