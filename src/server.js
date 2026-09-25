import "dotenv/config";
import express from "express";
import bidRoutes from "./routes/bid.routes.js";
import { testConnection } from "./config/database.js";

const app = express();

app.use(express.json());

app.use("/bid", bidRoutes);

app.use((req, res) => res.status(404).json({ error: "NOT_FOUND", message: "Route not found" }));

app.use((err, req, res, next) => {
 
  if (err.status) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details && { details: err.details })
    });
  }
  console.error(err);
  return res.status(500).json({ error: "INTERNAL_ERROR", message: "Internal server error" });
});

const PORT = process.env.PORT || 2424;

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  await testConnection();
});
