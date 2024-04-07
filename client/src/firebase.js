import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY,
  authDomain: 'zephyr-3fb26.firebaseapp.com',
  projectId: 'zephyr-3fb26',
  storageBucket: 'zephyr-3fb26.appspot.com',
  messagingSenderId: '300612603796',
  appId: '1:300612603796:web:ecd19c646ac1f246bd4981',
  measurementId: 'G-ZH821HP63J'
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);

export function getUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);
  return user;
}

export async function getStationById(id) {
  const docRef = doc(db, 'stations', id);
  try {
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : null;
    if (data === null || data === undefined) return null;
    return { id, ...data };
  } catch (error) {
    console.error(error);
  }
}

export async function listStations() {
  try {
    const snap = await getDocs(collection(db, 'stations'));
    return snap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsUpdatedSince(time) {
  try {
    const q = query(collection(db, 'stations'), where('lastUpdate', '>=', time));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsWithErrors() {
  try {
    const q = query(
      collection(db, 'stations'),
      where('isError', '==', true),
      orderBy('isOffline', 'desc'),
      orderBy('name')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error(error);
  }
}

export async function loadStationData(stationId) {
  try {
    const q = query(
      collection(db, `stations/${stationId}/data`),
      orderBy('time', 'desc'),
      limit(145)
    ); // data for last 24h
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error(error);
  }
}

export async function getCamById(id) {
  const docRef = doc(db, 'cams', id);
  try {
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : null;
    if (data === null || data === undefined) return null;
    return { id, ...data };
  } catch (error) {
    console.error(error);
  }
}

export async function listCams() {
  try {
    const q = query(collection(db, 'cams'), orderBy('currentTime'));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error(error);
  }
}

export async function listCamsUpdatedSince(time) {
  try {
    const q = query(
      collection(db, 'cams'),
      where('lastUpdate', '>=', time),
      orderBy('currentTime')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error(error);
  }
}

export async function loadCamImages(camId) {
  try {
    // data for last 24h only
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, `cams/${camId}/images`),
      where('time', '>=', date),
      orderBy('time', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error(error);
  }
}
