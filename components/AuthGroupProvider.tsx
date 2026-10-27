"use client";

import "@/lib/i18n"; // Initializes multi-language support
import i18n from "@/lib/i18n";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";

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

  // When the signed-in account changes (login, logout, account switch), drop all
  // per-account state during render — effects must not reset state synchronously.
  const currentUid = user?.uid ?? null;
  const [prevUid, setPrevUid] = useState<string | null>(null);
  if (currentUid !== prevUid) {
    setPrevUid(currentUid);
    setUserProfile(null);
    setUserNickname("");
    setUserGroups([]);
    setActiveGroup(null);
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Keep <html lang> in sync with the selected language (a11y + font shaping)
  useEffect(() => {
    const syncLang = (lng: string) => { document.documentElement.lang = lng; };
    syncLang(i18n.language);
    i18n.on("languageChanged", syncLang);
    return () => { i18n.off("languageChanged", syncLang); };
  }, []);

  // 1. LIVE PROFILE LISTENER: Auto-updates if a partner links to you!
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
      if (!docSnap.exists()) {
        // Initialization for brand new accounts.
        // Cancel must never loop forever (it froze the whole app before).
        let nick = prompt(i18n.t("profile.enterNickname"));
        if (!nick || !nick.trim()) nick = prompt(i18n.t("profile.nicknameRequired"));
        const fallback = user.displayName?.trim() || user.email?.split("@")[0] || "Player";
        const nickname = nick && nick.trim() ? nick.trim() : fallback;

        await setDoc(userDocRef, {
          uid: user.uid,
          nickname,
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
    if (!user) return;
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