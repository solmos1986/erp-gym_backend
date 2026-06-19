export const createSalePayments = async ({
  tx,
  companyId,
  branchId,
  userId,
  cashRegisterId,
  saleId,
  referenceType,
  description,
  payments
}) => {
  const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  // =========================
  // 💰 CASH MOVEMENT
  // =========================
  const cashMovement = await tx.cashMovement.create({
    data: {
      companyId,
      branchId,

      cashRegisterId,

      type: "INCOME",

      amount: totalAmount,

      description,

      referenceType,

      referenceId: saleId,

      createdById: userId
    }
  });

  // =========================
  // 💳 PAYMENTS
  // =========================
  for (const payment of payments) {
    await tx.payment.create({
      data: {
        companyId,
        branchId,

        cashMovementId: cashMovement.id,

        saleId,

        method: payment.method,

        amount: payment.amount,

        reference: payment.reference || null
      }
    });
  }

  return cashMovement;
};
