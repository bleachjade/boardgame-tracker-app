"use client";

import { useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, arrayUnion, where } from "firebase/firestore";
import jsQR from "jsqr";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Loader2, ScanLine, X, CameraOff } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { useModalClose } from "@/lib/useModalClose";
import { parseProfileQr } from "@/lib/profileQr";

export function ScanQrModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuthGroup();
  const { overlayProps, panelProps } = useModalClose(onClose, { backdrop: true });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const [cameraError, setCameraError] = useState(false);
  const [resolving, setResolving] = useState(false);

  const handleCode = async (raw: string) => {
    if (busyRef.current) return;
    const now = Date.now();
    if (raw === lastCodeRef.current.code && now - lastCodeRef.current.at < 3000) return;
    lastCodeRef.current = { code: raw, at: now };

    const target = parseProfileQr(raw);
    if (!target) {
      toast.error(t("friends.invalidCode"));
      return;
    }
    if (!user) return;

    busyRef.current = true;
    setResolving(true);
    try {
      let targetUser: { uid?: string; nickname?: string } | null = null;

      if (target.uid) {
        if (target.uid === user.uid) {
          toast.error(t("friends.addNoSelf"));
          return;
        }
        const snap = await getDoc(doc(db, "users", target.uid));
        if (!snap.exists()) {
          toast.error(t("friends.addNoFind"));
          return;
        }
        targetUser = snap.data();
      } else if (target.email) {
        const snap = await getDocs(query(collection(db, "users"), where("email", "==", target.email)));
        if (snap.empty) {
          toast.error(t("friends.addNoFind"));
          return;
        }
        targetUser = snap.docs[0].data();
        if (targetUser.uid === user.uid) {
          toast.error(t("friends.addNoSelf"));
          return;
        }
      } else {
        toast.error(t("friends.invalidCode"));
        return;
      }

      if (!targetUser?.uid) {
        toast.error(t("friends.addNoFind"));
        return;
      }

      const mySnap = await getDoc(doc(db, "users", user.uid));
      const friendsList: string[] = mySnap.data()?.friendsList || [];
      if (friendsList.includes(targetUser.uid)) {
        toast(t("friends.alreadyFollowing", { name: targetUser.nickname }));
        onClose();
        return;
      }

      await updateDoc(doc(db, "users", user.uid), { friendsList: arrayUnion(targetUser.uid) });
      toast.success(t("friends.followed", { name: targetUser.nickname }));
      onClose();
    } catch {
      toast.error(t("friends.addFail"));
    } finally {
      busyRef.current = false;
      setResolving(false);
    }
  };

  const handleCodeRef = useRef(handleCode);
  useEffect(() => {
    handleCodeRef.current = handleCode;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId = 0;
    let stopped = false;

    const detect = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const image = ctx.getImageData(0, 0, width, height);
          const code = jsQR(image.data, width, height, { inversionAttempts: "attemptBoth" });
          if (code && code.data && !busyRef.current) {
            void handleCodeRef.current(code.data);
          }
        }
      }
      rafId = requestAnimationFrame(detect);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        rafId = requestAnimationFrame(detect);
      } catch {
        if (!stopped) setCameraError(true);
      }
    };

    void start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div {...overlayProps} className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div {...panelProps} className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ScanLine size={18} className="text-indigo-600 dark:text-indigo-400" /> {t("friends.scanTitle")}
          </h2>
          <button onClick={onClose}><X size={20} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs font-medium text-slate-400 text-center">{t("friends.scanDesc")}</p>

          {cameraError ? (
            <div className="flex flex-col items-center gap-3 py-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center px-4">
              <CameraOff size={32} className="text-slate-400" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("friends.cameraError")}</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-square">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-8 border-2 border-white/70 rounded-2xl pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]" />
              <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 backdrop-blur-sm px-4 py-2.5 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                <span className="text-xs font-bold text-white">{t("friends.scanning")}</span>
              </div>
              {resolving && (
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 size={32} className="animate-spin text-indigo-400" />
                  <span className="text-sm font-bold text-white">{t("friends.resolving")}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition">{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
