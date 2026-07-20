export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  online: boolean;
}

export interface RoundAnswers {
  name: string;
  animal: string;
  place: string;
  thing: string;
  submitted: boolean;
  scores: {
    name: number;
    animal: number;
    place: number;
    thing: number;
  };
  vetos: {
    name: string[];  // playerIds who vetoed this name
    animal: string[]; // playerIds who vetoed this animal
    place: string[];  // playerIds who vetoed this place
    thing: string[];  // playerIds who vetoed this thing
  };
}

export type GameStatus = 'lobby' | 'calling' | 'writing' | 'review' | 'ended';

export interface RoomState {
  id: string;
  players: Player[];
  status: GameStatus;
  round: number;
  maxRounds: number;
  activePlayerId: string; // The player who is currently calling the letter
  currentLetter: string;  // The letter called (e.g., "A")
  timerEndsAt: number | null; // epoch timestamp when the 35s timer ends
  answers: Record<string, RoundAnswers>; // playerId -> RoundAnswers
  scores: Record<string, number>; // playerId -> total score
  history: {
    round: number;
    letter: string;
    callerName: string;
    answers: Record<string, {
      name: { val: string; finalScore: number };
      animal: { val: string; finalScore: number };
      place: { val: string; finalScore: number };
      thing: { val: string; finalScore: number };
    }>;
  }[];
}
