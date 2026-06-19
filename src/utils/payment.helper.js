export const createCashMovementPayments = async ({
  tx,

  companyId,
  branchId,

  userId,

  cashRegisterId,

  movementType,

  referenceType,
  referenceId,

  description,

  payments
}) => {
  console.log("createCashMovementPayments - payments:");
  const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  const cashMovement = await tx.cashMovement.create({
    data: {
      companyId,
      branchId,

      cashRegisterId,

      type: movementType,

      amount: totalAmount,

      description,

      referenceType,

      referenceId,

      createdById: userId
    }
  });

  for (const payment of payments) {
    await tx.payment.create({
      data: {
        companyId,
        branchId,

        cashMovementId: cashMovement.id,

        method: payment.method,

        amount: payment.amount,

        reference: payment.reference || null
      }
    });
  }

  return cashMovement;
};
