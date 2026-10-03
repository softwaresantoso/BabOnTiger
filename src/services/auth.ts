import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db, BUSINESS_ID } from "../lib/firebase";
import type { UserProfile } from "../types";

export async function signUpCustomer(
  name: string,
  phone: string,
  email: string,
  password: string
) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  await updateProfile(credential.user, {
    displayName: name,
  });

  const profile: UserProfile = {
    uid: credential.user.uid,
    businessId: BUSINESS_ID,
    name,
    phone,
    role: "customer",
    active: true,
  };

  await setDoc(doc(db, "users", credential.user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return profile;
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
}

export async function getProfile(
  uid: string
): Promise<UserProfile | null> {
  if (!uid) {
    return null;
  }

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();

  if (
    data.role !== "customer" &&
    data.role !== "owner" &&
    data.role !== "barber"
  ) {
    throw new Error("Role akun tidak valid.");
  }

  if (!data.businessId) {
    throw new Error("Business ID akun tidak ditemukan.");
  }

  return {
    uid,
    businessId: data.businessId,
    name: data.name ?? "",
    phone: data.phone ?? "",
    role: data.role,
    ...(data.branchId ? { branchId: data.branchId } : {}),
    ...(data.barberId ? { barberId: data.barberId } : {}),
    ...(data.active !== undefined
      ? { active: data.active }
      : {}),
  };
}

export function observeAuth(
  callback: (user: User | null) => void
) {
  return onAuthStateChanged(auth, callback);
}

export async function ensureGuestCustomer(
  name: string,
  phone: string
) {
  let user = auth.currentUser;

  // Pastikan user sudah authenticated.
  if (!user) {
    const credential = await signInAnonymously(auth);
    user = credential.user;
  }

  if (!user) {
    throw new Error(
      "Gagal membuat sesi pelanggan tamu."
    );
  }

  const uid = user.uid;

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      businessId: BUSINESS_ID,
      name,
      phone,
      role: "customer",
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      name,
      phone,
      updatedAt: serverTimestamp(),
    });
  }

  // Pastikan Firebase Auth masih menunjuk ke user yang sama
  // sebelum data booking ditulis ke Firestore.
  const authenticatedUser = auth.currentUser;

  if (!authenticatedUser || authenticatedUser.uid !== uid) {
    throw new Error(
      "Sesi pelanggan tamu tidak valid."
    );
  }

  return {
    uid,
    name,
    phone,
  };
}

export async function updateCustomerProfile(
  uid: string,
  name: string,
  phone: string
) {
  if (
    !auth.currentUser ||
    auth.currentUser.uid !== uid
  ) {
    throw new Error("Akses profil tidak valid.");
  }

  await updateProfile(auth.currentUser, {
    displayName: name,
  });

  await updateDoc(doc(db, "users", uid), {
    name,
    phone,
    updatedAt: serverTimestamp(),
  });
}

export async function signUpBarber(
  name: string,
  phone: string,
  email: string,
  password: string
) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  await updateProfile(credential.user, {
    displayName: name,
  });

  const requestRef = doc(
    db,
    "barberRequests",
    credential.user.uid
  );

  await setDoc(requestRef, {
    uid: credential.user.uid,
    businessId: BUSINESS_ID,
    name,
    phone,
    email,
    status: "PENDING",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return credential.user;
}