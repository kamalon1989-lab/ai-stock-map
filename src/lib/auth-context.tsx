"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { auth, googleProvider, OWNER_UID } from "./firebase";

type Ctx = {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);

  const value: Ctx = {
    user,
    loading,
    isOwner: !!user && user.uid === OWNER_UID,
    signIn: async () => { await signInWithPopup(auth, googleProvider); },
    signOutUser: async () => { await signOut(auth); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
