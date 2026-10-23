import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { RoomService } from '../../application/RoomService';
import { RoomController } from './RoomController';

export function createRoomRouter(prisma: PrismaClient): Router {
  const router = Router();
  const roomService = new RoomService(prisma);
  const roomController = new RoomController(roomService);

  router.get('/', roomController.listRooms);
  router.get('/landlord/:landlordId', roomController.getLandlordRooms);
  router.get('/:id', roomController.getRoomById);
  router.post('/', roomController.createRoom);
  router.patch('/:id/status', roomController.updateRoomStatus);
  router.delete('/:id', roomController.deleteRoom);

  return router;
}
