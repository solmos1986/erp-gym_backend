export async function getAndLockCommands(companyId, branchId) {
  const commands = await prisma.command.findMany({
    where: {
      companyId,
      branchId,
      OR: [
        { status: "PENDING" },
        {
          status: "ERROR",
          attempts: { lt: 3 }
        }
      ]
    },
    take: 10,
    orderBy: { createdAt: "asc" }
  });

  const now = new Date();

  // 🔥 FILTRO PRO (retry con tiempo)
  const filtered = commands.filter(cmd => {
    if (cmd.attempts >= 3) return false;

    if (!cmd.executedAt) return true;

    const delayMinutes = 2;

    const nextTime =
      new Date(cmd.executedAt).getTime() + delayMinutes * 60 * 1000;

    return nextTime <= now.getTime();
  });

  const ids = filtered.map(c => c.id);

  // 🔒 lock solo los que sí se ejecutarán
  if (ids.length > 0) {
  await prisma.command.updateMany({
    where: {
      id: { in: ids },
      status: { in: ["PENDING", "ERROR"] }, // 🔥 valida estado
      attempts: { lt: 3 } // 🔥 valida intentos
    },
    data: {
      status: "PROCESSING"
    }
  });
}

  return filtered;
}