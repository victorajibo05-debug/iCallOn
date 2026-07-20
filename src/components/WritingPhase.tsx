import { useState, useEffect, useRef, FormEvent } from "react";
import { RoomState } from "../types";
import { motion } from "motion/react";
import { Timer, Check, AlertCircle, Send, CheckCircle2 } from "lucide-react";
import { sounds } from "../utils/sound";

interface WritingPhaseProps {
  room: RoomState;
  playerId: string;
  onSubmitAnswers: (
    answers: { name: string; animal: string; place: string; thing: string },
    submit: boolean
  ) => void;
  soundEnabled: boolean;
}

export default function WritingPhase({
  room,
  playerId,
  onSubmitAnswers,
  soundEnabled,
}: WritingPhaseProps) {
  const [answers, setAnswers] = useState({
    name: "",
    animal: "",
    place: "",
    thing: "",
  });

  const [timeLeft, setTimeLeft] = useState(35);
  const lastTickRef = useRef<number | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const myAnswerState = room.answers[playerId];
  const isSubmitted = myAnswerState?.submitted || false;

  // Initialize local inputs from server if existing (handles reconnection)
  useEffect(() => {
    if (myAnswerState) {
      setAnswers({
        name: myAnswerState.name || "",
        animal: myAnswerState.animal || "",
        place: myAnswerState.place || "",
        thing: myAnswerState.thing || "",
      });
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (!room.timerEndsAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const difference = room.timerEndsAt! - now;
      const seconds = Math.max(0, Math.ceil(difference / 1000));
      setTimeLeft(seconds);

      // Play ticking audio cues once per second
      if (soundEnabled && seconds > 0 && seconds !== lastTickRef.current) {
        if (seconds <= 5) {
          sounds.warningTick();
        } else if (seconds <= 10) {
          sounds.tick();
        }
        lastTickRef.current = seconds;
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [room.timerEndsAt, soundEnabled]);

  // Debounced auto-save drafts to server
  const triggerAutoSave = (updatedAnswers: typeof answers) => {
    if (isSubmitted) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      onSubmitAnswers(updatedAnswers, false);
    }, 400); // 400ms debounce
  };

  const handleInputChange = (field: keyof typeof answers, value: string) => {
    if (isSubmitted) return;
    const cleanValue = value.replace(/[^a-zA-Z\s-]/g, ""); // allow only letters, spaces, and hyphens
    const updated = { ...answers, [field]: cleanValue };
    setAnswers(updated);
    triggerAutoSave(updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitted) return;
    
    if (soundEnabled) {
      sounds.submit();
    }
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    onSubmitAnswers(answers, true);
  };

  // Helper to check if an answer matches the current letter
  const validateField = (val: string) => {
    if (!val) return "empty";
    if (val.trim().toLowerCase().startsWith(room.currentLetter.toLowerCase())) {
      return "valid";
    }
    return "invalid";
  };

  const isFormValid =
    answers.name.trim() !== "" ||
    answers.animal.trim() !== "" ||
    answers.place.trim() !== "" ||
    answers.thing.trim() !== "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-lg bg-black/60 backdrop-blur-md border border-[#1e293b]/80 shadow-2xl rounded-2xl p-6 md:p-8 flex flex-col gap-6"
    >
      {/* Top Status Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
            Current Letter
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-[#3b82f6] font-mono">
              {room.currentLetter}
            </span>
            <span className="text-xs text-slate-500 font-mono">starts with</span>
          </div>
        </div>

        {/* Timer UI */}
        <div className="flex items-center gap-3 bg-[#0b0f19] border border-slate-800 px-4 py-2.5 rounded-xl">
          <Timer className={`w-5 h-5 ${timeLeft <= 5 ? "text-rose-500 animate-pulse" : "text-[#3b82f6]"}`} />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
              Time Left
            </span>
            <span className={`font-mono text-xl font-bold leading-none ${timeLeft <= 5 ? "text-rose-500 font-black" : "text-white"}`}>
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {isSubmitted ? (
        /* Waiting State after Submission */
        <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[#3b82f6]/10 rounded-full scale-150 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-[#0f172a]/80 border-2 border-[#3b82f6]/50 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            <h3 className="text-lg font-medium text-white">Answers Locked In</h3>
            <p className="text-xs text-slate-400 max-w-xs font-mono tracking-wide">
              Your submissions are secured. Waiting for other players to submit or for the timer to expire...
            </p>
          </div>

          {/* Submissions checklist of other players */}
          <div className="w-full max-w-xs bg-[#0b0f19]/80 border border-slate-900 rounded-xl p-4 mt-4 flex flex-col gap-2.5 text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 border-b border-slate-950 pb-1.5">
              Player Progress
            </span>
            {room.players.map((p) => {
              const isPMe = p.id === playerId;
              const hasSubmitted = room.answers[p.id]?.submitted || false;
              return (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className={isPMe ? "text-[#3b82f6] font-medium" : "text-slate-300"}>
                    {p.name} {isPMe && "(You)"}
                  </span>
                  <span className={`font-mono px-2 py-0.5 rounded text-[10px] ${
                    hasSubmitted
                      ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                      : "bg-amber-950/20 text-amber-500 border border-amber-900/10 animate-pulse"
                  }`}>
                    {hasSubmitted ? "READY" : "WRITING"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Form Submission Screen */
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Categories Inputs */}
          <div className="flex flex-col gap-4">
            {(["name", "animal", "place", "thing"] as const).map((field) => {
              const val = answers[field];
              const status = validateField(val);

              return (
                <div key={field} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-medium">
                      {field}
                    </label>

                    {/* Validation Feedback */}
                    {status === "valid" && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}
                    {status === "invalid" && (
                      <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Must start with {room.currentLetter}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      placeholder={`Enter a ${field}...`}
                      autoFocus={field === "name"}
                      className={`w-full bg-[#0b0f19] border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all ${
                        status === "valid"
                          ? "border-emerald-500/30 focus:border-emerald-500/80 focus:ring-emerald-500/30"
                          : status === "invalid"
                          ? "border-rose-500/30 focus:border-rose-500/80 focus:ring-rose-500/30"
                          : "border-slate-800 focus:border-blue-500/80 focus:ring-blue-500/30"
                      }`}
                    />
                    {val && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-600 select-none">
                        {val.trim().substring(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full py-3.5 mt-2 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-all ${
              isFormValid
                ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-lg shadow-blue-600/20 active:scale-[0.98] cursor-pointer"
                : "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" /> Submit & Lock Answers
          </button>
        </form>
      )}
    </motion.div>
  );
}
