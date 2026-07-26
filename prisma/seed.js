import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // =========================
  // 👤 ROLES
  // =========================
  const roles = [
    { name: "SYSTEM_ADMIN", scope: "SYSTEM" },
    { name: "SYSTEM_MONITOR", scope: "SYSTEM" },
    { name: "OWNER", scope: "TENANT" },
    { name: "EMPLOYEE", scope: "TENANT" }
  ];

  for (const role of roles) {
    // 🔍 Buscar si ya existe
    const existing = await prisma.role.findFirst({
      where: {
        name: role.name,
        scope: role.scope,
        companyId: null // 🔥 solo roles base (globales)
      }
    });

    // 🚀 Crear solo si no existe
    if (!existing) {
      await prisma.role.create({
        data: {
          name: role.name,
          scope: role.scope,
          companyId: null
        }
      });
    }
  }

  // =========================
  // 🔐 PERMISSIONS SYSTEM
  // =========================
  const systemPermissions = [
    {
      code: "SYSTEM_COMPANIES_VIEW",
      description: "Ver empresas",
      scope: "SYSTEM"
    },
    {
      code: "SYSTEM_COMPANIES_CREATE",
      description: "Crear empresas",
      scope: "SYSTEM"
    },
    {
      code: "SYSTEM_COMPANIES_EDIT",
      description: "Editar empresas",
      scope: "SYSTEM"
    },
    {
      code: "SYSTEM_COMPANIES_DELETE",
      description: "Eliminar empresas",
      scope: "SYSTEM"
    },
    {
      code: "SYSTEM_BRANCH_VIEW",
      description: "Ver sucursales",
      scope: "SYSTEM"
    },
    {
      code: "SYSTEM_BRANCH_CREATE",
      description: "Crear sucursales",
      scope: "SYSTEM"
    },
    {
      code: "SYSTEM_BRANCH_EDIT",
      description: "Editar sucursales",
      scope: "SYSTEM"
    },
    {
      code: "SYSTEM_BRANCH_DELETE",
      description: "Eliminar sucursales",
      scope: "SYSTEM"
    }
  ];

  for (const perm of systemPermissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        description: perm.description,
        scope: perm.scope,
        isActive: true // 🔥 reactivar si estaba apagado
      },
      create: perm
    });
  }

  // =========================
  // 🔐 PERMISSIONS TENANT
  // =========================
  const tenantPermissions = [
    {
      code: "TENANT_USERS_VIEW",
      description: "Ver usuarios",
      scope: "TENANT"
    },
    {
      code: "TENANT_USERS_CREATE",
      description: "Crear usuarios",
      scope: "TENANT"
    },
    {
      code: "TENANT_USERS_EDIT",
      description: "Editar usuarios",
      scope: "TENANT"
    },
    {
      code: "TENANT_USERS_DELETE",
      description: "Eliminar usuarios",
      scope: "TENANT"
    },
    {
      code: "TENANT_ROLES_VIEW",
      description: "Ver roles",
      scope: "TENANT"
    },
    {
      code: "TENANT_ROLES_CREATE",
      description: "Crear roles",
      scope: "TENANT"
    },
    {
      code: "TENANT_ROLES_EDIT",
      description: "Editar roles",
      scope: "TENANT"
    },
    {
      code: "TENANT_ROLES_DELETE",
      description: "Eliminar roles",
      scope: "TENANT"
    },
    {
      code: "TENANT_PERMISSIONS_VIEW",
      description: "Ver permisos",
      scope: "TENANT"
    },
    {
      code: "TENANT_BRANCH_VIEW",
      description: "Ver sucursales",
      scope: "TENANT"
    },
    {
      code: "TENANT_SALES_VIEW",
      description: "Ver ventas",
      scope: "TENANT"
    },
    {
      code: "TENANT_SALES_CREATE",
      description: "Crear ventas",
      scope: "TENANT"
    },
    {
      code: "TENANT_SALES_EDIT",
      description: "Editar ventas",
      scope: "TENANT"
    },
    {
      code: "TENANT_SALES_DELETE",
      description: "Eliminar ventas",
      scope: "TENANT"
    },
    {
      code: "TENANT_PLANS_VIEW",
      description: "Ver planes",
      scope: "TENANT"
    },
    {
      code: "TENANT_PLANS_CREATE",
      description: "Crear planes",
      scope: "TENANT"
    },
    {
      code: "TENANT_PLANS_EDIT",
      description: "Editar planes",
      scope: "TENANT"
    },
    {
      code: "TENANT_PLANS_DELETE",
      description: "Eliminar planes",
      scope: "TENANT"
    },
    {
      code: "TENANT_PARTNER_VIEW",
      description: "Ver socios",
      scope: "TENANT"
    },
    {
      code: "TENANT_PARTNER_CREATE",
      description: "Crear socios",
      scope: "TENANT"
    },
    {
      code: "TENANT_PARTNER_EDIT",
      description: "Editar socios",
      scope: "TENANT"
    },
    {
      code: "TENANT_PARTNER_DELETE",
      description: "Eliminar socios",
      scope: "TENANT"
    },
    {
      code: "TENANT_MEMBERSHIP_VIEW",
      description: "Ver membresías",
      scope: "TENANT"
    },
    {
      code: "TENANT_MEMBERSHIP_CREATE",
      description: "Crear membresías",
      scope: "TENANT"
    },
    {
      code: "TENANT_MEMBERSHIP_EDIT",
      description: "Editar membresías",
      scope: "TENANT"
    },
    {
      code: "TENANT_MEMBERSHIP_DELETE",
      description: "Eliminar membresías",
      scope: "TENANT"
    },
    {
      code: "TENANT_MEMBERSHIP_ASSIGN",
      description: "Asignar membresías",
      scope: "TENANT"
    },
    {
      code: "TENANT_MEMBERSHIP_SYNC",
      description: "Sincronizar membresías",
      scope: "TENANT"
    },
    {
      code: "TENANT_DEVICES_VIEW",
      description: "Ver dispositivos",
      scope: "TENANT"
    },
    {
      code: "TENANT_DEVICES_CREATE",
      description: "Crear dispositivos",
      scope: "TENANT"
    },
    {
      code: "TENANT_DEVICES_EDIT",
      description: "Editar dispositivos",
      scope: "TENANT"
    },
    {
      code: "TENANT_DEVICES_DELETE",
      description: "Eliminar dispositivos",
      scope: "TENANT"
    },
    { code: "TENANT_DASHBOARD_VIEW", description: "Ver dashboard", scope: "TENANT" },
    {
      code: "TENANT_PRODUCT_CATEGORIES_VIEW",
      description: "Ver categorías de productos",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCT_CATEGORIES_CREATE",
      description: "Crear categorías de productos",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCT_CATEGORIES_EDIT",
      description: "Editar categorías de productos",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCT_CATEGORIES_DELETE",
      description: "Eliminar categorías de productos",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCTS_VIEW",
      description: "Ver productos",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCTS_CREATE",
      description: "Crear productos",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCTS_EDIT",
      description: "Editar productos",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCTS_DELETE",
      description: "Eliminar productos",
      scope: "TENANT"
    },
    {
      code: "TENANT_INVENTORY_VIEW",
      description: "Ver movimientos de inventario",
      scope: "TENANT"
    },
    {
      code: "TENANT_INVENTORY_CREATE",
      description: "Registrar movimientos de inventario",
      scope: "TENANT"
    },
    { code: "TENANT_CASH_VIEW", description: "Ver cajas", scope: "TENANT" },
    { code: "TENANT_CASH_CREATE", description: "Abrir caja", scope: "TENANT" },
    { code: "TENANT_CASH_CLOSE", description: "Cerrar caja", scope: "TENANT" },
    {
      code: "TENANT_PURCHASES_VIEW",
      description: "Ver compras",
      scope: "TENANT"
    },
    {
      code: "TENANT_PURCHASES_CREATE",
      description: "Crear compras",
      scope: "TENANT"
    },
    {
      code: "TENANT_PURCHASES_EDIT",
      description: "Editar compras",
      scope: "TENANT"
    },
    {
      code: "TENANT_PURCHASES_DELETE",
      description: "Eliminar compras",
      scope: "TENANT"
    },
    {
      code: "TENANT_REPORT_VIEW",
      description: "Ver reportes",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCTION_VIEW",
      description: "Ver órdenes de producción",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCTION_CREATE",
      description: "Crear órdenes de producción",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCTION_EDIT",
      description: "Editar órdenes de producción",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCTION_DELETE",
      description: "Cancelar órdenes de producción",
      scope: "TENANT"
    },
    {
      code: "TENANT_PRODUCTION_EXECUTE",
      description: "Iniciar y finalizar órdenes de producción",
      scope: "TENANT"
    }
  ];

  for (const perm of tenantPermissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        description: perm.description,
        scope: perm.scope,
        isActive: true // 🔥 reactivar si estaba apagado
      },
      create: perm
    });
  }

  // =========================
  // 🔎 ROLE SYSTEM_ADMIN
  // =========================
  const systemAdminRole = await prisma.role.findFirst({
    where: {
      name: "SYSTEM_ADMIN",
      scope: "SYSTEM",
      companyId: null
    }
  });

  if (!systemAdminRole) {
    throw new Error("SYSTEM_ADMIN role no encontrado");
  }
  // =========================
  // 🔎 ROLE SYSTEM MONITOR
  // =========================
  const systemMonitorRole = await prisma.role.findFirst({
    where: {
      name: "SYSTEM_MONITOR",
      scope: "SYSTEM",
      companyId: null
    }
  });

  if (!systemMonitorRole) {
    throw new Error("SYSTEM_MONITOR role no encontrado");
  }

  // =========================
  // 🔗 ASIGNAR PERMISOS A SYSTEM_ADMIN
  // =========================
  const systemPermissionsList = await prisma.permission.findMany({
    where: { scope: "SYSTEM", isActive: true }
  });

  for (const perm of systemPermissionsList) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: systemAdminRole.id,
          permissionId: perm.id
        }
      },
      update: {},
      create: {
        roleId: systemAdminRole.id,
        permissionId: perm.id
      }
    });
  }

  // =========================
  // 👤 COMPANY SYSTEM ADMIN
  // =========================
  const systemCompany = await prisma.company.upsert({
    where: { name: "SYSTEM" },
    update: {},
    create: {
      name: "SYSTEM"
    }
  });
  
  //==========================
  // BRANCH SYSTEM
  //==========================
  const systemBranch = await prisma.branch.upsert({
    where: { name_companyId: { name: "MAIN", companyId: systemCompany.id } },
    update: {},
    create: {
      name: "MAIN",
      companyId: systemCompany.id
    }
  });
  // =========================
  // 👤 USER SYSTEM ADMIN
  // =========================
  const adminEmail = "admin@erp.com";
  const passwordHash = await bcrypt.hash("4plus.654", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: passwordHash // 🔥 opcional: actualiza password siempre
    },
    create: {
      email: adminEmail,
      password: passwordHash,
      fullName: "Super Admin",
      companyId: systemCompany.id, // 🔥 SOLUCIÓN
      branchId: systemBranch.id // ⚠️ si branch es obligatorio lo vemos abajo
    }
  });

  // asignar rol si no existe
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: adminUser.id,
      roleId: systemAdminRole.id,
      companyId: null
    }
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: systemAdminRole.id,
        companyId: null
      }
    });
  }
  // =========================
  // 👤 USER SYSTEM MONITOR
  // =========================

  const monitorEmail = "monitor@erp.com";
  const monitorPasswordHash = await bcrypt.hash("monitor.2026", 10);

  const monitorUser = await prisma.user.upsert({
    where: { email: monitorEmail },
    update: {
      password: monitorPasswordHash
    },
    create: {
      email: monitorEmail,
      password: monitorPasswordHash,
      fullName: "ERP Monitor",
      companyId: systemCompany.id,
      branchId: systemBranch.id
    }
  });
  const existingMonitorRole = await prisma.userRole.findFirst({
    where: {
      userId: monitorUser.id,
      roleId: systemMonitorRole.id,
      companyId: null
    }
  });

  if (!existingMonitorRole) {
    await prisma.userRole.create({
      data: {
        userId: monitorUser.id,
        roleId: systemMonitorRole.id,
        companyId: null
      }
    });
  }
}

main()
  .then(() => {
    console.log("✅ Seed ejecutado correctamente");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
