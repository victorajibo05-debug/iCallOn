import { RoomState, Player, RoundAnswers } from "../../src/types";
import express from "express";

export class RoomService {
  private rooms = new Map<string, RoomState>();
  private sseClients = new Map<string, Set<express.Response>>();
  private writingTimeouts = new Map<string, NodeJS.Timeout>();

  constructor() {
    // Start automated clean-up interval for empty/idle rooms
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 10 * 60 * 1000); // Check every 10 minutes
  }

  // Generate unique 5-letter uppercase room code
  public generateRoomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    do {
      code = "";
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  // Retrieve room by ID
  public getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  // Delete room
  public deleteRoom(roomId: string): void {
    const upperCode = roomId.toUpperCase();
    this.rooms.delete(upperCode);
    this.sseClients.delete(upperCode);
    const timeout = this.writingTimeouts.get(upperCode);
    if (timeout) {
      clearTimeout(timeout);
      this.writingTimeouts.delete(upperCode);
    }
  }

  // Create new room
  public createRoom(nickname: string): { roomId: string; playerId: string; room: RoomState } {
    const roomId = this.generateRoomCode();
    const playerId = "p_" + Math.random().toString(36).substr(2, 9);

    const host: Player = {
      id: playerId,
      name: nickname.trim().substring(0, 15),
      isHost: true,
      online: true,
    };

    const initialRoom: RoomState = {
      id: roomId,
      players: [host],
      status: "lobby",
      round: 1,
      maxRounds: 5,
      activePlayerId: playerId,
      currentLetter: "",
      timerEndsAt: null,
      answers: {},
      scores: { [playerId]: 0 },
      history: [],
    };

    this.rooms.set(roomId, initialRoom);
    return { roomId, playerId, room: initialRoom };
  }

  // Join existing room
  public joinRoom(roomId: string, nickname: string): { playerId: string; room: RoomState } {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "lobby") {
      throw new Error("Game is already in progress");
    }

    if (room.players.length >= 5) {
      throw new Error("Room is full (max 5 players)");
    }

    const trimmedName = nickname.trim().substring(0, 15);
    const nameExists = room.players.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (nameExists) {
      throw new Error("Nickname is already taken in this room");
    }

    const playerId = "p_" + Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = {
      id: playerId,
      name: trimmedName,
      isHost: false,
      online: true,
    };

    room.players.push(newPlayer);
    room.scores[playerId] = 0;

    this.broadcast(room.id);
    return { playerId, room };
  }

  // Add SSE Connection for a room client
  public subscribeClient(roomId: string, res: express.Response, playerId?: string): void {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) return;

    if (playerId) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.online = true;
        this.broadcast(upperCode);
      }
    }

    if (!this.sseClients.has(upperCode)) {
      this.sseClients.set(upperCode, new Set());
    }
    this.sseClients.get(upperCode)!.add(res);
  }

  // Unsubscribe SSE client
  public unsubscribeClient(roomId: string, res: express.Response, playerId?: string): void {
    const upperCode = roomId.toUpperCase();
    const clients = this.sseClients.get(upperCode);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        this.sseClients.delete(upperCode);
      }
    }

    if (playerId) {
      // Delay disconnect detection for 5 seconds to prevent flicker
      setTimeout(() => {
        const room = this.rooms.get(upperCode);
        if (room) {
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            player.online = false;
            // Re-assign host if host went offline
            if (player.isHost) {
              const activePlayers = room.players.filter((p) => p.online && p.id !== playerId);
              if (activePlayers.length > 0) {
                player.isHost = false;
                activePlayers[0].isHost = true;
              }
            }
            this.broadcast(upperCode);
          }
        }
      }, 5000);
    }
  }

  // Broadcast state changes
  public broadcast(roomId: string): void {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) return;

    const clients = this.sseClients.get(upperCode);
    if (clients) {
      const data = `data: ${JSON.stringify(room)}\n\n`;
      clients.forEach((client) => {
        try {
          client.write(data);
        } catch (err) {
          console.error(`Error sending SSE payload to client in room ${upperCode}:`, err);
        }
      });
    }
  }

  // Start game from lobby
  public startGame(roomId: string, playerId: string): void {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) throw new Error("Room not found");

    const player = room.players.find((p) => p.id === playerId);
    if (!player || !player.isHost) {
      throw new Error("Only the host can start the game");
    }

    if (room.players.length < 2) {
      throw new Error("At least 2 players are required to start");
    }

    room.status = "calling";
    room.round = 1;
    room.activePlayerId = room.players[0].id;
    room.currentLetter = "";
    room.timerEndsAt = null;
    room.answers = {};
    room.history = [];

    room.players.forEach((p) => {
      room.scores[p.id] = 0;
    });

    this.broadcast(upperCode);
  }

  // Call out letter and initiate writing round
  public callLetter(roomId: string, playerId: string, letter: string): void {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) throw new Error("Room not found");

    if (room.status !== "calling") {
      throw new Error("Not currently in the calling phase");
    }

    if (room.activePlayerId !== playerId) {
      throw new Error("Only the active caller can call the letter");
    }

    const cleanLetter = letter.toUpperCase().trim();
    if (!/^[A-Z]$/.test(cleanLetter)) {
      throw new Error("Please choose a valid letter from A to Z");
    }

    room.currentLetter = cleanLetter;
    room.status = "writing";
    room.timerEndsAt = Date.now() + 35000;

    room.players.forEach((p) => {
      room.answers[p.id] = {
        name: "",
        animal: "",
        place: "",
        thing: "",
        submitted: false,
        scores: { name: 0, animal: 0, place: 0, thing: 0 },
        vetos: { name: [], animal: [], place: [], thing: [] },
      };
    });

    if (this.writingTimeouts.has(upperCode)) {
      clearTimeout(this.writingTimeouts.get(upperCode));
    }

    const timeoutId = setTimeout(() => {
      this.transitionToReview(upperCode);
    }, 35500);

    this.writingTimeouts.set(upperCode, timeoutId);
    this.broadcast(upperCode);
  }

  // Transition from writing to review state
  public transitionToReview(roomId: string): void {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room || room.status !== "writing") return;

    room.status = "review";
    room.timerEndsAt = null;

    room.players.forEach((p) => {
      if (!room.answers[p.id]) {
        room.answers[p.id] = {
          name: "",
          animal: "",
          place: "",
          thing: "",
          submitted: true,
          scores: { name: 0, animal: 0, place: 0, thing: 0 },
          vetos: { name: [], animal: [], place: [], thing: [] },
        };
      } else {
        room.answers[p.id].submitted = true;
      }

      const ans = room.answers[p.id];
      const fields: Array<"name" | "animal" | "place" | "thing"> = ["name", "animal", "place", "thing"];
      fields.forEach((field) => {
        const val = ans[field]?.trim() || "";
        if (val !== "" && val.toLowerCase().startsWith(room.currentLetter.toLowerCase())) {
          ans.scores[field] = 10;
        } else {
          ans.scores[field] = 0;
        }
      });
    });

    this.writingTimeouts.delete(upperCode);
    this.broadcast(upperCode);
  }

  // Update or lock in answers
  public submitAnswers(
    roomId: string,
    playerId: string,
    answers: { name: string; animal: string; place: string; thing: string },
    submit: boolean
  ): { success: boolean; transitioned: boolean } {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) throw new Error("Room not found");

    if (room.status !== "writing") {
      throw new Error("Not in writing phase");
    }

    if (!room.answers[playerId]) {
      room.answers[playerId] = {
        name: "",
        animal: "",
        place: "",
        thing: "",
        submitted: false,
        scores: { name: 0, animal: 0, place: 0, thing: 0 },
        vetos: { name: [], animal: [], place: [], thing: [] },
      };
    }

    const currentAns = room.answers[playerId];
    if (currentAns.submitted) {
      throw new Error("Answers already submitted");
    }

    if (answers) {
      currentAns.name = (answers.name || "").substring(0, 30);
      currentAns.animal = (answers.animal || "").substring(0, 30);
      currentAns.place = (answers.place || "").substring(0, 30);
      currentAns.thing = (answers.thing || "").substring(0, 30);
    }

    if (submit) {
      currentAns.submitted = true;
      const activePlayers = room.players.filter((p) => p.online);
      const allSubmitted = activePlayers.every((p) => room.answers[p.id]?.submitted);

      if (allSubmitted) {
        if (this.writingTimeouts.has(upperCode)) {
          clearTimeout(this.writingTimeouts.get(upperCode));
          this.writingTimeouts.delete(upperCode);
        }
        this.transitionToReview(upperCode);
        return { success: true, transitioned: true };
      }
    }

    this.broadcast(upperCode);
    return { success: true, transitioned: false };
  }

  // Toggle opponent answer veto
  public toggleVeto(
    roomId: string,
    playerId: string,
    targetPlayerId: string,
    field: "name" | "animal" | "place" | "thing"
  ): void {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) throw new Error("Room not found");

    if (room.status !== "review") {
      throw new Error("Not in review phase");
    }

    const targetAnswer = room.answers[targetPlayerId];
    if (!targetAnswer) throw new Error("Target player has no answers");

    const vetosList = targetAnswer.vetos[field] || [];
    const idx = vetosList.indexOf(playerId);
    if (idx > -1) {
      vetosList.splice(idx, 1);
    } else {
      vetosList.push(playerId);
    }
    targetAnswer.vetos[field] = vetosList;

    // Recalculate based on online voting opponents
    const otherOnlineCount = room.players.filter((p) => p.online && p.id !== targetPlayerId).length;
    const requiredVetoes = Math.max(1, Math.ceil(otherOnlineCount / 2));
    const isVetoed = vetosList.length >= requiredVetoes;

    const val = targetAnswer[field]?.trim() || "";
    const isValidLetter = val !== "" && val.toLowerCase().startsWith(room.currentLetter.toLowerCase());

    if (isVetoed || !isValidLetter) {
      targetAnswer.scores[field] = 0;
    } else {
      targetAnswer.scores[field] = 10;
    }

    this.broadcast(upperCode);
  }

  // Finalize review & advance rounds
  public finalizeReview(roomId: string, playerId: string): void {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) throw new Error("Room not found");

    if (room.status !== "review") {
      throw new Error("Not in review phase");
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player || !player.isHost) {
      throw new Error("Only the host can finalize the round review");
    }

    // Accumulate total scores
    room.players.forEach((p) => {
      const ans = room.answers[p.id];
      if (ans) {
        const roundScore = (ans.scores.name || 0) + (ans.scores.animal || 0) + (ans.scores.place || 0) + (ans.scores.thing || 0);
        room.scores[p.id] = (room.scores[p.id] || 0) + roundScore;
      }
    });

    // Save history
    const roundAnswersHistory: Record<string, any> = {};
    const activeCaller = room.players.find((p) => p.id === room.activePlayerId);
    room.players.forEach((p) => {
      const ans = room.answers[p.id];
      roundAnswersHistory[p.id] = {
        name: { val: ans?.name || "", finalScore: ans?.scores?.name || 0 },
        animal: { val: ans?.animal || "", finalScore: ans?.scores?.animal || 0 },
        place: { val: ans?.place || "", finalScore: ans?.scores?.place || 0 },
        thing: { val: ans?.thing || "", finalScore: ans?.scores?.thing || 0 },
      };
    });

    room.history.push({
      round: room.round,
      letter: room.currentLetter,
      callerName: activeCaller?.name || "Unknown",
      answers: roundAnswersHistory,
    });

    // Check game end conditions
    const totalRoundsToPlay = Math.max(room.players.length, room.maxRounds);
    if (room.round >= totalRoundsToPlay) {
      room.status = "ended";
      room.timerEndsAt = null;
    } else {
      room.round += 1;
      room.status = "calling";
      room.currentLetter = "";
      room.timerEndsAt = null;

      const currentCallerIndex = room.players.findIndex((p) => p.id === room.activePlayerId);
      let nextCallerIndex = (currentCallerIndex + 1) % room.players.length;

      let attempts = 0;
      while (!room.players[nextCallerIndex].online && attempts < room.players.length) {
        nextCallerIndex = (nextCallerIndex + 1) % room.players.length;
        attempts++;
      }
      room.activePlayerId = room.players[nextCallerIndex].id;
      room.answers = {};
    }

    this.broadcast(upperCode);
  }

  // Reset match state
  public restartGame(roomId: string, playerId: string): void {
    const upperCode = roomId.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) throw new Error("Room not found");

    const player = room.players.find((p) => p.id === playerId);
    if (!player || !player.isHost) {
      throw new Error("Only the host can restart the game");
    }

    room.status = "calling";
    room.round = 1;
    room.activePlayerId = room.players[0].id;
    room.currentLetter = "";
    room.timerEndsAt = null;
    room.answers = {};
    room.history = [];

    room.players.forEach((p) => {
      room.scores[p.id] = 0;
    });

    this.broadcast(upperCode);
  }

  // Automated clean up of empty/dead rooms
  private cleanupInactiveRooms(): void {
    for (const [roomId, room] of this.rooms.entries()) {
      const allOffline = room.players.every((p) => !p.online);
      if (allOffline) {
        this.deleteRoom(roomId);
        console.log(`Automated cleanup removed inactive room code: ${roomId}`);
      }
    }
  }
}

// Single instance of our service to be shared across controllers
export const roomService = new RoomService();
