import { useState } from "react";
import { RoomState } from "../types";
import { motion } from "motion/react";
import { ChevronRight, Keyboard, User } from "lucide-react";
import { sounds } from "../utils/sound";

interface CallingPhaseProps {
  room: RoomState;
  playerId: string;
  onCallLetter: (letter: string) => void;
}

export default function CallingPhase({ room, playerId, onCallLetter }: CallingPhaseProps) {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const activePlayer = room.players.find((p) => p.id === room.activePlayerId);
  const isMyTurn = room.activePlayerId === playerId;

  // Extract already used letters from game history to disable them
  const usedLetters = new Set<string>(room.history.map((h) => h.letter.toUpperCase()));

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const handleSelectLetter = (letter: string) => {
    if (usedLetters.has(letter)) return;
    sounds.click();
    setSelectedLetter(letter);
  };

  const handleConfirm = () => {
    if (selectedLetter) {
      onCallLetter(selectedLetter);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full max-w-md bg-black/60 backdrop-blur-md border border-[#1e293b]/80 shadow-2xl rounded-2xl p-6 md:p-8 flex flex-col gap-6"
    >
      <div className="text-center flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#3b82f6]">
          Round {room.round}
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-white flex items-center justify-center gap-2">
          {isMyTurn ? "Your Turn to Call" : "Letter Selection"}
        </h2>
      </div>

      {isMyTurn ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 bg-[#0f172a]/40 border border-blue-900/20 px-4 py-3 rounded-xl">
            <Keyboard className="w-5 h-5 text-[#3b82f6]" />
            <p className="text-sm text-slate-300">
              Select an unused letter from the alphabet grid to call out.
            </p>
          </div>

          {/* Letter Grid */}
          <div className="grid grid-cols-6 gap-2">
            {alphabet.map((letter) => {
              const isUsed = usedLetters.has(letter);
              const isSelected = selectedLetter === letter;

              return (
                <button
                  key={letter}
                  onClick={() => handleSelectLetter(letter)}
                  disabled={isUsed}
                  className={`aspect-square rounded-lg font-mono text-lg font-bold flex items-center justify-center transition-all ${
                    isUsed
                      ? "bg-slate-950/20 border border-slate-900 text-slate-700 cursor-not-allowed line-through"
                      : isSelected
                      ? "bg-[#2563eb] text-white border-[#2563eb] shadow-lg shadow-blue-500/30 scale-105"
                      : "bg-black/40 border border-slate-800 text-slate-300 hover:border-[#3b82f6]/50 hover:text-[#3b82f6] cursor-pointer"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          <div className="mt-2">
            <button
              onClick={handleConfirm}
              disabled={!selectedLetter}
              className={`w-full py-3.5 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-all ${
                selectedLetter
                  ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-lg shadow-blue-600/20 active:scale-[0.98] cursor-pointer"
                  : "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              {selectedLetter ? (
                <>
                  Call Out Letter &apos;{selectedLetter}&apos; <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                "Choose a Letter"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8 py-8 text-center">
          <div className="relative">
            {/* Pulsing effect around player icon */}
            <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping scale-150 duration-1000" />
            <div className="relative w-16 h-16 rounded-full bg-[#0b0f19] border-2 border-[#1d4ed8]/30 flex items-center justify-center">
              <User className="w-8 h-8 text-[#3b82f6] animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-base font-medium text-slate-200">
              {activePlayer?.name || "Someone"} is calling
            </h3>
            <p className="text-xs font-mono text-slate-400 tracking-wider">
              Waiting for them to select a letter...
            </p>
          </div>

          {/* Elegant pulsing typing indicator */}
          <div className="flex items-center gap-1.5 bg-black/40 px-4 py-2 rounded-full border border-slate-900">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
