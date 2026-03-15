import { pgTable, serial, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  saved: numeric("saved", { precision: 12, scale: 2 }).notNull().default("0"),
  target: numeric("target", { precision: 12, scale: 2 }).notNull(),
  color: text("color").notNull().default("#1D9E75"),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
