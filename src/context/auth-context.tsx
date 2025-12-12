"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { fetchUserByEmail } from "@/lib/firebase/data";
import { signInWithEmail } from "@/lib/firebase/auth";
import type { User } from "@/lib/types";

type AuthContextValue = {
  user: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setUser(user);
      if (user) {
        try {
          const userProfile = await fetchUserByEmail(user.email!);
          if (userProfile) {
            setProfile(userProfile);
          } else {
            setProfile(null);
            await auth.signOut(); 
          }
        } catch (error) {
          console.error("refresh profile", error);
          setProfile(null);
          await auth.signOut();
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isClient]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn: async (email: string, pass:string) => {
        await signInWithEmail(email, pass);
      },
      signOut: async () => {
        await auth.signOut();
      },
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{isClient ? children : null}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
