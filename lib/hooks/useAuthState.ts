"use client";

import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { UserProfile, Group } from "@/lib/types";
import { collection, query, where, onSnapshot as onSnapshotGroups, getDocs, addDoc } from "firebase/firestore";

interface UseAuthStateReturn {
  user: User | null;
  userProfile: UserProfile | null;
  userNickname: string;
  loading: boolean;
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  userGroups: Group[];
  error: Error | null;
}

export function useAuthState(): UseAuthStateReturn {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userNickname, setUserNickname] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const hasInitialized = useRef(false);

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Profile listener
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setUserNickname("");
      setUserGroups([]);
      setActiveGroup(null);
      return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
      if (!docSnap.exists()) {
        // Initialize new user profile
        let nick = prompt("Welcome to Boardgame Tracker! Please enter a nickname:");
        if (!nick || !nick.trim()) nick = prompt("A nickname is required. Please enter a nickname:");
        const fallback = user.displayName?.trim() || user.email?.split("@")[0] || "Player";
        const nickname = nick && nick.trim() ? nick.trim() : fallback;

        try {
          await setDoc(userDocRef, {
            uid: user.uid,
            nickname,
            email: user.email?.toLowerCase() || "",
            isCouple: false,
            partnerId: null,
            friendsList: [],
            createdAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Failed to create user profile:", err);
          setError(err as Error);
        }
      } else {
        const data = docSnap.data() as UserProfile;
        setUserProfile(data);
        setUserNickname(data.nickname);
        
        // Backfill missing fields for older accounts
        if (data.isCouple === undefined) {
          try {
            await setDoc(userDocRef, { 
              isCouple: false, 
              partnerId: null, 
              friendsList: data.friendsList || [] 
            }, { merge: true });
          } catch (err) {
            console.error("Failed to backfill user profile:", err);
          }
        }
      }
    });

    return () => unsubProfile();
  }, [user]);

  // Default system groups
  useEffect(() => {
    if (!user) return;
    
    const checkDefaults = async () => {
      try {
        const q = query(collection(db, "groups"), where("ownerId", "==", user.uid), where("isSystem", "==", true));
        const snap = await getDocs(q);
        
        if (snap.empty && !hasInitialized.current) {
          hasInitialized.current = true;
          
          for (const name of ['Owned', 'Want to buy', 'Pre-ordered']) {
            await addDoc(collection(db, "groups"), { 
              name, 
              ownerId: user.uid, 
              members: [user.email || user.uid], 
              isSystem: true, 
              createdAt: serverTimestamp() 
            });
          }
        }
      } catch (err) {
        console.error("Failed to check default groups:", err);
        setError(err as Error);
      }
    };
    
    checkDefaults();
  }, [user]);

  // Groups listener
  useEffect(() => {
    if (!user) return;
    
    const identifier = user.email || user.uid;
    const q = query(collection(db, "groups"), where("members", "array-contains", identifier));
    
    const unsubscribeGroups = onSnapshotGroups(q, (snapshot) => {
      const groups = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Group));
      groups.sort((a, b) => (b.isSystem ? 1 : 0) - (a.isSystem ? 1 : 0));
      setUserGroups(groups);
    });
    
    return () => unsubscribeGroups();
  }, [user]);

  return {
    user,
    userProfile,
    userNickname,
    loading,
    activeGroup,
    setActiveGroup,
    userGroups,
    error
  };
}

// Need to import useRef
// import { useRef } from "react"; // Already imported at top