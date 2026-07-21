import { useState } from "react";
import { RoomState } from "../types";
import { motion } from "motion/react";
import { Check, X, Crown, RefreshCw, Bot } from "lucide-react";
import { sounds } from "../utils/sound";

interface ReviewPhaseProps {
  room: RoomState;
  playerId: string;
  onFinalizeReview: () => void;
}

export default function ReviewPhase({ room, playerId, onFinalizeReview }: ReviewPhaseProps) {
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost || false;

  // Track selected player tab on smaller screens to keep UI compact
  const [activeTabPlayerId, setActiveTabPlayerId] = useState<string>(
    room.players.find((p) => p.online)?.id || room.players[0].id
  );

  const categories = ["name", "animal", "place", "thing"] as const;

  const getPlayerRoundScore = (pId: string) => {
    const ans = room.answers[pId];
    if (!ans) return 0;
    return (ans.scores.name || 0) + (ans.scores.animal || 0) + (ans.scores.place || 0) + (ans.scores.thing || 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-4xl bg-black/60 backdrop-blur-md border border-[#1e293b]/80 shadow-2xl rounded-2xl p-4 md:p-8 flex flex-col gap-6"
    >
      {/* Header and Round info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-5 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#3b82f6]">
            Round {room.round} Grading
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#3b82f6]" /> AI Referee Results
          </h2>
        </div>

        {/* Info Capsule */}
        <div className="flex items-center gap-5 bg-[#0b0f19] border border-slate-800 px-4 py-2.5 rounded-xl self-start md:self-auto">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
              Active Letter
            </span>
            <span className="font-mono text-2xl font-extrabold text-[#3b82f6] leading-none">
              {room.currentLetter}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
              Grading
            </span>
            <span className="font-mono text-xs text-slate-300 font-medium">
              Decided by AI referee
            </span>
          </div>
        </div>
      </div>

      {/* Tabs for mobile / small screens */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-slate-900/40 md:hidden scrollbar-none">
        {room.players.map((player) => {
          const isSelected = activeTabPlayerId === player.id;
          const score = getPlayerRoundScore(player.id);
          const isMe = player.id === playerId;

          return (
            <button
              key={player.id}
              onClick={() => {
                sounds.click();
                setActiveTabPlayerId(player.id);
              }}
              className={`flex-none px-3.5 py-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                isSelected
                  ? "bg-[#0f172a] border-[#3b82f6]/40 text-white"
                  : "bg-slate-950/20 border-slate-900 text-slate-400"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  player.online ? "bg-emerald-500" : "bg-slate-600"
                }`}
              />
              <span className="text-xs font-medium">
                {player.name} {isMe && "*"}
              </span>
              <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[#3b82f6]">
                +{score}
              </span>
            </button>
          );
        })}
      </div>

      {/* Responsive Grid Layout */}
      {/* Desktop side-by-side, mobile single view synced with the tabs above */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {room.players.map((player) => {
          const isMe = player.id === playerId;
          const score = getPlayerRoundScore(player.id);
          const ans = room.answers[player.id];
          const isTabActive = activeTabPlayerId === player.id;

          return (
            <div
              key={player.id}
              className={`flex-col bg-slate-950/40 border border-slate-900 rounded-xl p-5 gap-4 transition-all hover:border-slate-800/80 ${
                isTabActive ? "flex" : "hidden md:flex"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      player.online ? "bg-emerald-500" : "bg-slate-600"
                    }`}
                  />
                  <span className="font-semibold text-sm text-white flex items-center gap-1.5">
                    {player.name}{" "}
                    {isMe && <span className="text-xs font-normal text-slate-500">(You)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-[#0f172a] text-[#3b82f6] px-2.5 py-1 rounded border border-blue-950/30">
                    +{score} pts
                  </span>
                </div>
              </div>

              {/* Answers fields */}
              <div className="flex flex-col gap-3">
                {categories.map((cat) => {
                  const val = (ans?.[cat] || "").trim();
                  const verdict = ans?.aiVerdicts?.[cat];
                  const isValid = verdict?.valid ?? false;

                  return (
                    <div
                      key={cat}
                      className={`flex flex-col p-3 rounded-lg border transition-colors ${
                        !val
                          ? "bg-slate-950/20 border-slate-950"
                          : isValid
                          ? "bg-slate-950/40 border-emerald-900/20"
                          : "bg-rose-950/10 border-rose-900/20"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                        <span>{cat}</span>

                        {val && (
                          <span
                            className={`flex items-center gap-1 ${
                              isValid ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isValid ? (
                              <>
                                <Check className="w-3 h-3" /> VALID (+10)
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" /> REJECTED (+0)
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 min-h-[36px]">
                        <span
                          className={`text-sm font-medium break-all ${
                            !val
                              ? "text-slate-700 italic"
                              : isValid
                              ? "text-slate-100"
                              : "text-rose-400/60 line-through font-mono decoration-2 decoration-rose-500"
                          }`}
                        >
                          {val || "No entry"}
                        </span>
                      </div>

                      {/* AI's reasoning for the verdict */}
                      {val && verdict?.reason && (
                        <div className="mt-1.5 text-[9px] font-mono text-slate-500 flex items-center gap-1">
                          <Bot className="w-2.5 h-2.5" />
                          <span>{verdict.reason}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Host Controls */}
      <div className="border-t border-slate-900 pt-5 mt-2 flex flex-col gap-3">
        {isHost ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400 font-mono tracking-wide text-center md:text-left flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> Scores above were graded by the AI
              referee. Click to lock them in and move on.
            </p>
            <button
              onClick={() => {
                sounds.click();
                onFinalizeReview();
              }}
              className="w-full md:w-auto px-8 py-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-medium tracking-wide shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Finalize & Next Round
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-4 bg-slate-950/20 rounded-xl border border-slate-900/40 text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3b82f6]" />
            <span className="text-xs font-mono tracking-wider">
              Waiting for host to finalize the round...
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}