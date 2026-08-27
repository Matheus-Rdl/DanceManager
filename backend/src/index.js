import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

import { Mongo } from "./database/mongo.js";
import usersRouter from "./modules/users/usersRouter.js";
import fieldsRouter from "./modules/fields/fieldsRouter.js";
import menusRouter from "./modules/menus/menusRouter.js";
import activitiesRouter from "./modules/activities/activitiesRouter.js";

// ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env local
config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  const port = process.env.PORT || process.env.API_PORT || 3000;
  const hostname = "0.0.0.0";

  const app = express();

  // ==========================================
  // CORS
  // ==========================================

  const corsOptions = {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://dance-manager-gamma.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };

  app.use(cors(corsOptions));

  // ==========================================
  // MIDDLEWARES
  // ==========================================

  app.use(express.json());

  // ==========================================
  // TESTE
  // ==========================================

  app.get("/", (req, res) => {
    res.json({
      success: true,
      statusCode: 200,
      body: "Welcome to DanceManager - TESTE",
    });
  });

  // ==========================================
  // MONGODB
  // ==========================================

  const mongoConnection = await Mongo.connect({
    mongoConnectionString: process.env.MONGO_CS,
    mongoDbName: process.env.MONGO_DB_NAME,
  });

  console.log("MongoDB:", mongoConnection);

  // ==========================================
  // ROTAS
  // ==========================================

  app.use("/users", usersRouter);
  app.use("/fields", fieldsRouter);
  app.use("/menus", menusRouter);
  app.use("/activities", activitiesRouter);

  // ==========================================
  // ERRO GLOBAL
  // ==========================================

  app.use((err, req, res, next) => {
    console.error("🚨 Erro Global Capturado:", err);

    res.status(500).json({
      success: false,
      statusCode: 500,
      body: "Erro interno no servidor. A operação não pôde ser concluída.",
    });
  });

  // ==========================================
  // SERVER
  // ==========================================

  app.listen(port, hostname, () => {
    console.log(`🚀 Server running on ${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error("❌ Erro ao iniciar servidor:", error);
  process.exit(1);
});