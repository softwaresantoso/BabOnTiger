import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, BUSINESS_ID } from "../lib/firebase";
import type { UserProfile } from "../types";

export async function signUpCustomer(name: string, phone: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  const profile: UserProfile = {
    uid: credential.user.uid,
    businessId: BUSINESS_ID,
    name,
    phone,
    role: "customer",
    active: true
  };
  await setDoc(doc(db, "users", credential.user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return profile;
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
}

export async function getProfile(user: User): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function ensureGuestCustomer(name: string, phone: string) {
  const credential = auth.currentUser ? { user: auth.currentUser } : await signInAnonymously(auth);
  const user = credential.user;
  await updateProfile(user, { displayName: name });
  const profile: UserProfile = { uid: user.uid, businessId: BUSINESS_ID, name, phone, role: "customer", active: true };
  await setDoc(doc(db, "users", user.uid), { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  return profile;
}
