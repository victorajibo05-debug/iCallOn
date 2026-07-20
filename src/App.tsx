import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  VolumeX,
  Plus,
  ArrowRight,
  AlertCircle,
  Gamepad2,
  User,
  Crown,
} from "lucide-react";
import { RoomState } from "./types";
import { sounds } from "./utils/sound";

// Sub-components
import Lobby from "./components/Lobby";
import CallingPhase from "./components/CallingPhase";
import WritingPhase from "./components/WritingPhase";
import ReviewPhase from "./components/ReviewPhase";
import PodiumPhase from "./components/PodiumPhase";

export default function App() {
  // Connection states
  const [roomId, setRoomId] = useState<string | null>(
    localStorage.getItem("callon_roomId")
  );
  const [playerId, setPlayerId] = useState<string | null>(
    localStorage.getItem("callon_playerId")
  );
  const [room, setRoom] = useState<RoomState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Form Inputs
  const [nickname, setNickname] = useState(
    localStorage.getItem("callon_nickname") || ""
  );
  const [joinCode, setJoinCode] = useState("");

  // Error & Settings States
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("callon_soundEnabled");
    return saved === null ? true : saved === "true";
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // Persist sound settings
  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem("callon_soundEnabled", String(nextVal));
    sounds.click();
  };

  // Keep track of state transitions to play custom sounds
  const previousStatusRef = useRef<string | null>(null);
  const previousLetterRef = useRef<string | null>(null);

  useEffect(() => {
    if (!room) return;

    if (soundEnabled) {
      // Transitioned to writing (letter called)
      if (
        room.status === "writing" &&
        (previousStatusRef.current !== "writing" || previousLetterRef.current !== room.currentLetter)
      ) {
        sounds.letterCalled();
      }
      // Transitioned to review
      else if (room.status === "review" && previousStatusRef.current !== "review") {
        sounds.submit();
      }
      // Transitioned to ended
      else if (room.status === "ended" && previousStatusRef.current !== "ended") {
        sounds.victory();
      }
    }

    previousStatusRef.current = room.status;
    previousLetterRef.current = room.currentLetter;
  }, [room?.status, room?.currentLetter, soundEnabled]);

  // Real-time synchronization via Server-Sent Events (SSE)
  useEffect(() => {
    if (!roomId || !playerId) {
      setRoom(null);
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setError(null);

    // Open connection
    const es = new EventSource(
      `/api/rooms/${roomId}/events?playerId=${playerId}`
    );
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const updatedRoom = JSON.parse(event.data);
        setRoom(updatedRoom);
        setIsConnecting(false);
      } catch (err) {
        console.error("Failed to parse SSE data", err);
      }
    };

    es.onerror = () => {
      setError("Disconnected from game room. Attempting to reconnect...");
      setIsConnecting(true);
      // Wait, if it fails, maybe room was deleted or code is invalid
    };

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [roomId, playerId]);

  // Create room handler
  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nickname.trim() === "") {
      setError("Please enter a nickname");
      return;
    }

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nickname }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create room");
      }

      // Save credentials
      localStorage.setItem("callon_nickname", nickname.trim());
      localStorage.setItem("callon_roomId", data.roomId);
      localStorage.setItem("callon_playerId", data.playerId);

      setRoomId(data.roomId);
      setPlayerId(data.playerId);
      if (soundEnabled) sounds.click();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  // Join room handler
  const handleJoinRoom = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nickname.trim() === "") {
      setError("Please enter a nickname");
      return;
    }

    if (joinCode.trim() === "" || joinCode.length !== 5) {
      setError("Please enter a valid 5-letter room code");
      return;
    }

    try {
      const code = joinCode.toUpperCase().trim();
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nickname }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join room");
      }

      // Save credentials
      localStorage.setItem("callon_nickname", nickname.trim());
      localStorage.setItem("callon_roomId", data.roomId);
      localStorage.setItem("callon_playerId", data.playerId);

      setRoomId(data.roomId);
      setPlayerId(data.playerId);
      if (soundEnabled) sounds.click();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  // Leave room / Exit to main menu
  const handleLeaveRoom = () => {
    localStorage.removeItem("callon_roomId");
    localStorage.removeItem("callon_playerId");
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setRoomId(null);
    setPlayerId(null);
    setRoom(null);
    setJoinCode("");
    setError(null);
    if (soundEnabled) sounds.click();
  };

  // Host Action: Start the game from lobby
  const startGame = async () => {
    if (!roomId || !playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      setError(err.message || "Failed to start game");
    }
  };

  // Active Caller Action: Call out a letter
  const callLetter = async (letter: string) => {
    if (!roomId || !playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/call-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, letter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      setError(err.message || "Failed to call letter");
    }
  };

  // Player Action: Submit/save answers during writing phase
  const submitAnswers = async (
    answers: { name: string; animal: string; place: string; thing: string },
    submit: boolean
  ) => {
    if (!roomId || !playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, answers, submit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      console.error("Auto-save failed", err);
    }
  };

  // Player Action: Toggle a veto on another player's answer
  const toggleVeto = async (
    targetPlayerId: string,
    field: "name" | "animal" | "place" | "thing"
  ) => {
    if (!roomId || !playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/veto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, targetPlayerId, field }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      console.error("Failed to toggle veto", err);
    }
  };

  // Host Action: Commit scores and go to next round
  const finalizeReview = async () => {
    if (!roomId || !playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      setError(err.message || "Failed to finalize review");
    }
  };

  // Host Action: Restart the match from final podium
  const restartGame = async () => {
    if (!roomId || !playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      setError(err.message || "Failed to restart game");
    }
  };

  return (
    <div className="min-h-screen bg-[#030307] text-[#f8fafc] flex flex-col items-center justify-start p-4 md:p-6 overflow-x-hidden selection:bg-blue-600/30 selection:text-white">
      {/* Background ambient stars/dust */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-black to-black pointer-events-none z-0" />

      {/* Persistent App Header bar */}
      <header className="relative w-full max-w-5xl z-10 flex items-center justify-between py-4 border-b border-slate-900 mb-8">
        <div
          onClick={roomId ? undefined : handleLeaveRoom}
          className={`flex items-center gap-2.5 ${roomId ? "" : "cursor-pointer"}`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1d4ed8] to-[#020617] flex items-center justify-center border border-[#3b82f6]/40 shadow-lg shadow-blue-900/10">
            <Gamepad2 className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-lg tracking-tight text-white">
              Call on
            </span>
            <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
              Multiplayer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Controls Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-950/40 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-[#3b82f6] transition-colors cursor-pointer"
            title={soundEnabled ? "Mute audio" : "Unmute audio"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-500" />
            )}
          </button>

          {/* Quick exit room if connected */}
          {roomId && (
            <button
              onClick={handleLeaveRoom}
              className="text-xs font-mono uppercase tracking-wider text-slate-500 hover:text-rose-400 border border-slate-900 hover:border-rose-950/40 px-3 py-2 rounded-xl bg-slate-950/20 transition-colors cursor-pointer"
            >
              Exit Room
            </button>
          )}
        </div>
      </header>

      {/* Main body canvas */}
      <main className="relative z-10 w-full flex flex-col items-center justify-center flex-grow mb-12">
        {/* Connection status warning */}
        {isConnecting && roomId && (
          <div className="mb-6 w-full max-w-md bg-blue-950/10 border border-blue-900/20 text-slate-300 text-xs px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
            <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-[#3b82f6] rounded-full animate-spin" />
            <span className="font-mono tracking-wide">Syncing game room status...</span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 w-full max-w-md bg-rose-950/30 border border-rose-900/30 text-rose-300 text-xs px-4 py-3 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-4 h-4 flex-none" />
            <span className="font-mono">{error}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!roomId || !room ? (
            /* WELCOME PHASE (JOIN / CREATE) */
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-md bg-black/60 backdrop-blur-md border border-[#1e293b]/80 shadow-2xl rounded-2xl p-6 md:p-8 flex flex-col gap-6"
            >
              <div className="text-center flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                  Call ON.
                </h1>
                <p className="text-xs text-slate-400 max-w-xs mx-auto font-mono tracking-wide">
                  The classic Name, Animal, Place, Thing party game. Take turns calling a letter and speed writing starting words.
                </p>
              </div>

              {/* Nickname selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
                  Choose Your Nickname
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3b82f6]/60" />
                  <input
                    type="text"
                    value={nickname}
                    maxLength={15}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter your nickname..."
                    className="w-full bg-[#0b0f19] border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                  />
                </div>
              </div>

              <div className="w-full h-px bg-slate-900/60" />

              {/* Option 1: Create Room */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <Plus className="w-4 h-4 text-[#3b82f6]" />
                  <span className="text-sm font-semibold text-white">Create a New Room</span>
                </div>
                <button
                  onClick={handleCreateRoom}
                  disabled={nickname.trim() === ""}
                  className={`w-full py-3.5 rounded-xl text-sm font-medium tracking-wide flex items-center justify-center gap-2 transition-all ${
                    nickname.trim() !== ""
                      ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-lg shadow-blue-600/20 active:scale-[0.98] cursor-pointer"
                      : "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  Create Room <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center">
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                  or
                </span>
              </div>

              {/* Option 2: Join Room */}
              <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <User className="w-4 h-4 text-[#3b82f6]" />
                  <span className="text-sm font-semibold text-white">Join Existing Room</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.substring(0, 5))}
                    placeholder="ROOM CODE"
                    className="w-1/2 bg-[#0b0f19] border border-slate-800 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-[0.2em] uppercase text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={nickname.trim() === "" || joinCode.trim().length !== 5}
                    className={`w-1/2 py-3.5 rounded-xl text-sm font-medium tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                      nickname.trim() !== "" && joinCode.trim().length === 5
                        ? "bg-slate-900 hover:bg-slate-850 text-white border border-slate-800 active:scale-[0.98] cursor-pointer"
                        : "bg-slate-900/40 border border-slate-950 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    Join Room <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* GAME MODES STATE MACHINE */
            <div className="w-full flex items-center justify-center">
              {room.status === "lobby" && (
                <Lobby
                  room={room}
                  playerId={playerId!}
                  onStartGame={startGame}
                />
              )}

              {room.status === "calling" && (
                <CallingPhase
                  room={room}
                  playerId={playerId!}
                  onCallLetter={callLetter}
                />
              )}

              {room.status === "writing" && (
                <WritingPhase
                  room={room}
                  playerId={playerId!}
                  onSubmitAnswers={submitAnswers}
                  soundEnabled={soundEnabled}
                />
              )}

              {room.status === "review" && (
                <ReviewPhase
                  room={room}
                  playerId={playerId!}
                  onToggleVeto={toggleVeto}
                  onFinalizeReview={finalizeReview}
                />
              )}

              {room.status === "ended" && (
                <PodiumPhase
                  room={room}
                  playerId={playerId!}
                  onRestartGame={restartGame}
                />
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative footer details */}
      <footer className="relative z-10 w-full max-w-5xl border-t border-slate-900/60 pt-4 flex flex-col md:flex-row items-center justify-between text-slate-600 text-[11px] font-mono tracking-wider gap-3">
        <span>© 2026 CALL ON WORDGAME CO. ALL RIGHTS RESERVED.</span>
        <div className="flex items-center gap-1">
          <Crown className="w-3 h-3 text-[#3b82f6]/40" />
          <span>MINIMALIST MULTIPLAYER</span>
        </div>
      </footer>
    </div>
  );
}
