import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function createAdmin() {
  try {
    const email = 'admin@ares-erp.net';
    const password = 'AdminPassword2026!';
    
    console.log('Creating user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('User created:', user.uid);
    
    console.log('Setting admin role in Firestore...');
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      name: 'System Administrator',
      email: email,
      role: 'Admin', // Used by rules
      department: 'Administrator', // Used by frontend
      permissions: ['all'],
      createdAt: serverTimestamp()
    });
    
    console.log('Admin setup complete.');
    console.log('Email:', email);
    console.log('Password:', password);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
