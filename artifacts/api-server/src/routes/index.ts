import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transactionsRouter from "./transactions";
import budgetsRouter from "./budgets";
import accountsRouter from "./accounts";
import goalsRouter from "./goals";
import recurringRouter from "./recurring";
import categoriesRouter from "./categories";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/transactions", transactionsRouter);
router.use("/budgets", budgetsRouter);
router.use("/accounts", accountsRouter);
router.use("/goals", goalsRouter);
router.use("/recurring", recurringRouter);
router.use("/categories", categoriesRouter);

export default router;
