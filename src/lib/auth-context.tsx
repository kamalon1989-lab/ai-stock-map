"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  browserLocalPersistence, onAuthStateChanged, setPersistence,
  signInWithPopup, signOut, User,
} from "firebase/auth";
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

  useEffect(() => {
    // 인증 상태를 로컬에 영속 저장 (새로고침 후에도 유지)
    setPersistence(auth, browserLocalPersistence).catch((e) =>
      console.error("Persistence error:", e)
    );

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value: Ctx = {
    user,
    loading,
    isOwner: !!user && user.uid === OWNER_UID,
    signIn: async () => {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (e) {
        console.error("Sign-in error:", e);
        throw e;
      }
    },
    signOutUser: async () => { await signOut(auth); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
