"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { CalendarDays, MapPin, Users, CheckCircle2, XCircle, Plus, X, Loader2, Trophy, Clock, Search, PartyPopper, Link as LinkIcon } from "lucide-react";
import toast from "react-hot-toast";

export function GameNightsTab({ userGames }: { userGames: any[] }) {
  const { user, userNickname, userProfile } = useAuthGroup();
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendsList, setFriendsList] = useState<{uid: string, nickname: string}[]>([]);
  
  // Create Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "", location: "" });
  const [selectedGames, setSelectedGames] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchGame, setSearchGame] = useState("");

  useEffect(() => {
    if (!user || !userProfile) return;
    const fetchFriends = async () => {
      const uidsToFetch = userProfile.friendsList || [];
      if (userProfile.isCouple && userProfile.partnerId) uidsToFetch.push(userProfile.partnerId);

      if (uidsToFetch.length > 0) {
        const q = query(collection(db, "users"), where("uid", "in", uidsToFetch));
        const snap = await getDocs(q);
        setFriendsList(snap.docs.map(d => ({ uid: d.data().uid, nickname: d.data().nickname })));
      }
    };
    fetchFriends();
  }, [user, userProfile]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "gameNights"), where("participants", "array-contains", user.uid));
    
    const unsub = onSnapshot(q, (snap) => {
      const fetchedEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedEvents.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(fetchedEvents);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const toggleGameSelection = (game: any) => {
    if (selectedGames.some(g => g.id === game.id)) {
      setSelectedGames(selectedGames.filter(g => g.id !== game.id));
    } else {
      if (selectedGames.length >= 10) return toast.error("You can only propose up to 10 games.");
      setSelectedGames([...selectedGames, game]);
    }
  };

  const toggleFriendSelection = (uid: string) => {
    if (selectedFriends.includes(uid)) setSelectedFriends(selectedFriends.filter(id => id !== uid));
    else setSelectedFriends([...selectedFriends, uid]);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedGames.length === 0) return toast.error("Please propose at least 1 game!");
    
    const eventId = doc(collection(db, "gameNights")).id;
    const participants = [user.uid, ...selectedFriends];
    
    try {
      await setDoc(doc(db, "gameNights", eventId), {
        title: newEvent.title || "Game Night",
        date: newEvent.date,
        time: newEvent.time || "",
        location: newEvent.location || "",
        hostId: user.uid,
        hostName: userNickname,
        participants,
        proposedGames: selectedGames.map(g => ({ id: g.id, name: g.name, image: g.image, maxPlayers: g.maxPlayers })),
        rsvps: { [user.uid]: "yes" },
        votes: {}, // uid -> gameId[] (Array for multi-voting)
        createdAt: serverTimestamp()
      });
      toast.success("Game night created! Share the link for guests.");
      setIsCreating(false);
      setNewEvent({ title: "", date: "", time: "", location: "" });
      setSelectedGames([]);
      setSelectedFriends([]);
    } catch (err) { toast.error("Failed to create event."); }
  };

  const handleRSVP = async (eventId: string, status: "yes" | "no") => {
    if (!user) return;
    try {
      const eventRef = doc(db, "gameNights", eventId);
      await updateDoc(eventRef, { [`rsvps.${user.uid}`]: status });
      toast.success(status === "yes" ? "You're in! Vote for up to 5 games below." : "RSVP updated.");
    } catch (err) { toast.error("Failed to update RSVP."); }
  };

  const handleVote = async (eventId: string, gameId: string) => {
    if (!user) return;
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) return;

    let currentVotes = targetEvent.votes[user.uid] || [];
    if (!Array.isArray(currentVotes)) currentVotes = [currentVotes]; 

    let newVotes;
    if (currentVotes.includes(gameId)) {
      newVotes = currentVotes.filter((id: string) => id !== gameId); 
    } else {
      if (currentVotes.length >= 5) return toast.error("You can only vote for up to 5 games.");
      newVotes = [...currentVotes, gameId]; 
    }

    try {
      await updateDoc(doc(db, "gameNights", eventId), { [`votes.${user.uid}`]: newVotes });
    } catch (err) { toast.error("Failed to submit vote."); }
  };

  const handleCopyLink = (eventId: string) => {
    const url = `${window.location.origin}/invite/${eventId}`;
    navigator.clipboard.writeText(url);
    toast.success("Guest link copied! Send it in your group chat.");
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Cancel this game night for everyone?")) return;
    try { await deleteDoc(doc(db, "gameNights", eventId)); toast.success("Event canceled."); } 
    catch (err) { toast.error("Failed to cancel event."); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  const filteredLibrary = userGames.filter(g => g.name.toLowerCase().includes(searchGame.toLowerCase()));

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 px-1 sm:px-0">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PartyPopper className="text-indigo-600 dark:text-indigo-400" size={22} /> Game Night Hub
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-0.5">Plan sessions, collect RSVPs, and multi-vote on what hits the table.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2">
          <Plus size={18} /> Host Game Night
        </button>
      </div>

      {/* CREATE MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">Plan a Session</h3>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition"><X size={20}/></button>
            </div>
            
            <form id="create-event-form" onSubmit={handleCreateEvent} className="p-5 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase">Event Title</label>
                  <input required type="text" placeholder="e.g. Friday Night Dice" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase">Date</label>
                  <input required type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase">Time & Location (Optional)</label>
                  <input type="text" placeholder="7:00 PM @ My Place" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase flex justify-between">
                  <span>Propose Games ({selectedGames.length}/10)</span>
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search your library..." value={searchGame} onChange={e => setSearchGame(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white outline-none focus:ring-2 focus:ring-indigo-600 mb-2" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {filteredLibrary.slice(0, 15).map(game => {
                    const isSelected = selectedGames.some(g => g.id === game.id);
                    return (
                      <button type="button" key={game.id} onClick={() => toggleGameSelection(game)} className={`shrink-0 w-24 h-24 rounded-xl border-2 overflow-hidden relative group transition-all ${isSelected ? "border-indigo-600 shadow-md scale-95 ring-2 ring-indigo-500/20" : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"}`}>
                        {game.image ? <img src={`/api/media?url=${encodeURIComponent(game.image)}`} alt={game.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 p-2 text-center">{game.name}</div>}
                        {isSelected && <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center"><CheckCircle2 className="text-white drop-shadow-md" size={24} /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
            <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2 shrink-0">
              <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition">Cancel</button>
              <button form="create-event-form" type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition">Create Event</button>
            </div>
          </div>
        </div>
      )}

      {/* EVENTS FEED */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <CalendarDays size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-slate-500 dark:text-slate-400 font-bold">No upcoming game nights.</h3>
          </div>
        ) : events.map(event => {
          const isHost = event.hostId === user?.uid;
          const myRSVP = event.rsvps[user?.uid || ""];
          let myVotes = event.votes[user?.uid || ""] || [];
          if (!Array.isArray(myVotes)) myVotes = [myVotes];
          
          // Calculate Votes 
          const voteTallies: Record<string, number> = {};
          Object.values(event.votes).forEach((voteData: any) => {
            if (Array.isArray(voteData)) voteData.forEach(gId => voteTallies[gId] = (voteTallies[gId] || 0) + 1);
            else if (typeof voteData === 'string') voteTallies[voteData] = (voteTallies[voteData] || 0) + 1;
          });
          const highestVotes = Math.max(0, ...Object.values(voteTallies) as number[]);

          // Tally RSVPs and collect Display Names of attendees
          const goingIds = Object.keys(event.rsvps).filter(id => event.rsvps[id] === "yes");
          const guestsGoingCount = goingIds.length;
          
          const goingNames = goingIds.map(id => {
            if (id === user?.uid) return "You";
            if (id === event.hostId) return event.hostName;
            if (id.startsWith("Guest_")) return id.replace("Guest_", "");
            const friend = friendsList.find(f => f.uid === id);
            if (friend) return friend.nickname;
            return "Friend";
          });

          return (
            <div key={event.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col md:flex-row">
              
              {/* Event Info Panel */}
              <div className="p-5 md:w-1/3 bg-slate-50 dark:bg-slate-900/40 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">
                      {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    {isHost && <button onClick={() => handleDeleteEvent(event.id)} className="text-slate-400 hover:text-red-500 transition" title="Cancel Event"><X size={16}/></button>}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{event.title}</h3>
                  
                  {/* ATTENDEE LIST RENDERING */}
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1.5"><Users size={14}/> {guestsGoingCount} players going</p>
                    {goingNames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {goingNames.map((name, i) => (
                          <span key={i} className="text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full shadow-xs">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {(event.time || event.location) && (
                    <div className="space-y-1">
                      {event.time && <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5"><Clock size={12}/> {event.time}</p>}
                      {event.location && <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5"><MapPin size={12}/> {event.location}</p>}
                    </div>
                  )}
                  
                  <button onClick={() => handleCopyLink(event.id)} className="mt-4 w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5">
                    <LinkIcon size={14} /> Copy Guest Link
                  </button>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Your RSVP</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleRSVP(event.id, "yes")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${myRSVP === "yes" ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400 ring-2 ring-emerald-500/20" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-emerald-400"}`}>
                      <CheckCircle2 size={16} /> I'm In
                    </button>
                    <button onClick={() => handleRSVP(event.id, "no")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${myRSVP === "no" ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/40 dark:border-red-800 dark:text-red-400 ring-2 ring-red-500/20" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-400"}`}>
                      <XCircle size={16} /> Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Voting Panel */}
              <div className="p-5 flex-1 bg-white dark:bg-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 flex justify-between">
                  <span>Vote for up to 5 games</span>
                  <span>{myVotes.length}/5 Votes</span>
                </span>
                
                {myRSVP !== "yes" ? (
                  <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-sm font-medium">
                    RSVP "I'm In" to unlock voting!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {event.proposedGames.map((game: any) => {
                      const votes = voteTallies[game.id] || 0;
                      const isWinning = votes > 0 && votes === highestVotes;
                      const hasMyVote = myVotes.includes(game.id);

                      return (
                        <div key={game.id} onClick={() => handleVote(event.id, game.id)} className={`p-2 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${hasMyVote ? "bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700 ring-1 ring-indigo-500" : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300"}`}>
                          <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 relative">
                            {game.image ? <img src={`/api/media?url=${encodeURIComponent(game.image)}`} className="w-full h-full object-cover" alt={game.name}/> : <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400 p-1">{game.name}</div>}
                            {isWinning && <div className="absolute top-0 right-0 bg-amber-400 text-white p-0.5 rounded-bl-lg shadow-sm"><Trophy size={10} /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{game.name}</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users size={10}/> Up to {game.maxPlayers} players</p>
                          </div>
                          <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${hasMyVote ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                            {votes}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}