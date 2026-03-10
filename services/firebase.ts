/**
 * Firebase v10 modular SDK setup
 * Firestore CRUD + Google Sign-In + Offline persistence
 */
import { default as AsyncStorage, default as ReactNativeAsyncStorage } from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
    Auth,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    getAuth,
    getReactNativePersistence,
    GoogleAuthProvider,
    initializeAuth,
    OAuthProvider,
    onAuthStateChanged,
    signInAnonymously,
    signInWithCredential,
    signInWithEmailAndPassword,
    updateProfile,
    User,
} from "firebase/auth";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    Firestore,
    getDocs,
    getFirestore,
    initializeFirestore,
    memoryLocalCache,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";

// Firebase config from .env
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
};

// Initialize Firebase (singleton)
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export function initFirebase() {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // Use memory cache on React Native — offline-first is handled by Zustand + AsyncStorage
  try {
    db = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  } catch (e) {
    db = getFirestore(app);
  }

  // Persist auth state across app restarts using AsyncStorage
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (e) {
    // Auth already initialized (hot reload / singleton)
    auth = getAuth(app);
  }

  return { app, db, auth };
}

export function getDb() {
  if (!db) initFirebase();
  return db;
}

export function getAuthInstance() {
  if (!auth) initFirebase();
  return auth;
}

// ─── Auth — Apple Sign-In ────────────────────────────────────

export async function signInWithApple(
    identityToken: string,
    nonce: string,
    fullName?: { givenName?: string | null; familyName?: string | null } | null
): Promise<User> {
    const authInstance = getAuthInstance();
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
    const result = await signInWithCredential(authInstance, credential);
    const user = result.user;

    // Apple only provides the name on the very first sign-in.
    // Store whatever we received; fall back to "User" on subsequent logins.
    const displayName =
        fullName?.givenName
            ? `${fullName.givenName}${fullName.familyName ? ' ' + fullName.familyName : ''}`
            : user.displayName || 'User';

    if (!user.displayName && displayName !== 'User') {
        await updateProfile(user, { displayName });
    }

    await saveUser(user.uid, displayName);
    await AsyncStorage.setItem('@medimind_userId', user.uid);
    await AsyncStorage.setItem('@medimind_userName', displayName);
    await AsyncStorage.setItem('@medimind_userPhoto', user.photoURL || '');
    await AsyncStorage.setItem('@medimind_userEmail', user.email || '');

    return user;
}

// ─── Auth — Google Sign-In ───────────────────────────────────

export async function signInWithGoogle(idToken: string): Promise<User> {
  const authInstance = getAuthInstance();
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(authInstance, credential);

  // Save user info to Firestore and AsyncStorage
  const user = result.user;
  await saveUser(user.uid, user.displayName || "User");
  await AsyncStorage.setItem("@medimind_userId", user.uid);
  await AsyncStorage.setItem("@medimind_userName", user.displayName || "User");
  await AsyncStorage.setItem("@medimind_userPhoto", user.photoURL || "");
  await AsyncStorage.setItem("@medimind_userEmail", user.email || "");

  return user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const authInstance = getAuthInstance();
  const result = await createUserWithEmailAndPassword(
    authInstance,
    email,
    password,
  );
  const user = result.user;

  // Set display name from email
  const displayName = email.split("@")[0];
  await updateProfile(user, { displayName });

  await saveUser(user.uid, displayName);
  await AsyncStorage.setItem("@medimind_userId", user.uid);
  await AsyncStorage.setItem("@medimind_userName", displayName);
  await AsyncStorage.setItem("@medimind_userPhoto", "");
  await AsyncStorage.setItem("@medimind_userEmail", email);

  return user;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const authInstance = getAuthInstance();
  const result = await signInWithEmailAndPassword(
    authInstance,
    email,
    password,
  );
  const user = result.user;

  await AsyncStorage.setItem("@medimind_userId", user.uid);
  await AsyncStorage.setItem(
    "@medimind_userName",
    user.displayName || email.split("@")[0],
  );
  await AsyncStorage.setItem("@medimind_userPhoto", user.photoURL || "");
  await AsyncStorage.setItem("@medimind_userEmail", user.email || email);

  return user;
}

export async function signInAnon(): Promise<string> {
  const authInstance = getAuthInstance();
  const result = await signInAnonymously(authInstance);
  await AsyncStorage.setItem("@medimind_userId", result.user.uid);
  return result.user.uid;
}

export async function signOut(): Promise<void> {
  const authInstance = getAuthInstance();
  await firebaseSignOut(authInstance);
  await AsyncStorage.multiRemove([
    "@medimind_userId",
    "@medimind_userName",
    "@medimind_userPhoto",
    "@medimind_userEmail",
  ]);
}

export function getCurrentUser(): User | null {
  const authInstance = getAuthInstance();
  return authInstance.currentUser;
}

export function onAuthChange(callback: (userId: string | null) => void) {
  const authInstance = getAuthInstance();
  return onAuthStateChanged(authInstance, (user) => {
    callback(user?.uid || null);
  });
}

// ─── User ────────────────────────────────────────────────────

export async function saveUser(userId: string, name: string) {
  const firestore = getDb();
  await setDoc(
    doc(firestore, "users", userId),
    {
      name,
      createdAt: Timestamp.now(),
    },
    { merge: true },
  );
}

// ─── Medicines ───────────────────────────────────────────────

export interface MedicineData {
  name: string;
  times: string[];
  frequency: string;
  customDays: number[];
  color: string;
  active: boolean;
  notifIds: string[];
  startDate: Date;
}

export async function addMedicine(
  userId: string,
  medicineData: MedicineData,
): Promise<string> {
  const firestore = getDb();
  const ref = await addDoc(
    collection(firestore, "users", userId, "medicines"),
    {
      ...medicineData,
      startDate: Timestamp.fromDate(medicineData.startDate),
    },
  );
  return ref.id;
}

export async function updateMedicine(
  userId: string,
  medicineId: string,
  updates: Partial<MedicineData>,
) {
  const firestore = getDb();
  const updateData: any = { ...updates };
  if (updates.startDate) {
    updateData.startDate = Timestamp.fromDate(updates.startDate);
  }
  await updateDoc(
    doc(firestore, "users", userId, "medicines", medicineId),
    updateData,
  );
}

export async function deleteMedicine(userId: string, medicineId: string) {
  const firestore = getDb();
  await deleteDoc(doc(firestore, "users", userId, "medicines", medicineId));
}

export async function getMedicines(
  userId: string,
): Promise<(MedicineData & { id: string })[]> {
  const firestore = getDb();
  const snapshot = await getDocs(
    collection(firestore, "users", userId, "medicines"),
  );
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    startDate: d.data().startDate?.toDate?.() || new Date(),
  })) as (MedicineData & { id: string })[];
}

// ─── Dose Logs ───────────────────────────────────────────────

export interface DoseLogData {
  medicineId: string;
  medicineName: string;
  scheduledTime: string;
  scheduledDate: string;
  takenAt: Date | null;
  skipped: boolean;
  note: string;
}

export async function logDose(
  userId: string,
  logData: DoseLogData,
): Promise<string> {
  const firestore = getDb();
  const ref = await addDoc(collection(firestore, "users", userId, "logs"), {
    ...logData,
    takenAt: logData.takenAt ? Timestamp.fromDate(logData.takenAt) : null,
  });
  return ref.id;
}

export async function getTodayLogs(
  userId: string,
  date: string,
): Promise<(DoseLogData & { id: string })[]> {
  const firestore = getDb();
  const q = query(
    collection(firestore, "users", userId, "logs"),
    where("scheduledDate", "==", date),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    takenAt: d.data().takenAt?.toDate?.() || null,
  })) as (DoseLogData & { id: string })[];
}
