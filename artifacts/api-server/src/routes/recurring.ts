import { Router } from "express";
import { db, recurringTable, accountsTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateRecurringBody, DeleteRecurringParams, PayRecurringParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(recurringTable);
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

router.post("/", async (req, res) => {
  const body = CreateRecurringBody.parse(req.body);
  const [row] = await db.insert(recurringTable).values({
    name: body.name,
    amount: String(body.amount),
    dayOfMonth: body.dayOfMonth,
    accountId: body.accountId ?? null,
  }).returning();
  res.status(201).json({ ...row, amount: Number(row.amount) });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteRecurringParams.parse({ id: Number(req.params.id) });
  await db.delete(recurringTable).where(eq(recurringTable.id, id));
  res.status(204).end();
});

router.post("/:id/pay", async (req, res) => {
  const { id } = PayRecurringParams.parse({ id: Number(req.params.id) });
  const [payment] = await db.select().from(recurringTable).where(eq(recurringTable.id, id));
  if (!payment) { res.status(404).json({ error: "Not found" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const [tx] = await db.insert(transactionsTable).values({
    name: payment.name,
    cat: "Pago fijo",
    amount: String(-Math.abs(Number(payment.amount))),
    type: "gasto",
    date: today,
    accountId: payment.accountId ?? 0,
  }).returning();

  if (payment.accountId) {
    const [acc] = await db.select().from(accountsTable).where(eq(accountsTable.id, payment.accountId));
    if (acc) {
      const newBal = Number(acc.bal) - Math.abs(Number(payment.amount));
      await db.update(accountsTable).set({ bal: String(newBal) }).where(eq(accountsTable.id, payment.accountId));
    }
  }

  res.status(201).json({ ...tx, amount: Number(tx.amount) });
});

export default router;
