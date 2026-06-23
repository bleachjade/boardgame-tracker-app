"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CalendarDays, MapPin, Users, CheckCircle2, XCircle, Trophy, Clock, PartyPopper } from "lucide-react";
import toast from "react-hot-toast";

export default function GuestInvitePage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    // Check if they already entered their name previously on this device
    const savedName = localStorage.getItem(`guest_name_${eventId}`);
    if (savedName) {
      setGuestName(savedName);
      setIsJoined(true);
    }

    const unsub = onSnapshot(doc(db, "gameNights", eventId), (docSnap) => {
      if (docSnap.exists()) {
        setEvent({ id: docSnap.id, ...docSnap.data() });
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [eventId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    const formattedName = `Guest_${guestName.trim()}`;
    localStorage.setItem(`guest_name_${eventId}`, formattedName);
    setGuestName(formattedName);
    setIsJoined(true);
    toast.success("Joined! Please RSVP below.");
  };

  const handleRSVP = async (status: "yes" | "no") => {
    try {
      await updateDoc(doc(db, "gameNights", eventId), { [`rsvps.${guestName}`]: status });
      toast.success(status === "yes" ? "You're in! Cast your votes." : "RSVP updated.");
    } catch (err) { toast.error("Failed to update RSVP."); }
  };

  const handleVote = async (gameId: string) => {
    let currentVotes = event.votes[guestName] || [];
    if (!Array.isArray(currentVotes)) currentVotes = [currentVotes];

    let newVotes;
    if (currentVotes.includes(gameId)) {
      newVotes = currentVotes.filter((id: string) => id !== gameId);
    } else {
      if (currentVotes.length >= 5) return toast.error("You can only vote for up to 5 games.");
      newVotes = [...currentVotes, gameId];
    }

    try {
      await updateDoc(doc(db, "gameNights", eventId), { [`votes.${guestName}`]: newVotes });
    } catch (err) { toast.error("Failed to cast vote."); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600"><PartyPopper className="animate-bounce" size={40} /></div>;
  if (error || !event) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-center font-bold text-slate-500">Event not found or canceled.</div></div>;

  const myRSVP = event.rsvps[guestName] || null;
  let myVotes = event.votes[guestName] || [];
  if (!Array.isArray(myVotes)) myVotes = [myVotes];

  const voteTallies: Record<string, number> = {};
  Object.values(event.votes).forEach((voteData: any) => {
    if (Array.isArray(voteData)) voteData.forEach(gId => voteTallies[gId] = (voteTallies[gId] || 0) + 1);
    else if (typeof voteData === 'string') voteTallies[voteData] = (voteTallies[voteData] || 0) + 1;
  });
  const highestVotes = Math.max(0, ...Object.values(voteTallies) as number[]);
  const guestsGoingCount = Object.values(event.rsvps).filter(r => r === "yes").length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex justify-center items-start pt-10">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-indigo-600 p-6 text-white text-center">
          <PartyPopper size={32} className="mx-auto mb-2 opacity-80" />
          <h1 className="text-2xl font-black">{event.title}</h1>
          <p className="text-indigo-200 text-sm font-medium mt-1">Hosted by {event.hostName}</p>
        </div>

        {/* Details */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-slate-700 font-bold">
            <CalendarDays className="text-indigo-500 shrink-0" size={20} />
            {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {event.time && (
            <div className="flex items-center gap-3 text-slate-700 font-bold">
              <Clock className="text-indigo-500 shrink-0" size={20} /> {event.time}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-3 text-slate-700 font-bold">
              <MapPin className="text-indigo-500 shrink-0" size={20} /> {event.location}
            </div>
          )}
          <div className="flex items-center gap-3 text-slate-700 font-bold mt-2 pt-3 border-t border-slate-200">
            <Users className="text-indigo-500 shrink-0" size={20} /> {guestsGoingCount} players going
          </div>
        </div>

        {/* Action Area */}
        {!isJoined ? (
          <form onSubmit={handleJoin} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase">What's your name?</label>
              <input required type="text" placeholder="Enter your name to RSVP" value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-600" />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl shadow-md">Join Event</button>
          </form>
        ) : (
          <div className="p-6 space-y-6">
            
            {/* Guest RSVP */}
            <div>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Your RSVP</span>
              <div className="flex gap-2">
                <button onClick={() => handleRSVP("yes")} className={`flex-1 py-3 rounded-xl text-sm font-black border transition flex items-center justify-center gap-2 ${myRSVP === "yes" ? "bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20" : "bg-white border-slate-200 text-slate-500 hover:border-emerald-400"}`}>
                  <CheckCircle2 size={18} /> I'm In
                </button>
                <button onClick={() => handleRSVP("no")} className={`flex-1 py-3 rounded-xl text-sm font-black border transition flex items-center justify-center gap-2 ${myRSVP === "no" ? "bg-red-50 border-red-300 text-red-700 ring-2 ring-red-500/20" : "bg-white border-slate-200 text-slate-500 hover:border-red-400"}`}>
                  <XCircle size={18} /> Out
                </button>
              </div>
            </div>

            {/* Guest Voting */}
            <div>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-3 flex justify-between">
                <span>Vote for up to 5 games</span>
                <span>{myVotes.length}/5</span>
              </span>
              
              {myRSVP !== "yes" ? (
                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium">
                  RSVP "I'm In" to unlock voting!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {event.proposedGames.map((game: any) => {
                    const votes = voteTallies[game.id] || 0;
                    const isWinning = votes > 0 && votes === highestVotes;
                    const hasMyVote = myVotes.includes(game.id);

                    return (
                      <div key={game.id} onClick={() => handleVote(game.id)} className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${hasMyVote ? "bg-indigo-50 border-indigo-400 shadow-sm" : "bg-white border-slate-200 hover:border-indigo-300"}`}>
                        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-200 relative">
                          {game.image ? <img src={`/api/media?url=${encodeURIComponent(game.image)}`} className="w-full h-full object-cover" alt={game.name}/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 p-1">{game.name}</div>}
                          {isWinning && <div className="absolute top-0 right-0 bg-amber-400 text-white p-0.5 rounded-bl-lg shadow-sm"><Trophy size={12} /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-slate-900 truncate">{game.name}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Users size={12}/> Up to {game.maxPlayers} players</p>
                        </div>
                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${hasMyVote ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                          {votes}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}