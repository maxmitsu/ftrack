import { Router } from "express";
import { db, budgetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateBudgetBody, DeleteBudgetParams } from "@workspace/api-zod";

const CAT_COLORS = ['#1D9E75','#378ADD','#D85A30','#BA7517','#D4537E','#888780','#7F77DD','#E24B4A'];

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(budgetsTable);
  res.json(rows.map(r => ({ ...r, limit: Number(r.limit) })));
});

router.post("/", async (req, res) => {
  const body = CreateBudgetBody.parse(req.body);
  const count = await db.select().from(budgetsTable);
  const color = body.color || CAT_COLORS[count.length % CAT_COLORS.length];
  const [row] = await db.insert(budgetsTable).values({
    cat: body.cat,
    limit: String(body.limit),
    color,
  }).returning();
  res.status(201).json({ ...row, limit: Number(row.limit) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteBudgetParams.parse({ id: Number(req.params.id) });
  await db.delete(budgetsTable).where(eq(budgetsTable.id, id));
  res.status(204).end();
});

export default router;
