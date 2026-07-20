import { Router } from "express";
import { roomController } from "../controllers/room.controller";

const router = Router();

// Routes definition for Multiplayer room operations
router.post("/rooms", (req, res) => roomController.createRoom(req, res));
router.post("/rooms/:roomId/join", (req, res) => roomController.joinRoom(req, res));
router.get("/rooms/:roomId/events", (req, res) => roomController.getEvents(req, res));
router.post("/rooms/:roomId/start", (req, res) => roomController.startGame(req, res));
router.post("/rooms/:roomId/call-letter", (req, res) => roomController.callLetter(req, res));
router.post("/rooms/:roomId/answers", (req, res) => roomController.submitAnswers(req, res));
router.post("/rooms/:roomId/veto", (req, res) => roomController.toggleVeto(req, res));
router.post("/rooms/:roomId/submit-review", (req, res) => roomController.finalizeReview(req, res));
router.post("/rooms/:roomId/restart", (req, res) => roomController.restartGame(req, res));

export default router;
