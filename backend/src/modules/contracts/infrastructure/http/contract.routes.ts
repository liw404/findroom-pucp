import { Router, Request, Response } from 'express';
import { ContractStatus, PrismaClient, RoomStatus } from '@prisma/client';

export function createContractRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const studentId = req.query.studentId as string | undefined;
      const landlordId = req.query.landlordId as string | undefined;
      const roomId = req.query.roomId as string | undefined;

      const contracts = await prisma.contract.findMany({
        where: {
          ...(studentId ? { studentId } : {}),
          ...(landlordId ? { landlordId } : {}),
          ...(roomId ? { roomId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          room: true,
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              codigoPucp: true,
              facultad: true,
            },
          },
          landlord: {
            select: {
              id: true,
              fullName: true,
              email: true,
              averageRating: true,
              totalReviews: true,
            },
          },
          review: true,
        },
      });

      res.status(200).json({
        status: 'success',
        count: contracts.length,
        contracts,
      });
    } catch (error) {
      console.error('❌ [ContractRouter] Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener contratos.',
      });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { roomId, studentId, landlordId, monthlyRent, notes, markRoomRented } =
        req.body;

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) {
        res.status(404).json({
          status: 'error',
          message: 'La habitación especificada no existe.',
        });
        return;
      }

      const resolvedLandlordId = landlordId || room.landlordId;

      const contract = await prisma.contract.create({
        data: {
          roomId,
          studentId,
          landlordId: resolvedLandlordId,
          monthlyRent: Number(monthlyRent || room.monthlyPrice),
          status: ContractStatus.ACTIVO,
          notes: notes || 'Acuerdo de alquiler registrado en FindRoom.',
        },
      });

      if (markRoomRented) {
        await prisma.room.update({
          where: { id: roomId },
          data: { status: RoomStatus.ALQUILADO },
        });
      }

      res.status(201).json({
        status: 'success',
        message: 'Contrato de alquiler registrado exitosamente.',
        contract,
      });
    } catch (error) {
      console.error('❌ [ContractRouter] Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al registrar contrato.',
      });
    }
  });

  return router;
}
