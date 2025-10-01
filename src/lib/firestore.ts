import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Deal, DealFormData, Manufacturer, Reseller, BDM } from '@/types';
import { calculateMarginUSD } from './calculations';

// Manufacturers
export async function getManufacturers(): Promise<Manufacturer[]> {
  const querySnapshot = await getDocs(
    query(collection(db, 'manufacturers'), orderBy('name'))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Manufacturer[];
}

export async function addManufacturer(name: string): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'manufacturers'), {
    name,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateManufacturer(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'manufacturers', id), {
    name,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteManufacturer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'manufacturers', id));
}

// Resellers
export async function getResellers(): Promise<Reseller[]> {
  const querySnapshot = await getDocs(
    query(collection(db, 'resellers'), orderBy('name'))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Reseller[];
}

export async function addReseller(name: string): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'resellers'), {
    name,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateReseller(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'resellers', id), {
    name,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteReseller(id: string): Promise<void> {
  await deleteDoc(doc(db, 'resellers', id));
}

// BDMs
export async function getBDMs(): Promise<BDM[]> {
  const querySnapshot = await getDocs(
    query(collection(db, 'bdms'), orderBy('name'))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as BDM[];
}

export async function addBDM(name: string): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'bdms'), {
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateBDM(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'bdms', id), {
    name: name.trim(),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteBDM(id: string): Promise<void> {
  await deleteDoc(doc(db, 'bdms', id));
}

// Deals
export async function getDeals(): Promise<Deal[]> {
  const querySnapshot = await getDocs(
    query(collection(db, 'deals'), orderBy('updatedAt', 'desc'))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Deal[];
}

export async function getDeal(id: string): Promise<Deal | null> {
  const docSnap = await getDoc(doc(db, 'deals', id));
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
    } as Deal;
  }
  return null;
}

export async function addDeal(dealData: DealFormData): Promise<string> {
  const now = Timestamp.now();
  
  // Calculate margin USD from sell price and margin percentage
  const marginUSD = calculateMarginUSD(dealData.sellUSD, dealData.marginPct);
  
  const docRef = await addDoc(collection(db, 'deals'), {
    ...dealData,
    marginUSD,
    createdAt: now,
    updatedAt: now,
  });
  
  return docRef.id;
}

export async function updateDeal(id: string, dealData: DealFormData): Promise<void> {
  // Calculate margin USD from sell price and margin percentage
  const marginUSD = calculateMarginUSD(dealData.sellUSD, dealData.marginPct);
  
  await updateDoc(doc(db, 'deals', id), {
    ...dealData,
    marginUSD,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteDeal(id: string): Promise<void> {
  await deleteDoc(doc(db, 'deals', id));
}

// Utility functions for getting reference data as maps
export async function getManufacturersMap(): Promise<Map<string, string>> {
  const manufacturers = await getManufacturers();
  return new Map(manufacturers.map(m => [m.id, m.name]));
}

export async function getResellersMap(): Promise<Map<string, string>> {
  const resellers = await getResellers();
  return new Map(resellers.map(r => [r.id, r.name]));
}

export async function getBDMsMap(): Promise<Map<string, string>> {
  const bdms = await getBDMs();
  return new Map(bdms.map(b => [b.id, b.name]));
}
