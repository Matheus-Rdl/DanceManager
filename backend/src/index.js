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

// ==========================================
// ES MODULES
// ==========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// .ENV LOCAL
// ==========================================

config({
  path: path.resolve(__dirname, "../../.env"),
});

// ==========================================
// MAIN
// ==========================================

async function main() {
  const port = process.env.PORT || process.env.API_PORT || 3000;
  const hostname = "0.0.0.0";

  const app = express();

  // ==========================================
  // CORS
  // ==========================================

  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://dance-manager-gamma.vercel.app",
  ];

  const corsOptions = {
    origin: function (origin, callback) {
      // Permite requisições sem Origin
      // (Postman, curl, comunicação interna etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS bloqueado:", origin);

      return callback(new Error("Origin não permitida pelo CORS"));
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    optionsSuccessStatus: 204,
  };

  // Middleware CORS
  app.use(cors(corsOptions));

  // Responde explicitamente ao preflight OPTIONS
  app.options("*", cors(corsOptions));

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

// ==========================================
// START
// ==========================================

main().catch((error) => {
  console.error("❌ Erro ao iniciar servidor:", error);
  process.exit(1);
});