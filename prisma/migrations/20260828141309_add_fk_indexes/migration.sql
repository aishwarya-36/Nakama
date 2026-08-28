-- CreateIndex
CREATE INDEX "Contact_ownerId_idx" ON "Contact"("ownerId");

-- CreateIndex
CREATE INDEX "Expense_groupId_idx" ON "Expense"("groupId");

-- CreateIndex
CREATE INDEX "ExpenseHistory_expenseId_idx" ON "ExpenseHistory"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseHistory_actorUserId_idx" ON "ExpenseHistory"("actorUserId");

-- CreateIndex
CREATE INDEX "ExpensePayment_expenseId_idx" ON "ExpensePayment"("expenseId");

-- CreateIndex
CREATE INDEX "ExpensePayment_groupMemberId_idx" ON "ExpensePayment"("groupMemberId");

-- CreateIndex
CREATE INDEX "ExpenseSplit_groupMemberId_idx" ON "ExpenseSplit"("groupMemberId");

-- CreateIndex
CREATE INDEX "Group_createdById_idx" ON "Group"("createdById");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "GroupMember_contactId_idx" ON "GroupMember"("contactId");

-- CreateIndex
CREATE INDEX "Settlement_groupId_idx" ON "Settlement"("groupId");

-- CreateIndex
CREATE INDEX "Settlement_fromMemberId_idx" ON "Settlement"("fromMemberId");

-- CreateIndex
CREATE INDEX "Settlement_toMemberId_idx" ON "Settlement"("toMemberId");

-- CreateIndex
CREATE INDEX "Settlement_recordedById_idx" ON "Settlement"("recordedById");
