"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Game } from "@/lib/types";

interface UseUserGamesOptions {
  user: { uid: string } | null;
  userProfile: { isCouple?: boolean; partnerId?: string | null } | null;
  activeGroup: { id: string } | null;
}

export function useUserGames({ user, userProfile, activeGroup }: UseUserGamesOptions) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const buildQuery = useCallback((): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [];
    
    if (activeGroup === null) {
      const targetUids = [user?.uid].filter(Boolean) as string[];
      if (userProfile?.isCouple && userProfile.partnerId) {
        targetUids.push(userProfile.partnerId);
      }
      constraints.push(where("userId", "in", targetUids));
    } else {
      constraints.push(where("groupIds", "array-contains", activeGroup.id));
    }
    
    return constraints;
  }, [user, userProfile, activeGroup]);

  useEffect(() => {
    if (!user) {
      setGames([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const constraints = buildQuery();
    const q = query(collection(db, "userGames"), ...constraints);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetchedGames = snap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Game));
        setGames(fetchedGames);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load user games:", err);
        setError(err);
        setGames([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, buildQuery]);

  return { games, loading, error };
}