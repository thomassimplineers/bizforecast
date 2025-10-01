import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'bizcast-2025',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator
try {
  connectFirestoreEmulator(db, 'localhost', 8080);
} catch (error) {
  // Already connected
}

async function clearCollection(collectionName: string) {
  const querySnapshot = await getDocs(collection(db, collectionName));
  const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  console.log(`   ✅ Cleared ${querySnapshot.docs.length} documents from ${collectionName}`);
}

async function clearDatabase() {
  console.log('🧹 Clearing database...');
  
  try {
    await clearCollection('deals');
    await clearCollection('manufacturers');
    await clearCollection('resellers');
    
    console.log('🎉 Database cleared successfully!');
  } catch (error) {
    console.error('❌ Clear failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

clearDatabase();
