import express from "express"; // Import the Express framework
import cors from "cors"; // Import CORS to allow cross-origin requests
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv"; // Import dotenv to load environment variables
import { Mongo } from "./database/mongo.js"; // Import custom MongoDB connection module
import usersRouter from "./modules/users/usersRouter.js";
import fieldsRouter from "./modules/fields/fieldsRouter.js";
import fieldOptionsRouter from "./modules/fieldOptions/fieldOptionsRouter.js";
import activitiesRouter from "./modules/activities/activitiesRouter.js";
import contractsRouter from "./modules/contracts/contractsRouter.js";
import plansRouter from "./modules/plans/plansRouter.js";
import menusRouter from "./modules/menus/menusRouter.js";
import attendancesRouter from "./modules/attendances/attendancesRouter.js";
import monthlyFeesRouter from "./modules/monthlyFees/monthlyFeesRouter.js";
import paymentsRouter from "./modules/payments/paymentsRouter.js";
import expensesRouter from "./modules/expenses/expensesRouter.js";
import financialRouter from "./modules/financial/financialRouter.js";
import dashboardRouter from "./modules/dashboard/dashboardRouter.js";
import Expense from "./models/Expense.js";
import { ensureAllExpenses } from "./modules/expenses/expenseGeneration.js";
import MonthlyFee from "./models/MonthlyFee.js";
import { ensureAllActiveMonthlyFees } from "./modules/monthlyFees/monthlyFeeGeneration.js";

// Em ES Modules, precisamos recriar as variáveis __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dizemos ao dotenv para subir duas pastas e procurar o .env na raiz do projeto
config({ path: path.resolve(__dirname, '../../.env') });

// Main function to start the server
async function main() {
  // Puxa a porta do .env ou usa a 3000 como segurança (fallback)
  const port = process.env.API_PORT || 3000;
  // No Docker, o host deve ser '0.0.0.0' para aceitar conexões externas
  const hostname = "0.0.0.0";

  const app = express(); // Create an instance of the Express application

  // Connect to MongoDB using custom module
  const mongoConnection = await Mongo.connect({
    mongoConnectionString: process.env.MONGO_CS,
    mongoDbName: process.env.MONGO_DB_NAME,
  });

  // Print the connection result (success message or error)
  console.log(mongoConnection);

  // Middleware to allow requests from other origins
  app.use(cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://dance-manager-gamma.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }));

  // Middleware to parse JSON bodies in requests
  app.use(express.json());

  // Root route - responds with a welcome message
  app.get("/", (req, res) => {
    res.send({
      success: true,
      statusCode: 200,
      body: "Welcome to Dance Manager - TESTE",
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      status: "ok",
    });
  });

  // Routes
  app.use("/users", usersRouter);
  app.use("/fields", fieldsRouter);
  app.use("/field-options", fieldOptionsRouter);
  app.use("/activities", activitiesRouter);
  app.use("/menus", menusRouter);
  app.use("/contracts", contractsRouter);
  app.use("/plans", plansRouter);
  app.use("/attendances", attendancesRouter);
  app.use("/monthly-fees", monthlyFeesRouter);
  app.use("/payments", paymentsRouter);
  app.use("/expenses", expensesRouter);
  app.use("/financial", financialRouter);
  app.use("/dashboard", dashboardRouter);

  app.use((err, req, res, next) => {
    console.error("🚨 Erro Global Capturado:", err.message);

    res.status(500).json({
      success: false,
      statusCode: 500,
      body: "Erro interno no servidor. A operação não pôde ser concluída."
    });
  });

  /* Geração de competências na inicialização e periodicamente.
     Também ocorre sob demanda em GET /monthly-fees, caso o servidor fique suspenso. */
  await MonthlyFee.init(); // Garante o índice único (contractId + reference).
  const runFeeGeneration = async () => {
    try {
      const count = await ensureAllActiveMonthlyFees();
      if (count) console.log(`[Mensalidades] ${count} novas competências criadas.`);
    } catch (error) {
      console.error("[Mensalidades] Erro na geração automática:", error);
    }
  };
  await runFeeGeneration();
  await Expense.init(); // Índice único para despesas recorrentes.
  const runExpenseGeneration = async () => {
    try {
      const count = await ensureAllExpenses();
      if (count) console.log(`[Despesas] ${count} novas competências geradas.`);
    } catch (error) {
      console.error("[Despesas] Erro na geração automática:", error);
    }
  };
  await runExpenseGeneration();
  const expenseInterval = setInterval(runExpenseGeneration, 6 * 60 * 60 * 1000);
  expenseInterval.unref?.();
  const generationInterval = setInterval(runFeeGeneration, 6 * 60 * 60 * 1000);
  generationInterval.unref?.();

  // Start the server and listen on the defined port
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port: ${port}`);
  });
}

main(); // Run the main function
