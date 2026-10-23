import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { INotificationPort } from '../../../../shared/core/ports';
import { MockNotificationAdapter } from '../../../../shared/infrastructure/adapters';
import { ContactRequestService } from '../../application/ContactRequestService';
import { ContactRequestController } from './ContactRequestController';

export function createRequestRouter(prisma: PrismaClient): Router {
  const router = Router();

  const notificationPort: INotificationPort = new MockNotificationAdapter(prisma);
  const contactRequestService = new ContactRequestService(prisma, notificationPort);
  const contactRequestController = new ContactRequestController(contactRequestService);

  router.get('/', contactRequestController.listRequests);
  router.post('/', contactRequestController.createRequest);
  router.patch('/:id/status', contactRequestController.updateRequestStatus);
  router.patch('/:id/cancel', contactRequestController.cancelRequest);

  return router;
}
