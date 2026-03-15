import { Router } from "express";
import { db, goalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateGoalBody, UpdateGoalParams, UpdateGoalBody, DeleteGoalParams } from "@workspace/api-zod";

const CAT_COLORS = ['#1D9E75','#378ADD','#D85A30','#BA7517','#D4537E','#888780','#7F77DD','#E24B4A'];

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(goalsTable);
  res.json(rows.map(r => ({ ...r, saved: Number(r.saved), target: Number(r.target) })));
});

router.post("/", async (req, res) => {
  const body = CreateGoalBody.parse(req.body);
  const count = await db.select().from(goalsTable);
  const color = body.color || CAT_COLORS[count.length % CAT_COLORS.length];
  const [row] = await db.insert(goalsTable).values({
    name: body.name,
    saved: String(body.saved ?? 0),
    target: String(body.target),
    color,
  }).returning();
  res.status(201).json({ ...row, saved: Number(row.saved), target: Number(row.target) });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateGoalParams.parse({ id: Number(req.params.id) });
  const body = UpdateGoalBody.parse(req.body);
  const [row] = await db.update(goalsTable).set({
    name: body.name,
    saved: String(body.saved ?? 0),
    target: String(body.target),
    ...(body.color ? { color: body.color } : {}),
  }).where(eq(goalsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, saved: Number(row.saved), target: Number(row.target) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteGoalParams.parse({ id: Number(req.params.id) });
  await db.delete(goalsTable).where(eq(goalsTable.id, id));
  res.status(204).end();
});

export default router;
