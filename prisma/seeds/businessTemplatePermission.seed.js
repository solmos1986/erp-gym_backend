import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GYM_PERMISSIONS = [
  "TENANT_DASHBOARD_VIEW",
  "TENANT_BRANCH_VIEW",

  "TENANT_USERS_VIEW",
  "TENANT_USERS_CREATE",
  "TENANT_USERS_EDIT",
  "TENANT_USERS_DELETE",

  "TENANT_ROLES_VIEW",
  "TENANT_ROLES_CREATE",
  "TENANT_ROLES_EDIT",
  "TENANT_ROLES_DELETE",

  "TENANT_PARTNER_VIEW",
  "TENANT_PARTNER_CREATE",
  "TENANT_PARTNER_EDIT",
  "TENANT_PARTNER_DELETE",

  "TENANT_PLANS_VIEW",
  "TENANT_PLANS_CREATE",
  "TENANT_PLANS_EDIT",
  "TENANT_PLANS_DELETE",

  "TENANT_MEMBERSHIP_VIEW",
  "TENANT_MEMBERSHIP_CREATE",
  "TENANT_MEMBERSHIP_EDIT",
  "TENANT_MEMBERSHIP_DELETE",
  "TENANT_MEMBERSHIP_ASSIGN",
  "TENANT_MEMBERSHIP_SYNC",

  "TENANT_DEVICES_VIEW",
  "TENANT_DEVICES_CREATE",
  "TENANT_DEVICES_EDIT",
  "TENANT_DEVICES_DELETE",

  "TENANT_SALES_VIEW",
  "TENANT_SALES_CREATE",
  "TENANT_SALES_EDIT",
  "TENANT_SALES_DELETE",

  "TENANT_CASH_VIEW",
  "TENANT_CASH_CREATE",
  "TENANT_CASH_CLOSE",

  "TENANT_REPORT_VIEW"
];

async function assignPermissions(templateCode, permissionCodes) {
  const template = await prisma.businessTemplate.findUnique({
    where: {
      code: templateCode
    }
  });

  if (!template) {
    throw new Error(`Template ${templateCode} no encontrado`);
  }

  const permissions = await prisma.permission.findMany({
    where: {
      code: {
        in: permissionCodes
      }
    }
  });

  for (const permission of permissions) {
    await prisma.businessTemplatePermission.upsert({
      where: {
        businessTemplateId_permissionId: {
          businessTemplateId: template.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        businessTemplateId: template.id,
        permissionId: permission.id
      }
    });
  }

  console.log(`✅ ${templateCode}: ${permissions.length} permisos asignados`);
}

async function main() {
  await assignPermissions("GYM", GYM_PERMISSIONS);

  console.log("✅ BusinessTemplatePermission completado");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
