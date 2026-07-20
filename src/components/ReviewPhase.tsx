import { useState } from "react";
import { RoomState, Player } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ThumbsDown, Crown, HelpCircle, Check, AlertCircle, RefreshCw } from "lucide-react";
import { sounds } from "../utils/sound";

interface ReviewPhaseProps {
  room: RoomState;
  playerId: string;
  onToggleVeto: (targetPlayerId: string, field: "name" | "animal" | "place" | "thing") => void;
  onFinalizeReview: () => void;
}

export default function ReviewPhase({
  room,
  playerId,
  onToggleVeto,
  onFinalizeReview,
}: ReviewPhaseProps) {
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost || false;

  // Track selected player tab on smaller screens to keep UI compact
  const [activeTabPlayerId, setActiveTabPlayerId] = useState<string>(
    room.players.find((p) => p.online)?.id || room.players[0].id
  );

  const categories = ["name", "animal", "place", "thing"] as const;

  const handleVetoClick = (targetPlayerId: string, field: "name" | "animal" | "place" | "thing") => {
    sounds.veto();
    onToggleVeto(targetPlayerId, field);
  };

  // Helper to determine veto status
  const getFieldVetoInfo = (targetPlayerId: string, field: "name" | "animal" | "place" | "thing") => {
    const ans = room.answers[targetPlayerId];
    if (!ans) return { isVetoed: false, count: 0, votedByMe: false };

    const list = ans.vetos[field] || [];
    const count = list.length;
    const votedByMe = list.includes(playerId);

    // Number of OTHER online players (excluding the target player themselves)
    const otherOnlineCount = room.players.filter((p) => p.online && p.id !== targetPlayerId).length;
    // Veto succeeds if count >= 50% of voting players (min 1)
    const requiredVetoes = Math.max(1, Math.ceil(otherOnlineCount / 2));
    const isVetoed = count >= requiredVetoes;

    return { isVetoed, count, votedByMe, requiredVetoes };
  };

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
            Veto & Scoring Phase
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
              Veto Rule
            </span>
            <span className="font-mono text-xs text-slate-300 font-medium">
              Majority of opponents
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
                  const { isVetoed, count, votedByMe, requiredVetoes } = getFieldVetoInfo(
                    player.id,
                    cat
                  );

                  const lowercaseVal = val.toLowerCase();
                  const startsWithLetter = lowercaseVal.startsWith(
                    room.currentLetter.toLowerCase()
                  );

                  return (
                    <div
                      key={cat}
                      className={`flex flex-col p-3 rounded-lg border transition-colors ${
                        !val
                          ? "bg-slate-950/20 border-slate-950"
                          : isVetoed
                          ? "bg-rose-950/10 border-rose-900/20"
                          : startsWithLetter
                          ? "bg-slate-950/40 border-slate-800"
                          : "bg-amber-950/10 border-amber-900/20"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                        <span>{cat}</span>

                        {val && (
                          <span
                            className={
                              isVetoed
                                ? "text-rose-400"
                                : startsWithLetter
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }
                          >
                            {isVetoed
                              ? "VETOED (+0)"
                              : startsWithLetter
                              ? "VALID (+10)"
                              : "WRONG LETTER (+0)"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 min-h-[36px]">
                        <span
                          className={`text-sm font-medium break-all ${
                            !val
                              ? "text-slate-700 italic"
                              : isVetoed
                              ? "text-rose-400/60 line-through font-mono decoration-2 decoration-rose-500"
                              : startsWithLetter
                              ? "text-slate-100"
                              : "text-amber-400/80 font-mono"
                          }`}
                        >
                          {val || "No entry"}
                        </span>

                        {/* Veto Toggle Button */}
                        {val && !isMe && (
                          <button
                            onClick={() => handleVetoClick(player.id, cat)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono border transition-all ${
                              votedByMe
                                ? "bg-rose-900/40 border-rose-700 text-rose-300 shadow-md shadow-rose-900/10"
                                : "bg-black/20 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                            }`}
                            title="Flag as invalid / incorrect"
                          >
                            <ThumbsDown className={`w-3 h-3 ${votedByMe ? "fill-current" : ""}`} />
                            <span>{count}</span>
                          </button>
                        )}

                        {/* If own answer or no entry, just show status */}
                        {val && isMe && (
                          <div className="flex items-center text-xs font-mono text-slate-500 gap-1 bg-black/10 px-2 py-1 rounded">
                            <ThumbsDown className="w-3 h-3" />
                            <span>{count}</span>
                          </div>
                        )}
                      </div>

                      {/* Small visual detail showing who flagged if any */}
                      {count > 0 && (
                        <div className="mt-1.5 text-[9px] font-mono text-slate-500 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>
                            {count}/{requiredVetoes} flags needed for veto
                          </span>
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
            <p className="text-xs text-slate-400 font-mono tracking-wide text-center md:text-left">
              🛡️ **Host Power**: Review the flags. Opponents can veto incorrect or misspelled words. Once everyone is satisfied, click to lock in points.
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
              Waiting for host to finalize review and advance...
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
