import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const gym = await prisma.businessTemplate.findUnique({
    where: {
      code: "GYM"
    }
  });

  if (!gym) {
    throw new Error("Template GYM no encontrado");
  }

  const roles = ["OWNER", "ADMIN", "CASHIER"];

  for (const roleName of roles) {
    const existing = await prisma.roleTemplate.findFirst({
      where: {
        businessTemplateId: gym.id,
        name: roleName
      }
    });

    if (!existing) {
      await prisma.roleTemplate.create({
        data: {
          businessTemplateId: gym.id,
          name: roleName
        }
      });

      console.log(`✅ ${roleName} creado`);
    }
  }

  console.log("✅ RoleTemplate completado");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
