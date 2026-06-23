"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Trophy, BarChart3, Loader2, PiggyBank, ArrowUpRight, ArrowDownRight, TrendingUp, Camera, MoveRight, Layers, Maximize, Check } from "lucide-react";
import toast from "react-hot-toast";

export function AnalyticsTab() {
  const { user } = useAuthGroup();
  const [plays, setPlays] = useState<any[]>([]);
  const [libraryGames, setLibraryGames] = useState<any[]>([]);
  const [loadingPlays, setLoadingPlays] = useState(true);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  // Custom Camera / Spatial Canvas State
  const [shelfImage, setShelfImage] = useState<string | null>(null);
  const [canvasStep, setCanvasStep] = useState<"upload" | "scale" | "bounds" | "result">("upload");
  const [realWidthCm, setRealWidthCm] = useState<number>(0);
  const [realHeightCm, setRealHeightCm] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Point mapping vectors
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "gamePlays"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setPlays(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingPlays(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "userGames"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setLibraryGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingLibrary(false);
    });
    return () => unsub();
  }, [user]);

  // Redraw canvas context whenever steps or calibration coordinates shift
  useEffect(() => {
    if (!shelfImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width > 600 ? 600 : img.width;
      canvas.height = img.height * (canvas.width / img.width);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Render calibration overlay strings
      ctx.lineWidth = 3;
      if (canvasStep === "scale") {
        ctx.strokeStyle = "#indigo";
        ctx.fillStyle = "#indigo";
        if (points.length === 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.stroke();
        }
      } else if (canvasStep === "bounds") {
        ctx.strokeStyle = "#emerald";
        if (points.length === 2) {
          const w = points[1].x - points[0].x;
          const h = points[1].y - points[0].y;
          ctx.strokeRect(points[0].x, points[0].y, w, h);
        }
      }
    };
    img.src = shelfImage;
  }, [shelfImage, canvasStep, points]);

  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setShelfImage(event.target?.result as string);
      setCanvasStep("scale");
      setPoints([]);
      toast.success("Shelf snapshot loaded! Tap 2 points across a standard Credit Card width.");
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasTouch = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasStep === "result") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (points.length >= 2) {
      setPoints([{ x, y }]);
    } else {
      const updated = [...points, { x, y }];
      setPoints(updated);

      if (updated.length === 2) {
        if (canvasStep === "scale") {
          // Calibration formula: standard card width is exactly 8.5 cm
          const pixelDistance = Math.sqrt(Math.pow(updated[1].x - updated[0].x, 2) + Math.pow(updated[1].y - updated[0].y, 2));
          (canvas as any).pxRatio = 8.5 / Math.max(pixelDistance, 1);
          toast.success("Scale set! Now drag/tap a rectangle box bounding your empty shelf gap area.");
          setCanvasStep("bounds");
          setPoints([]);
        } else if (canvasStep === "bounds") {
          const ratio = (canvas as any).pxRatio || 0.15;
          const deltaX = Math.abs(updated[1].x - updated[0].x);
          const deltaY = Math.abs(updated[1].y - updated[0].y);
          
          setRealWidthCm(Math.round(deltaX * ratio));
          setRealHeightCm(Math.round(deltaY * ratio));
          setCanvasStep("result");
        }
      }
    }
  };

  if (loadingPlays || loadingLibrary) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32}/>
      </div>
    );
  }

  // --- PACKING RECOMMENDER MATRIX USING PROXIED CANVAS PARAMETERS ---
  const optimizedStackPlan: any[] = [];
  let currentWidthUsed = 0;
  let layerHeightMax = 0;

  if (canvasStep === "result") {
    libraryGames.forEach((game) => {
      const weight = parseFloat(game.weight || "2.0");
      // Determine volumetric sizes in real metric width/height arrays
      let boxW = 30; // standard box dimension mapping vectors
      let boxH = 7;
      
      if (weight >= 3.4) { boxW = 31; boxH = 14; }
      else if (weight <= 1.6) { boxW = 12; boxH = 4; }

      if (currentWidthUsed + boxW <= realWidthCm) {
        optimizedStackPlan.push({ name: game.name, action: "Place Flat in Row layer", width: boxW, height: boxH });
        currentWidthUsed += boxW;
        if (boxH > layerHeightMax) layerHeightMax = boxH;
      } else if (layerHeightMax + boxH <= realHeightCm) {
        // Wrap layer to top vertical index step
        currentWidthUsed = boxW;
        optimizedStackPlan.push({ name: game.name, action: "Stack securely on second tier", width: boxW, height: boxH });
      }
    });
  }

  // --- CORE STATS CALCULATIONS ---
  const playerWins: Record<string, number> = {};
  const gameHighScores: Record<string, { player: string; score: number }> = {};
  const gamePlayCounts: Record<string, number> = {};

  plays.forEach(play => {
    if (!play.players || play.players.length === 0) return;
    if (play.bggId) gamePlayCounts[play.bggId] = (gamePlayCounts[play.bggId] || 0) + 1;
    const maxScore = Math.max(...play.players.map((p: any) => Number(p.score || 0)));
    const winners = play.players.filter((p: any) => Number(p.score || 0) === maxScore);
    winners.forEach((w: any) => { playerWins[w.name] = (playerWins[w.name] || 0) + 1; });
  });

  const sortedWinners = Object.entries(playerWins).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const itemsWithCost = libraryGames.filter(g => typeof g.pricePaid === "number" && g.pricePaid > 0).map(game => {
    const playCount = gamePlayCounts[game.bggId] || 0;
    return { name: game.name, totalCost: game.pricePaid, playCount, costPerPlay: game.pricePaid / Math.max(playCount, 1) };
  });

  const totalInvestment = libraryGames.reduce((acc, curr) => acc + (Number(curr.pricePaid) || 0), 0);
  const globalAverageCpp = plays.length > 0 ? (totalInvestment / plays.length).toFixed(2) : "0.00";
  const bestRoiChampions = [...itemsWithCost].sort((a, b) => a.costPerPlay - b.costPerPlay).slice(0, 3);
  const worstRoiSitters = [...itemsWithCost].sort((a, b) => b.costPerPlay - a.costPerPlay).slice(0, 3);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 px-1 sm:px-0">
      
      {/* 1. FINANCIAL PORTFOLIO METRIC HEADER TICKERS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <PiggyBank size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block truncate">Library Capitalization</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block truncate">฿{totalInvestment.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <TrendingUp size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block truncate">Net Value / Play</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block truncate">฿{globalAverageCpp}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <BarChart3 size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block truncate">Match Plays</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block truncate">{plays.length} sessions</span>
          </div>
        </div>
      </div>

      {/* --- 📸 CAMERA SNAP & SHAP SPACE OPTIMIZATION ENGINE VIEW --- */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6 space-y-5">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="text-indigo-600 dark:text-indigo-400" size={18} /> Camera Vision Space Analyzer
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-0.5">Take a photo of any empty space or customized shelf slot to analyze your physical packing configuration dynamically.</p>
        </div>

        {canvasStep === "upload" ? (
          <div className="flex justify-center">
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageImport} className="hidden" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-md py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-400 transition bg-slate-50 dark:bg-slate-900/40 flex flex-col items-center justify-center gap-3 font-bold text-sm"
            >
              <Camera size={36} className="text-slate-400 animate-pulse" />
              <span>Snapshot Shelf or Closet Space</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
            
            {/* Visual Interface Canvas Rendering Element Container */}
            <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden cursor-crosshair shadow-sm shrink-0 bg-black">
              <canvas ref={canvasRef} onClick={handleCanvasTouch} className="max-w-full h-auto block" />
              
              {/* Context Action Instruction Pill Badge */}
              <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 text-white text-[11px] font-bold p-2 rounded-lg text-center backdrop-blur-xs border border-slate-700">
                {canvasStep === "scale" && "✨ Step 1: Tap the two width ends of a credit card to calibrate scale context."}
                {canvasStep === "bounds" && "📐 Step 2: Tap the top-left, then bottom-right corner of your empty space."}
                {canvasStep === "result" && "✅ Matrix compiled successfully!"}
              </div>
            </div>

            {/* Matrix Parsing Metric Results Details panel */}
            <div className="flex-1 w-full space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Analyzed Target Dimensions</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Calculated Width</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">{realWidthCm || "--"} cm</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Calculated Height</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">{realHeightCm || "--"} cm</span>
                  </div>
                </div>
                {canvasStep === "result" && (
                  <button onClick={() => { setCanvasStep("upload"); setShelfImage(null); }} className="mt-3 px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded text-xs font-bold text-slate-700 dark:text-slate-200 transition">Reset Camera View</button>
                )}
              </div>

              {/* Stack blueprint lists */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Geometric Storage Blueprint Plan</span>
                {canvasStep !== "result" ? (
                  <div className="text-xs text-slate-400 font-medium p-4 border border-dashed rounded-xl text-center">Calibrate the canvas frame image step markers above to compute placement sequences.</div>
                ) : optimizedStackPlan.length === 0 ? (
                  <div className="text-xs text-amber-500 font-medium p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100">Space constraints are too tight to support your library layout components. Optimize dimensions!</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {optimizedStackPlan.map((step, sIdx) => (
                      <div key={sIdx} className="p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-xs font-bold flex justify-between items-center shadow-xs border-slate-100 dark:border-slate-700">
                        <span className="text-slate-900 dark:text-white truncate max-w-[200px]">{step.name}</span>
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 rounded shrink-0">{step.action} ({step.width}x{step.height}cm)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* 2. ROI PERFORMANCE BREAKDOWN DASHBOARDS */}
      {itemsWithCost.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ArrowDownRight className="text-emerald-500" size={16} /> ROI Champions (Best Value)
            </h3>
            <div className="space-y-2.5">
              {bestRoiChampions.map((item) => (
                <div key={item.name} className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex justify-between items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-sm">{item.name}</span>
                    <span className="text-xs text-slate-400 font-medium">{item.playCount} plays</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block">฿{item.costPerPlay.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">per play</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ArrowUpRight className="text-rose-500" size={16} /> Shelf Sitters (Needs Play)
            </h3>
            <div className="space-y-2.5">
              {worstRoiSitters.map((item) => (
                <div key={item.name} className="p-3 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl flex justify-between items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-sm">{item.name}</span>
                    <span className="text-xs text-slate-400 font-medium truncate block">{item.playCount === 0 ? "Never played" : `${item.playCount} plays`}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm block">฿{item.costPerPlay.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">per play</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. STANDARD COMPETITIVE LEADERBOARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
          <h2 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
            <Trophy className="text-amber-500" size={16} /> Hall of Fame (Wins)
          </h2>
          <div className="space-y-2.5">
            {sortedWinners.map(([name, wins], idx) => (
              <div key={name} className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shrink-0 ${idx === 0 ? "bg-amber-100 text-amber-600" : idx === 1 ? "bg-slate-200 text-slate-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300"}`}>#{idx + 1}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{name}</span>
                </div>
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm shrink-0">{wins} Wins</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}