"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
// UPDATED: Added doc, getDoc, setDoc
import { collection, query, where, onSnapshot, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";

type AuthContextType = {
  user: User | null;
  userNickname: string; // NEW: Expose nickname to the app
  loading: boolean;
  activeGroup: any | null;
  setActiveGroup: (group: any | null) => void;
  userGroups: any[];
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthGroupProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userNickname, setUserNickname] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Check user profile and system groups
  useEffect(() => {
    if (!user) return;

    const checkUserAndDefaults = async () => {
      // 1. Handle Nickname
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      let currentNickname = "";

      if (!userDoc.exists()) {
        // Prompt for nickname on first login
        let nick = prompt("Welcome to Boardgame Tracker! Please enter a nickname:");
        while (!nick || !nick.trim()) {
          nick = prompt("A nickname is required to continue. Please enter a nickname:");
        }
        currentNickname = nick.trim();

        await setDoc(userDocRef, {
          nickname: currentNickname,
          email: user.email,
          createdAt: serverTimestamp()
        });
      } else {
        currentNickname = userDoc.data().nickname;
      }
      setUserNickname(currentNickname);

      // 2. Handle Default System Groups
      const identifier = user.email || user.uid;
      const q = query(collection(db, "groups"), where("ownerId", "==", user.uid), where("isSystem", "==", true));
      const snap = await getDocs(q);

      if (snap.empty) {
        const defaultLists = ['Owned', 'Want to buy', 'Pre-ordered'];
        for (const name of defaultLists) {
          await addDoc(collection(db, "groups"), {
            name,
            ownerId: user.uid,
            members: [identifier],
            isSystem: true,
            createdAt: serverTimestamp()
          });
        }
      }
    };

    checkUserAndDefaults();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserGroups([]);
      setActiveGroup(null);
      setUserNickname("");
      return;
    }

    const identifier = user.email || user.uid;
    const q = query(collection(db, "groups"), where("members", "array-contains", identifier));

    const unsubscribeGroups = onSnapshot(q, (snapshot) => {
      // FIX: Added 'as any[]' at the end of the map routine
      const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      groups.sort((a, b) => (b.isSystem ? 1 : 0) - (a.isSystem ? 1 : 0));
      setUserGroups(groups);
    });

    return () => unsubscribeGroups();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userNickname, loading, activeGroup, setActiveGroup, userGroups }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthGroup = () => useContext(AuthContext);