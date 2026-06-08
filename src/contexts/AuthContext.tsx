import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { UserData as UserDataInterface } from '../types';

interface AuthContextType {
  user: User | null;
  userData: UserDataInterface | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  hasPermission: (deptId: string, sectionId: string, action?: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signInWithEmail: async () => {},
  logOut: async () => {},
  hasPermission: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserDataInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setError(null);
        setUser(user);
        if (user) {
          // Fetch user document by UID
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data() as UserDataInterface;
            // Upgrade to Admin if it's the specified email and not an admin yet
            if ((user.email === 'khalifah.rshc@gmail.com' || user.email === 'kalifah13579@hotmail.com') && data.role !== 'Admin') {
              await setDoc(userRef, { ...data, role: 'Admin', department: 'Administrator', status: 'Active' }, { merge: true });
              data.role = 'Admin';
              data.department = 'Administrator';
            }
            setUserData(data);
          } else {
            // Check if there is a document with this email (pre-enrolled user)
            const q = query(collection(db, 'users'), where('email', '==', user.email));
            const querySnap = await getDocs(q);
            
            if (!querySnap.empty) {
              // Found a pre-enrolled user by email
              const oldDoc = querySnap.docs[0];
              const oldData = oldDoc.data() as UserDataInterface;
              
              // Create the new UID-based document and delete the old one
              // OR just keep both, but it's cleaner to use UID as the canonical ID
              await setDoc(userRef, { 
                ...oldData, 
                uid: user.uid, // track uid inside
                updatedAt: serverTimestamp() 
              });
              
              // Only delete if it was a manual user ID
              if (oldDoc.id.startsWith('manual-user-')) {
                await deleteDoc(doc(db, 'users', oldDoc.id));
              }
              
              setUserData(oldData);
            } else {
              // Truly new user
              const isAdmin = user.email === 'khalifah.rshc@gmail.com' || user.email === 'kalifah13579@hotmail.com';
              const newUser: any = {
                name: user.displayName || 'Unnamed User',
                email: user.email || '',
                role: isAdmin ? 'Admin' : 'User',
                department: isAdmin ? 'Administrator' : 'User',
                permissions: [],
                status: 'Active'
              };
              await setDoc(userRef, { ...newUser, createdAt: serverTimestamp() });
              setUserData(newUser);
            }
          }
        } else {
          setUserData(null);
        }
      } catch (err: any) {
        console.error("Firestore initialization error in AuthContext:", err);
        setError(err.message || String(err));
        try {
          handleFirestoreError(err, OperationType.GET, user ? `users/${user.uid}` : 'auth');
        } catch (e) {}
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // Do not set error for user cancellation
        setError(null);
      } else {
        setError(err.message);
      }
      throw err;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      // Provide a better hint for common errors
      let friendlyMessage = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
        friendlyMessage = 'Invalid login credentials. Please check your email/password or use the "Google Service Account" button if you previously registered with Google.';
      } else if (err.code === 'auth/user-not-found') {
        friendlyMessage = 'User account not found. Please contact HR for enrollment.';
      } else if (err.code === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password. Try again or contact HR for a reset.';
      }
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const hasPermission = (deptId: string, sectionId: string, action: string = 'view') => {
    if (userData?.role === 'Admin' || userData?.department === 'Administrator' || user?.email === 'khalifah.rshc@gmail.com' || user?.email === 'kalifah13579@hotmail.com') return true;
    if (!userData?.structuredPermissions) return false;
    
    const dept = userData.structuredPermissions.departments.find(d => d.departmentId === deptId);
    if (!dept) return false;
    
    // If checking just for department access (no sectionId)
    if (!sectionId) return true;

    const section = dept.sections.find(s => s.sectionId === sectionId);
    if (!section) return false;
    
    return (section.actions as any)[action] === true;
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, error, signIn, signInWithEmail, logOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
