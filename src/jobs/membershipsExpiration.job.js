import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { sendCommandToAgent } from "../lib/websocket.server.js";

export function startMembershipExpirationJob() {
  cron.schedule(
    "52 2 * * *",
    async () => {
      console.log("Running memberships expiration job at", new Date().toISOString());
      try {
        const now = new Date();

        await prisma.$transaction(async (tx) => {
          // 🔥 1. Obtener memberships a expirar
          const customerMembershipsToExpire = await tx.customerMembership.findMany({
            where: {
              status: "ACTIVE",
              endDate: {
                lt: now
              } //,
              //expiredCommandSent: false,
            },
            select: {
              id: true,
              customerId: true,
              companyId: true,
              branchId: true
            }
          });

          if (customerMembershipsToExpire.length === 0) {
            return;
          }

          // 🔥 2. Expirar MembershipSale
          const expiredSales = await tx.membershipSale.updateMany({
            where: {
              status: "ACTIVE",
              endDate: {
                lt: now
              }
            },
            data: {
              status: "EXPIRED"
            }
          });

          const branches = await tx.branch.findMany({
            where: {
              companyId: customerMembershipsToExpire[0].companyId
            },
            select: {
              id: true
            }
          });
          const commands = customerMembershipsToExpire.flatMap((membership) =>
            branches.map((branch) => ({
              type: "DELETE_USER",

              payload: {
                customerId: membership.customerId
              },

              companyId: membership.companyId,

              branchId: branch.id,

              status: "PENDING"
            }))
          );

          // 🔥 3. Expirar CustomerMembership
          const expiredCustomerMemberships = await tx.customerMembership.updateMany({
            where: {
              id: {
                in: customerMembershipsToExpire.map((m) => m.id)
              }
            },
            data: {
              status: "EXPIRED"
              //expiredCommandSent: true,
            }
          });

          // 🔥 4. Crear commands
          await tx.command.createMany({
            data: commands
          });
        });
      } catch (error) {}
    },
    {
      timezone: "America/La_Paz"
    }
  );
}
