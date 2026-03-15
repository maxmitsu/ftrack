import { Router } from "express";
import { db, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateAccountBody, DeleteAccountParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(accountsTable);
  res.json(rows.map(r => ({ ...r, bal: Number(r.bal) })));
});

router.post("/", async (req, res) => {
  const body = CreateAccountBody.parse(req.body);
  const [row] = await db.insert(accountsTable).values({
    name: body.name,
    bank: body.bank ?? "",
    bal: String(body.bal),
    color: "#E6F1FB",
  }).returning();
  res.status(201).json({ ...row, bal: Number(row.bal) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteAccountParams.parse({ id: Number(req.params.id) });
  await db.delete(accountsTable).where(eq(accountsTable.id, id));
  res.status(204).end();
});

export default router;
