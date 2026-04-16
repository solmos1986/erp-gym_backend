import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { sendCommandToAgent } from '../lib/websocket.server.js';

export function startMembershipExpirationJob() {
  

cron.schedule('00 3 * * *', async () => {
  

  try {
    const now = new Date();

    await prisma.$transaction(async (tx) => {

      // 🔥 1. Obtener memberships a expirar
      const membershipsToExpire = await tx.customerMembership.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            lt: now,
          }//,
          //expiredCommandSent: false,
        },
        select: {
          id: true,
          customerId: true,
          companyId: true,
          branchId: true
        },
      });

      if (membershipsToExpire.length === 0) {
        
        return;
      }

      // 🔥 2. Expirar MembershipSale
      const expiredSales = await tx.membershipSale.updateMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            lt: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      // 🔥 3. Expirar CustomerMembership
      const expiredMemberships = await tx.customerMembership.updateMany({
        where: {
          id: {
            in: membershipsToExpire.map(m => m.id),
          },
        },
        data: {
          status: 'EXPIRED',
          //expiredCommandSent: true,
        },
      });

      // 🔥 4. Crear commands
      await tx.command.createMany({
        data: membershipsToExpire.map(m => ({
          type: 'DELETE_USER',
          payload: {
            customerId: m.customerId,
          },
          companyId: m.companyId,
          branchId: m.branchId,
          status: 'PENDING',
        })),
      });

       const notify='SYNC';
    // Enviar notificacion al WebSocket para sincronizar la cara del cliente
    sendCommandToAgent(companyId, branchId, notify);

      
      
      
    });

  } catch (error) {
    
  }
}, {
  timezone: 'America/La_Paz',
});
}