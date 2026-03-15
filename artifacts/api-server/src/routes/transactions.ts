import { Router } from "express";
import { db, transactionsTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateTransactionBody,
  UpdateTransactionBody,
  UpdateTransactionParams,
  DeleteTransactionParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(transactionsTable).orderBy(transactionsTable.createdAt);
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

router.post("/", async (req, res) => {
  const body = CreateTransactionBody.parse(req.body);
  const type = Number(body.amount) > 0 ? "ingreso" : "gasto";
  const [row] = await db.insert(transactionsTable).values({
    name: body.name,
    cat: body.cat,
    amount: String(body.amount),
    type: body.type ?? type,
    date: body.date,
    accountId: body.accountId ?? 0,
  }).returning();

  if (body.accountId) {
    const [acc] = await db.select().from(accountsTable).where(eq(accountsTable.id, body.accountId));
    if (acc) {
      const newBal = Number(acc.bal) + Number(body.amount);
      await db.update(accountsTable).set({ bal: String(newBal) }).where(eq(accountsTable.id, body.accountId));
    }
  }

  res.status(201).json({ ...row, amount: Number(row.amount) });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateTransactionParams.parse({ id: Number(req.params.id) });
  const body = UpdateTransactionBody.parse(req.body);
  const type = Number(body.amount) > 0 ? "ingreso" : "gasto";
  const [row] = await db.update(transactionsTable).set({
    name: body.name,
    cat: body.cat,
    amount: String(body.amount),
    type: body.type ?? type,
    date: body.date,
  }).where(eq(transactionsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, amount: Number(row.amount) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteTransactionParams.parse({ id: Number(req.params.id) });
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
  res.status(204).end();
});

export default router;
