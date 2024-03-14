import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY,
  authDomain: 'zephyr-3fb26.firebaseapp.com',
  projectId: 'zephyr-3fb26',
  storageBucket: 'zephyr-3fb26.appspot.com',
  messagingSenderId: '300612603796',
  appId: '1:300612603796:web:ecd19c646ac1f246bd4981'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export function getUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);
  return user;
}

export async function getById(collectionName, id) {
  const docRef = doc(db, collectionName, id);
  try {
    const docSnap = await getDoc(docRef);

    const data = docSnap.exists() ? docSnap.data() : null;

    if (data === null || data === undefined) return null;

    return { id, ...data };
  } catch (error) {
    console.error(error);
  }
}

export async function list(collectionName) {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error(error);
  }
}

export async function loadSiteData(siteId) {
  try {
    const sitesRef = collection(db, `sites/${siteId}/data`);
    const q = query(sitesRef, orderBy('time', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error(error);
  }
}
