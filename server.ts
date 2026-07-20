import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import roomRouter from "./server/routers/room.router";

const app = express();
const PORT = 3000;

app.use(express.json());

// Mount the modular multiplayer api routes
app.use("/api", roomRouter);

// ---------------------------------------------------------------------------
// START THE SERVER & VITE INTEGRATION
// ---------------------------------------------------------------------------
async function startServer() {
  // Vite integration middleware for dev environment
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Static assets serving in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

