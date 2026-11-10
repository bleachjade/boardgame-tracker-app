"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useModalClose } from "@/lib/useModalClose";
import { encodeProfileQr } from "@/lib/profileQr";
import { QrCode, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type ProfileQrProfile = { uid: string; nickname?: string; email?: string };

export function ProfileQrModal({ profile, onClose }: { profile: ProfileQrProfile; onClose: () => void }) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { overlayProps, panelProps } = useModalClose(onClose, { backdrop: true });

  const payload = encodeProfileQr(profile);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 360,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [payload]);

  return (
    <div {...overlayProps} className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div {...panelProps} className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode size={18} className="text-indigo-600 dark:text-indigo-400" /> {t("friends.qrTitle")}
          </h2>
          <button onClick={onClose}><X size={20} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" /></button>
        </div>

        <div className="p-5 space-y-4 text-center">
          <p className="text-xs font-medium text-slate-400">{t("friends.qrDesc")}</p>

          <div className="inline-flex bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            {dataUrl ? (
              <img src={dataUrl} alt="Profile QR code" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="font-black text-slate-900 dark:text-white truncate">{profile.nickname}</p>
            {profile.email && <p className="text-xs font-medium text-slate-400 truncate">{profile.email}</p>}
          </div>

          {failed && <p className="text-xs font-bold text-red-500">{t("friends.qrFail")}</p>}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition">{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
