"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function usePlayCounts(user: { uid: string } | null, userProfile: { isCouple?: boolean; partnerId?: string | null } | null) {
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const buildQuery = useCallback((): QueryConstraint[] => {
    const targetUids = [user?.uid].filter(Boolean) as string[];
    if (userProfile?.isCouple && userProfile.partnerId) {
      targetUids.push(userProfile.partnerId);
    }
    return [where("userId", "in", targetUids)];
  }, [user, userProfile]);

  useEffect(() => {
    if (!user) {
      setPlayCounts({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const constraints = buildQuery();
    const q = query(collection(db, "gamePlays"), ...constraints);

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach((play) => {
          const bggId = play.data().bggId;
          if (bggId != null) {
            const key = String(bggId);
            counts[key] = (counts[key] || 0) + 1;
          }
        });
        setPlayCounts(counts);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load game play counts:", err);
        setError(err);
        setPlayCounts({});
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, buildQuery]);

  return { playCounts, loading, error };
}