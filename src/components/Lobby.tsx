import { useState } from "react";
import { RoomState, Player } from "../types";
import { motion } from "motion/react";
import { Users, Copy, Check, Crown, Play } from "lucide-react";
import { sounds } from "../utils/sound";

interface LobbyProps {
  room: RoomState;
  playerId: string;
  onStartGame: () => void;
}

export default function Lobby({ room, playerId, onStartGame }: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost || false;
  const onlinePlayers = room.players.filter((p) => p.online);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    sounds.click();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-md bg-black/60 backdrop-blur-md border border-[#1e293b]/80 shadow-2xl shadow-blue-900/10 rounded-2xl p-6 md:p-8 flex flex-col gap-6"
    >
      <div className="text-center flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#3b82f6]">
          Game Lobby
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Waiting for Players
        </h2>
      </div>

      {/* Room Code Card */}
      <div className="bg-[#0b0f19] border border-[#1d4ed8]/30 rounded-xl p-4 flex flex-col items-center gap-2">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Share Room Code
        </span>
        <div className="flex items-center gap-3 w-full justify-between bg-black/40 px-4 py-2.5 rounded-lg border border-slate-800">
          <span className="font-mono text-2xl font-bold tracking-[0.2em] text-white pl-2">
            {room.id}
          </span>
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Copy room code"
          >
            {copied ? (
              <Check className="w-5 h-5 text-emerald-500 animate-scale" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Player List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Players
          </span>
          <span>
            {room.players.length} / 5
          </span>
        </div>

        <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
          {room.players.map((player) => {
            const isMe = player.id === playerId;
            return (
              <motion.div
                key={player.id}
                layoutId={`player-${player.id}`}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  isMe
                    ? "bg-[#0f172a]/70 border-[#3b82f6]/40 text-white"
                    : "bg-slate-950/40 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        player.online ? "bg-emerald-500" : "bg-slate-600"
                      }`}
                    />
                    {player.online && (
                      <span className="absolute -inset-0.5 rounded-full bg-emerald-500/40 animate-ping" />
                    )}
                  </div>
                  <span className="font-medium text-sm">
                    {player.name} {isMe && <span className="text-xs text-[#3b82f6]/80 font-normal">(You)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {player.isHost && (
                    <div className="flex items-center gap-1 bg-[#1e3a8a]/60 text-[#93c5fd] text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-[#1d4ed8]/30">
                      <Crown className="w-3 h-3" /> Host
                    </div>
                  )}
                  {!player.online && (
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      Offline
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Start Button Area */}
      <div className="mt-2">
        {isHost ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                sounds.click();
                onStartGame();
              }}
              disabled={room.players.length < 2}
              className={`w-full py-3.5 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2.5 transition-all ${
                room.players.length >= 2
                  ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                  : "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Play className="w-4 h-4 fill-current" /> Start Game
            </button>
            {room.players.length < 2 && (
              <p className="text-center text-[11px] font-mono text-slate-500 tracking-wider">
                Waiting for at least 1 more player to join
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-3.5 bg-slate-950/30 rounded-xl border border-slate-900/60 text-slate-400">
            <div className="relative w-4 h-4">
              <div className="w-full h-full rounded-full border-2 border-slate-700 border-t-[#3b82f6] animate-spin" />
            </div>
            <span className="text-xs font-mono tracking-wider">
              Waiting for host to start...
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
