import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DeleteCategoryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(categoriesTable);
  res.json(rows);
});

router.post("/", async (req, res) => {
  const body = req.body as { name?: string; icon?: string | null; color?: string | null };
  if (!body.name) { res.status(400).json({ error: "name required" }); return; }
  const [row] = await db.insert(categoriesTable).values({
    name: body.name,
    icon: body.icon ?? null,
    color: body.color ?? null,
  }).returning();
  res.status(201).json(row);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteCategoryParams.parse({ id: Number(req.params.id) });
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).end();
});

export default router;
