import { initializeApp } from 'firebase/app';
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY,
  authDomain: 'zephyr-3fb26.firebaseapp.com',
  projectId: 'zephyr-3fb26',
  storageBucket: 'zephyr-3fb26.appspot.com',
  messagingSenderId: '300612603796',
  appId: '1:300612603796:web:ecd19c646ac1f246bd4981'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function getById(collectionName, id) {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);

  const data = docSnap.exists() ? docSnap.data() : null;

  if (data === null || data === undefined) return null;

  return { id, ...data };
}

export async function list(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });
}
