// Custom Web Audio API synthesizer for retro-minimalist game sounds
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play a single note
function playNote(freq: number, duration: number, type: OscillatorType = "sine", gainVal: number = 0.1) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gainNode.gain.setValueAtTime(gainVal, ctx.currentTime);
    // Smooth decay
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio play blocked or failed", e);
  }
}

export const sounds = {
  // A subtle low tick for the timer countdown
  tick: () => {
    playNote(150, 0.05, "triangle", 0.05);
  },
  
  // High warning tick when timer is critical (< 5 seconds)
  warningTick: () => {
    playNote(600, 0.08, "sine", 0.08);
  },

  // Elegant chime when a letter is called
  letterCalled: () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playNote(440, 0.2, "sine", 0.1);
    setTimeout(() => playNote(554.37, 0.2, "sine", 0.1), 100);
    setTimeout(() => playNote(659.25, 0.4, "sine", 0.1), 200);
  },

  // Alert when submitting answers
  submit: () => {
    playNote(523.25, 0.15, "triangle", 0.08);
    setTimeout(() => playNote(659.25, 0.25, "triangle", 0.08), 80);
  },

  // Light click sound for keys
  click: () => {
    playNote(800, 0.03, "sine", 0.03);
  },

  // Veto toggle action sound (slightly sci-fi or buzzer-like)
  veto: () => {
    playNote(220, 0.15, "sawtooth", 0.05);
  },

  // Fanfare for game end
  victory: () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playNote(261.63, 0.15, "sine", 0.1); // C4
    setTimeout(() => playNote(329.63, 0.15, "sine", 0.1), 150); // E4
    setTimeout(() => playNote(392.00, 0.15, "sine", 0.1), 300); // G4
    setTimeout(() => playNote(523.25, 0.4, "sine", 0.1), 450);  // C5
  },
};
