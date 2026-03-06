import { getDb } from '../firebase-config.js';

const firestore = () => window.firebase.firestore;

export const getCollectionDocs = async (collectionName, options = {}) => {
  const db = await getDb();
  const { orderByField, orderDirection = 'desc' } = options;
  const collection = firestore().collection;
  const getDocs = firestore().getDocs;
  const query = firestore().query;
  const orderBy = firestore().orderBy;

  let q = collection(db, collectionName);
  if (orderByField) {
    q = query(q, orderBy(orderByField, orderDirection));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addCollectionDoc = async (collectionName, data) => {
  const db = await getDb();
  const collection = firestore().collection;
  const addDoc = firestore().addDoc;
  return addDoc(collection(db, collectionName), data);
};

export const updateCollectionDoc = async (collectionName, id, data) => {
  const db = await getDb();
  const doc = firestore().doc;
  const updateDoc = firestore().updateDoc;
  return updateDoc(doc(db, collectionName, id), data);
};

export const deleteCollectionDoc = async (collectionName, id) => {
  const db = await getDb();
  const doc = firestore().doc;
  const deleteDoc = firestore().deleteDoc;
  return deleteDoc(doc(db, collectionName, id));
};

export const serverTimestamp = () => firestore().serverTimestamp();

export const docRef = async (collectionName, id) => {
  const db = await getDb();
  const doc = firestore().doc;
  return doc(db, collectionName, id);
};
