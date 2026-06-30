"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";

type AuthContextType = {
  user: User | null;
  userProfile: any | null; // NEW: Exposes the full profile (including couple status)
  userNickname: string;
  loading: boolean;
  activeGroup: any | null;
  setActiveGroup: (group: any | null) => void;
  userGroups: any[];
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthGroupProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userNickname, setUserNickname] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // 1. LIVE PROFILE LISTENER: Auto-updates if a partner links to you!
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setUserNickname("");
      return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
      if (!docSnap.exists()) {
        // Initialization for brand new accounts
        let nick = prompt("Welcome to Boardgame Tracker! Please enter a nickname:");
        while (!nick || !nick.trim()) nick = prompt("A nickname is required. Please enter a nickname:");
        
        await setDoc(userDocRef, {
          uid: user.uid,
          nickname: nick.trim(),
          email: user.email?.toLowerCase() || "",
          isCouple: false,
          partnerId: null,
          friendsList: [],
          createdAt: serverTimestamp()
        });
      } else {
        const data = docSnap.data();
        setUserProfile(data);
        setUserNickname(data.nickname);
        
        // Safety Backfill: Add missing couple fields to older accounts
        if (data.isCouple === undefined) {
          await setDoc(userDocRef, { isCouple: false, partnerId: null, friendsList: data.friendsList || [] }, { merge: true });
        }
      }
    });

    return () => unsubProfile();
  }, [user]);

  // 2. Default System Groups
  useEffect(() => {
    if (!user) return;
    const checkDefaults = async () => {
      const q = query(collection(db, "groups"), where("ownerId", "==", user.uid), where("isSystem", "==", true));
      const snap = await getDocs(q);
      
      // NO. 3 ADDED HERE: We check the lock, and immediately lock it if it's open!
      if (snap.empty && !hasInitialized.current) {
        hasInitialized.current = true; // LOCK THE GATES
        
        for (const name of ['Owned', 'Want to buy', 'Pre-ordered']) {
          await addDoc(collection(db, "groups"), { name, ownerId: user.uid, members: [user.email || user.uid], isSystem: true, createdAt: serverTimestamp() });
        }
      }
    };
    checkDefaults();
  }, [user]);

  // 3. Listen to Groups
  useEffect(() => {
    if (!user) {
      setUserGroups([]);
      setActiveGroup(null);
      return;
    }
    const identifier = user.email || user.uid;
    const q = query(collection(db, "groups"), where("members", "array-contains", identifier));
    const unsubscribeGroups = onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      groups.sort((a, b) => (b.isSystem ? 1 : 0) - (a.isSystem ? 1 : 0));
      setUserGroups(groups);
    });
    return () => unsubscribeGroups();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userProfile, userNickname, loading, activeGroup, setActiveGroup, userGroups }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthGroup = () => useContext(AuthContext);