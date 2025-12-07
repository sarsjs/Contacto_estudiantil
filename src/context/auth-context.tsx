"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { fetchUsers } from "@/lib/firebase/data";
import { signInWithEmail } from "@/lib/firebase/auth"; // Import the signInWithEmail function
import type { User } from "@/lib/types";

type AuthContextValue = {
  user: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>; // Update the signIn type
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const users = await fetchUsers();
          const match = users.find((stored) => stored.email === user.email);
          if (match) setProfile(match);
        } catch (error) {
          console.error("refresh profile", error);
          setProfile(null);
        }       
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn: async (email: string, pass: string) => {
        await signInWithEmail(email, pass);
      },
      signOut: async () => {
        await auth.signOut();
      },
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
