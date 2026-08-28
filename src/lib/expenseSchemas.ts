import { z } from "zod";

export const expenseCoreFields = {
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  category: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().datetime().optional(),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]).default("EQUAL"),
};

export const expenseWithGroupMemberIdsSchema = z.object({
  ...expenseCoreFields,
  payers: z.array(z.object({ groupMemberId: z.string().uuid(), value: z.number() })).min(1),
  memberIds: z.array(z.string().uuid()).optional(),
  splits: z.array(z.object({ groupMemberId: z.string().uuid(), value: z.number() })).optional(),
});
