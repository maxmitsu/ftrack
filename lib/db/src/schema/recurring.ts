import { pgTable, serial, text, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recurringTable = pgTable("recurring_payments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  dayOfMonth: integer("day_of_month").notNull(),
  accountId: integer("account_id"),
});

export const insertRecurringSchema = createInsertSchema(recurringTable).omit({ id: true });
export type InsertRecurring = z.infer<typeof insertRecurringSchema>;
export type Recurring = typeof recurringTable.$inferSelect;
