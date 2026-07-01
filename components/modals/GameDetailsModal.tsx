import { useState, useEffect } from "react";
import Image from "next/image";
// Removed orderBy from imports as we won't need it
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Info, X, Loader2, Bot, Send, Layers, History, Calendar, Trophy, PiggyBank, Edit3, Check, Languages, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function GameDetailsModal({ game, onClose }: { game: any; onClose: () => void }) {
  const { t } = useTranslation();

  const [liveData, setLiveData] = useState<any>(game);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  // ROI Tracker State
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [price, setPrice] = useState(game.pricePaid ? String(game.pricePaid) : "");

  // THAI DESCRIPTION WORKAROUND STATE
  const [isEditingThaiDesc, setIsEditingThaiDesc] = useState(false);
  const [thaiDescInput, setThaiDescInput] = useState(game.description_th || "");
  const [useThai, setUseThai] = useState(!!game.description_th);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai", text: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    async function fetchFullDetails() {
      try {
        const res = await fetch(`/api/bgg?ids=${game.bggId}`);
        const data = await res.json();
        if (data && data.length > 0) {
          setLiveData({ ...game, ...data[0] });
        }
      } catch (err) { } finally { setLoading(false); }
    }
    fetchFullDetails();
  }, [game]);

  useEffect(() => {
    // FIX: Removed orderBy() to prevent Firebase Composite Index errors on fresh loads!
    const q = query(collection(db, "gamePlays"), where("bggId", "==", game.bggId));
    
    const unsub = onSnapshot(q, (snap) => {
      const fetchedHistory = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort client-side instead of relying on the Firestore server
      fetchedHistory.sort((a: any, b: any) => (b.playedAt?.seconds || 0) - (a.playedAt?.seconds || 0));
      
      setHistory(fetchedHistory);
    });
    
    return () => unsub();
  }, [game.bggId]);

  const handleSavePrice = async () => {
    try {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice)) return;
      await updateDoc(doc(db, "userGames", game.id), { pricePaid: numPrice });
      setLiveData((prev: any) => ({ ...prev, pricePaid: numPrice }));
      setIsEditingPrice(false);
      toast.success("Cost updated!");
    } catch (err) { toast.error("Failed to update price."); }
  };

  const handleSaveThaiDesc = async () => {
    try {
      await updateDoc(doc(db, "userGames", game.id), { description_th: thaiDescInput.trim() });
      setLiveData((prev: any) => ({ ...prev, description_th: thaiDescInput.trim() }));
      setIsEditingThaiDesc(false);
      if (thaiDescInput.trim()) setUseThai(true);
      toast.success("Thai translation updated!");
    } catch (err) { toast.error("Failed to save translation."); }
  };

  const handleAskGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newHistory = [...chatHistory, { role: "user" as const, text: chatInput }];
    setChatHistory(newHistory);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/rule-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameName: liveData.name, question: chatInput })
      });

      const data = await res.json();
      if (data.answer) {
        setChatHistory([...newHistory, { role: "ai", text: data.answer }]);
      } else {
        throw new Error("No answer");
      }
    } catch (err) {
      setChatHistory([...newHistory, { role: "ai", text: "ขออภัยครับ ระบบ AI เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const timeDisplay = liveData.minPlayTime !== liveData.maxPlayTime ? `${liveData.minPlayTime}–${liveData.maxPlayTime}` : liveData.playTime;
  const slugifiedName = liveData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const playsCount = history.length;
  const costPerPlay = liveData.pricePaid ? (liveData.pricePaid / Math.max(playsCount, 1)).toFixed(2) : "0.00";

  const createMarkup = (html: string) => {
    if (!html) return { __html: "No description provided." };
    const clean = html.replace(/&#10;/g, '<br/>').replace(/&mdash;/g, '—').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&rsquo;/g, "'");
    return { __html: clean };
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <h2 className="font-black text-slate-900 dark:text-white text-xl flex items-center gap-2"><Info className="text-indigo-600 dark:text-indigo-400" /> {t('gameDetails.title')}</h2>
          <button onClick={onClose}><X size={24} className="text-slate-500 hover:text-slate-900 dark:hover:text-white" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-56 h-56 md:h-auto rounded-xl overflow-hidden shadow-md shrink-0 relative bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              {liveData.image ? <Image src={liveData.image} alt={liveData.name} fill className="object-cover" unoptimized /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{t('gameDetails.noImage')}</div>}
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1 leading-tight">
                  {liveData.name} <span className="text-slate-400 font-medium text-2xl">({liveData.year || 'N/A'})</span>
                </h3>

                <div className="mt-3 min-h-[28px] flex flex-wrap gap-1.5">
                  {!loading && liveData.mechanics && liveData.mechanics.length > 0 && (
                    liveData.mechanics.map((m: string) => (
                      <span
                        key={m}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-bold border border-slate-200 dark:border-slate-600"
                      >
                        {m}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-[#0f1115] text-white rounded-xl p-4 md:p-5 grid grid-cols-2 divide-x divide-slate-800 border border-slate-800 shadow-inner w-full">
                <div className="flex flex-col justify-center pr-4">
                  <span className="text-lg md:text-xl font-black">{liveData.minPlayers}–{liveData.maxPlayers} {t('gameDetails.players')}</span>
                  <span className="text-xs text-slate-400 font-medium border-b border-dotted border-slate-600 inline-block w-fit pb-[2px] mt-1">{t('gameDetails.community')}: {liveData.minPlayers}–{liveData.maxPlayers} — {t('gameDetails.best')}: {loading ? '...' : liveData.bestPlayers || '?'}</span>
                </div>
                <div className="flex flex-col justify-center pl-4 md:px-4">
                  <span className="text-lg md:text-xl font-black">{timeDisplay} {t('gameDetails.min')}</span>
                  <span className="text-xs text-slate-400 font-medium mt-1">{t('gameDetails.playingTime')}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a href={`https://boardgamegeek.com/boardgame/${game.bggId}/${slugifiedName}/sleeves`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-lg border border-indigo-200 dark:border-indigo-800 transition">
                  <Layers size={16} /> {t('gameDetails.sleeveGuide')}
                </a>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-sm rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <PiggyBank size={16} />
                  {isEditingPrice ? (
                    <div className="flex items-center gap-1">
                      ฿<input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-16 bg-transparent border-b border-emerald-300 dark:border-emerald-700 outline-none px-1" autoFocus />
                      <button onClick={handleSavePrice} className="hover:text-emerald-900 dark:hover:text-white p-1"><Check size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setIsEditingPrice(true)}>
                      {liveData.pricePaid ? (
                        <span>{t('gameDetails.roi')}: <strong className="text-emerald-900 dark:text-emerald-200">฿{costPerPlay}</strong> {t('gameDetails.perPlay')}</span>
                      ) : (
                        <span>{t('gameDetails.setCost')}</span>
                      )}
                      <Edit3 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('gameDetails.pubDesc')}</h4>

                {liveData.description_th && (
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg text-xs font-bold shadow-inner">
                    <button onClick={() => setUseThai(false)} className={`px-2 py-1 rounded-md transition-colors ${!useThai ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-400"}`}>EN</button>
                    <button onClick={() => setUseThai(true)} className={`px-2 py-1 rounded-md transition-colors ${useThai ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-400"}`}>TH</button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold py-4"><Loader2 size={20} className="animate-spin" /> {t('gameDetails.fetching')}</div>
              ) : isEditingThaiDesc ? (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-4 border rounded-xl border-slate-200 dark:border-slate-700">
                  <textarea
                    value={thaiDescInput}
                    onChange={e => setThaiDescInput(e.target.value)}
                    placeholder={t('gameDetails.thaiPlaceholder')}
                    rows={6}
                    className="w-full text-sm font-medium bg-transparent border-none focus:ring-0 text-slate-800 dark:text-white resize-none outline-none"
                  />
                  <div className="flex justify-end gap-2 border-t pt-2 dark:border-slate-700">
                    <button onClick={() => setIsEditingThaiDesc(false)} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">{t('common.cancel')}</button>
                    <button onClick={handleSaveThaiDesc} className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg flex items-center gap-1 shadow-sm hover:bg-indigo-700"><Check size={12} /> {t('gameDetails.saveTrans')}</button>
                  </div>
                </div>
              ) : (
                <div className="relative group/desc">
                  <button onClick={() => setIsEditingThaiDesc(true)} className="absolute -top-1 right-0 p-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-900/50 text-slate-500 hover:text-indigo-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-600 opacity-0 group-hover/desc:opacity-100 transition-all flex items-center gap-1 text-xs font-bold z-10">
                    <Languages size={14} /> {liveData.description_th ? t('gameDetails.editTrans') : t('gameDetails.addThai')}
                  </button>

                  {useThai && liveData.description_th ? (
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-line bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                      {liveData.description_th}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={createMarkup(liveData.description)} />
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><History size={16} /> {t('gameDetails.matchHistory', { count: history.length })}</h4>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium text-sm">{t('gameDetails.noHistory')}</div>
                ) : (
                  history.map((record) => {
                    const maxScore = Math.max(...record.players.map((p: any) => Number(p.score || 0)));
                    const sortedPlayers = [...record.players].sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0));
                    return (
                      <div key={record.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-bold border-b dark:border-slate-700 pb-2 border-slate-100">
                          <span className="flex items-center gap-1"><Calendar size={14} /> {record.playedAt?.toDate() ? new Date(record.playedAt.toDate()).toLocaleDateString() : t('gameDetails.justNow')}</span>
                          <span>{t('gameDetails.loggedBy', { name: record.loggedBy || "Friend" })}</span>
                        </div>
                        <div className="space-y-1.5">
                          {sortedPlayers.map((p: any, pIdx: number) => (
                            <div key={pIdx} className="flex justify-between items-center text-sm font-semibold">
                              <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">{Number(p.score) === maxScore && maxScore > 0 && <Trophy className="text-amber-500 shrink-0" size={14} />} {p.name}</span>
                              <div className="text-right">
                                <span className="font-black text-slate-900 dark:text-white">{p.score} {t('gameDetails.pts')}</span>
                                {p.rawExpression && p.rawExpression !== String(p.score) && <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal">({p.rawExpression})</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-500" />
              {t('gameDetails.rulesAndVideos')}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-400 transition shadow-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                    {t('gameDetails.englishGuide')}
                  </span>
                  <h5 className="font-bold text-base text-slate-900 dark:text-white mt-2">
                    {t('gameDetails.bggVideoHub')}
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('gameDetails.bggVideoDesc')}
                  </p>
                </div>
                <a
                  href={`https://boardgamegeek.com/boardgame/${game.bggId}/${slugifiedName}/videos/all`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-600 text-center transition block shadow-2xs"
                >
                  {t('gameDetails.openBggVideos')}
                </a>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-rose-400 transition shadow-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-md">
                    {t('gameDetails.thaiGuide')}
                  </span>
                  <h5 className="font-bold text-base text-slate-900 dark:text-white mt-2">
                    {t('gameDetails.youtubeSearch')}
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('gameDetails.youtubeDesc')}
                  </p>
                </div>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.name + " วิธีเล่น")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-600 text-center transition block shadow-2xs"
                >
                  {t('gameDetails.openYoutube')}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm border ${isChatOpen ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gradient-to-r from-indigo-50 dark:from-indigo-900/30 to-purple-50 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:shadow-md'}`}
            >
              <Bot size={18} /> {isChatOpen ? "Close AI Guru" : "💬 ถามกติกา AI (Ask Rule Guru)"}
            </button>

            {isChatOpen && (
              <div className="mt-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl overflow-hidden shadow-inner flex flex-col h-80 animate-in slide-in-from-top-2 duration-200">
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                      <Bot size={32} className="text-indigo-500 mb-2" />
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">AI ผู้ช่วยกติกาสำหรับ {liveData.name}</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">พิมพ์คำถามที่คุณสงสัยได้เลย เช่น "เซ็ตอัปเกมเล่น 3 คนยังไง?"</p>
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-sm shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200 dark:border-slate-700"}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm flex items-center gap-2 text-indigo-500">
                        <Loader2 size={16} className="animate-spin" /> <span className="text-xs font-bold">กำลังค้นหากฎ...</span>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleAskGuru} className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                  <input
                    type="text"
                    placeholder="พิมพ์คำถามกติกาที่นี่..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                  <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white p-2 rounded-lg transition shadow-sm">
                    <Send size={18} />
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}