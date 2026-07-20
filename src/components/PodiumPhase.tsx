import { useState } from "react";
import { RoomState, Player } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Award, Crown, RotateCcw, ChevronDown, ChevronUp, History, Star } from "lucide-react";
import { sounds } from "../utils/sound";

interface PodiumPhaseProps {
  room: RoomState;
  playerId: string;
  onRestartGame: () => void;
}

export default function PodiumPhase({ room, playerId, onRestartGame }: PodiumPhaseProps) {
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost || false;

  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  // Play victory note once when mounting
  useState(() => {
    sounds.victory();
  });

  // Sort players by score
  const sortedPlayers = [...room.players].sort((a, b) => {
    const scoreA = room.scores[a.id] || 0;
    const scoreB = room.scores[b.id] || 0;
    return scoreB - scoreA;
  });

  // Assign ranks (handling ties elegantly)
  let currentRank = 1;
  const rankedPlayers = sortedPlayers.map((player, index) => {
    if (index > 0) {
      const prevPlayer = sortedPlayers[index - 1];
      const prevScore = room.scores[prevPlayer.id] || 0;
      const curScore = room.scores[player.id] || 0;
      if (curScore < prevScore) {
        currentRank = index + 1;
      }
    }
    return { ...player, rank: currentRank, score: room.scores[player.id] || 0 };
  });

  // Extract top 3 for the visual podium
  const firstPlace = rankedPlayers.find((p) => p.rank === 1);
  const secondPlace = rankedPlayers.find((p) => p.rank === 2);
  const thirdPlace = rankedPlayers.find((p) => p.rank === 3);

  // Remaining players for list
  const runnersUp = rankedPlayers.filter((p) => p.rank > 3 || (p.rank === 3 && p.id !== thirdPlace?.id) || (p.rank === 2 && p.id !== secondPlace?.id));

  const toggleRound = (roundNum: number) => {
    sounds.click();
    setExpandedRound(expandedRound === roundNum ? null : roundNum);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-2xl bg-black/60 backdrop-blur-md border border-[#1e293b]/80 shadow-2xl rounded-2xl p-6 md:p-8 flex flex-col gap-8"
    >
      <div className="text-center flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#3b82f6]">
          Game Over
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          🏆 Final Standings
        </h2>
      </div>

      {/* Visual Podium (Desktop & Mobile styled) */}
      <div className="flex flex-col items-center justify-center pt-4">
        <div className="flex items-end justify-center w-full max-w-sm h-64 border-b border-slate-800/60 pb-1">
          {/* 2nd Place */}
          {secondPlace && (
            <div className="flex flex-col items-center w-24">
              <span className="text-xs font-semibold text-slate-300 text-center truncate w-full px-1">
                {secondPlace.name}
              </span>
              <span className="text-[11px] font-mono text-slate-400 mb-2">
                {secondPlace.score} pts
              </span>
              <div className="w-full h-24 bg-[#0f172a] border-t-2 border-slate-400 rounded-t-xl flex flex-col items-center justify-center shadow-lg shadow-slate-400/5">
                <span className="text-2xl font-black font-mono text-slate-400">2</span>
                <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                  Silver
                </span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {firstPlace && (
            <div className="flex flex-col items-center w-28 -mx-1">
              <Crown className="w-6 h-6 text-amber-400 animate-bounce mb-1" />
              <span className="text-sm font-bold text-white text-center truncate w-full px-1">
                {firstPlace.name}
              </span>
              <span className="text-[11px] font-mono text-[#3b82f6] font-bold mb-2">
                {firstPlace.score} pts
              </span>
              <div className="w-full h-32 bg-[#172554] border-t-2 border-amber-400 rounded-t-2xl flex flex-col items-center justify-center shadow-2xl shadow-blue-500/10">
                <span className="text-4xl font-black font-mono text-amber-400">1</span>
                <span className="text-[9px] font-mono uppercase text-amber-500 tracking-wider">
                  Champion
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {thirdPlace && (
            <div className="flex flex-col items-center w-24">
              <span className="text-xs font-semibold text-amber-600/90 text-center truncate w-full px-1">
                {thirdPlace.name}
              </span>
              <span className="text-[11px] font-mono text-slate-400 mb-2">
                {thirdPlace.score} pts
              </span>
              <div className="w-full h-16 bg-[#0b1329] border-t-2 border-amber-700/60 rounded-t-xl flex flex-col items-center justify-center shadow-md shadow-amber-900/5">
                <span className="text-xl font-black font-mono text-amber-600">3</span>
                <span className="text-[9px] font-mono uppercase text-amber-700 tracking-wider">
                  Bronze
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Runners-Up (Positions 4+) */}
      {runnersUp.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 px-1">
            Other Players
          </span>
          <div className="flex flex-col gap-2">
            {runnersUp.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-slate-950/40 border border-slate-900 px-4 py-3 rounded-xl text-slate-300"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-500 font-bold w-4">
                    {p.rank}
                  </span>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
                <span className="font-mono text-sm text-slate-400 font-semibold">
                  {p.score} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round-by-Round Match Ledger History */}
      {room.history.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 px-1 flex items-center gap-1.5 border-t border-slate-900 pt-5">
            <History className="w-3.5 h-3.5" /> Game Rounds Ledger
          </span>

          <div className="flex flex-col gap-2.5">
            {room.history.map((h) => {
              const isExpanded = expandedRound === h.round;

              return (
                <div
                  key={h.round}
                  className="bg-slate-950/20 border border-slate-900 rounded-xl overflow-hidden transition-colors hover:border-slate-800/60"
                >
                  <button
                    onClick={() => toggleRound(h.round)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-[#0f172a] rounded-lg border border-blue-900/30 flex items-center justify-center text-sm font-bold font-mono text-[#3b82f6]">
                        {h.letter}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-slate-400">
                          Round {h.round}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Letter called by {h.callerName}
                        </span>
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="px-4 pb-4 border-t border-slate-900/50 pt-3 flex flex-col gap-3.5 bg-black/20"
                      >
                        {room.players.map((player) => {
                          const pAns = h.answers[player.id];
                          const totalRoundScore = pAns
                            ? (pAns.name?.finalScore || 0) +
                              (pAns.animal?.finalScore || 0) +
                              (pAns.place?.finalScore || 0) +
                              (pAns.thing?.finalScore || 0)
                            : 0;

                          return (
                            <div
                              key={player.id}
                              className="bg-black/30 p-3 rounded-lg border border-slate-900/80 flex flex-col gap-2.5"
                            >
                              <div className="flex items-center justify-between border-b border-slate-900/60 pb-1.5 text-xs">
                                <span className="font-semibold text-white">{player.name}</span>
                                <span className="font-mono text-[10px] bg-[#0f172a] px-2 py-0.5 rounded text-[#3b82f6] font-bold border border-blue-950/20">
                                  Score: +{totalRoundScore} pts
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                {["name", "animal", "place", "thing"].map((cat) => {
                                  const fieldData = pAns?.[cat];
                                  const val = fieldData?.val || "";
                                  const pts = fieldData?.finalScore || 0;

                                  return (
                                    <div key={cat} className="flex flex-col">
                                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">
                                        {cat}
                                      </span>
                                      <div className="flex items-baseline justify-between gap-1">
                                        <span
                                          className={`truncate max-w-[120px] font-medium ${
                                            pts === 10
                                              ? "text-slate-200"
                                              : "text-slate-500 line-through decoration-1"
                                          }`}
                                        >
                                          {val || "—"}
                                        </span>
                                        <span
                                          className={`font-mono text-[10px] ${
                                            pts === 10 ? "text-emerald-400" : "text-slate-600"
                                          }`}
                                        >
                                          {pts}p
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Restart / Reset Controls */}
      <div className="border-t border-slate-900 pt-5 mt-2">
        {isHost ? (
          <button
            onClick={() => {
              sounds.click();
              onRestartGame();
            }}
            className="w-full py-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-medium tracking-wide shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Start New Match
          </button>
        ) : (
          <div className="flex items-center justify-center gap-3 py-4 bg-slate-950/20 rounded-xl border border-slate-900/40 text-slate-400">
            <RotateCcw className="w-4 h-4 animate-spin text-[#3b82f6]" />
            <span className="text-xs font-mono tracking-wider">
              Waiting for host to start a new match...
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
