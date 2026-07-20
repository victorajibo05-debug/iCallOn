import { Request, Response } from "express";
import { roomService } from "../services/room.service";

export class RoomController {
  // POST /api/rooms
  public createRoom(req: Request, res: Response): any {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ error: "Nickname is required" });
      }

      const { roomId, playerId } = roomService.createRoom(name);
      return res.json({ roomId, playerId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  }

  // POST /api/rooms/:roomId/join
  public joinRoom(req: Request, res: Response): any {
    try {
      const { roomId } = req.params;
      const { name } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ error: "Nickname is required" });
      }

      const { playerId, room } = roomService.joinRoom(roomId, name);
      return res.json({ roomId: room.id, playerId });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to join room" });
    }
  }

  // GET /api/rooms/:roomId/events
  public getEvents(req: Request, res: Response): any {
    const { roomId } = req.params;
    const playerId = req.query.playerId as string;

    const room = roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).end("Room not found");
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    // Write initial state immediately
    res.write(`data: ${JSON.stringify(room)}\n\n`);

    // Subscribe client for SSE broadcasts
    roomService.subscribeClient(roomId, res, playerId);

    req.on("close", () => {
      roomService.unsubscribeClient(roomId, res, playerId);
    });
  }

  // POST /api/rooms/:roomId/start
  public startGame(req: Request, res: Response): any {
    try {
      const { roomId } = req.params;
      const { playerId } = req.body;

      roomService.startGame(roomId, playerId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to start game" });
    }
  }

  // POST /api/rooms/:roomId/call-letter
  public callLetter(req: Request, res: Response): any {
    try {
      const { roomId } = req.params;
      const { playerId, letter } = req.body;

      roomService.callLetter(roomId, playerId, letter);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to call letter" });
    }
  }

  // POST /api/rooms/:roomId/answers
  public submitAnswers(req: Request, res: Response): any {
    try {
      const { roomId } = req.params;
      const { playerId, answers, submit } = req.body;

      const { success, transitioned } = roomService.submitAnswers(roomId, playerId, answers, submit);
      return res.json({ success, transitioned });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to submit answers" });
    }
  }

  // POST /api/rooms/:roomId/veto
  public toggleVeto(req: Request, res: Response): any {
    try {
      const { roomId } = req.params;
      const { playerId, targetPlayerId, field } = req.body;

      if (field !== "name" && field !== "animal" && field !== "place" && field !== "thing") {
        return res.status(400).json({ error: "Invalid category field" });
      }

      roomService.toggleVeto(roomId, playerId, targetPlayerId, field);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to toggle veto" });
    }
  }

  // POST /api/rooms/:roomId/submit-review
  public finalizeReview(req: Request, res: Response): any {
    try {
      const { roomId } = req.params;
      const { playerId } = req.body;

      roomService.finalizeReview(roomId, playerId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to finalize review" });
    }
  }

  // POST /api/rooms/:roomId/restart
  public restartGame(req: Request, res: Response): any {
    try {
      const { roomId } = req.params;
      const { playerId } = req.body;

      roomService.restartGame(roomId, playerId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to restart game" });
    }
  }
}

export const roomController = new RoomController();
