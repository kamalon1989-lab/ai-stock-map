"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  getRedirectResult, onAuthStateChanged, signInWithRedirect, signOut, User,
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
    // 리다이렉트 로그인 결과 처리 — 첫 진입 시 1회
    getRedirectResult(auth).catch((e) => console.error("Auth redirect error:", e));

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
    signIn: async () => { await signInWithRedirect(auth, googleProvider); },
    signOutUser: async () => { await signOut(auth); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
