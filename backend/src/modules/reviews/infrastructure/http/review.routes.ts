import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { INotificationPort } from '../../../../shared/core/ports';
import { MockNotificationAdapter } from '../../../../shared/infrastructure/adapters';
import { ReviewService } from '../../application/ReviewService';
import { ReviewController } from './ReviewController';

export function createReviewRouter(prisma: PrismaClient): Router {
  const router = Router();
  const notificationPort: INotificationPort = new MockNotificationAdapter(prisma);
  const reviewService = new ReviewService(prisma, notificationPort);
  const reviewController = new ReviewController(reviewService);

  router.get('/', reviewController.listReviews);
  router.post('/', reviewController.createReview);

  return router;
}
