import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EXCLUDED = ["TENANT_ROLES_CREATE", "TENANT_ROLES_EDIT", "TENANT_ROLES_DELETE", "TENANT_PERMISSIONS_VIEW"];

const CASHIER_PERMISSIONS = [
  "TENANT_DASHBOARD_VIEW",

  "TENANT_PARTNER_VIEW",
  "TENANT_PARTNER_CREATE",
  "TENANT_PARTNER_EDIT",

  "TENANT_MEMBERSHIP_VIEW",
  "TENANT_MEMBERSHIP_CREATE",
  "TENANT_MEMBERSHIP_ASSIGN",

  "TENANT_SALES_VIEW",
  "TENANT_SALES_CREATE",

  "TENANT_CASH_VIEW",
  "TENANT_CASH_CREATE"
];

async function assignRolePermissions(roleName, permissionCodes) {
  const role = await prisma.roleTemplate.findFirst({
    where: {
      name: roleName,
      businessTemplate: {
        code: "GYM"
      }
    }
  });

  if (!role) {
    throw new Error(`RoleTemplate ${roleName} no encontrado`);
  }

  const permissions = await prisma.permission.findMany({
    where: {
      code: {
        in: permissionCodes
      }
    }
  });

  for (const permission of permissions) {
    await prisma.roleTemplatePermission.upsert({
      where: {
        roleTemplateId_permissionId: {
          roleTemplateId: role.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleTemplateId: role.id,
        permissionId: permission.id
      }
    });
  }

  console.log(`✅ ${roleName}: ${permissions.length} permisos`);
}

async function main() {
  const gym = await prisma.businessTemplate.findUnique({
    where: {
      code: "GYM"
    }
  });

  const gymPermissions = await prisma.businessTemplatePermission.findMany({
    where: {
      businessTemplateId: gym.id
    },
    include: {
      permission: true
    }
  });

  const allGymPermissions = gymPermissions.map((p) => p.permission.code);

  await assignRolePermissions("OWNER", allGymPermissions);

  await assignRolePermissions(
    "ADMIN",
    allGymPermissions.filter((code) => !ADMIN_EXCLUDED.includes(code))
  );

  await assignRolePermissions("CASHIER", CASHIER_PERMISSIONS);

  console.log("✅ RoleTemplatePermission completado");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
