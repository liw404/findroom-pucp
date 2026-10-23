import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  IReniecPort,
  ISunarpPort,
  ISsoPort,
  INotificationPort,
} from '../../../../shared/core/ports';
import {
  MockReniecAdapter,
  MockSunarpAdapter,
  MockSsoAdapter,
  MockNotificationAdapter,
} from '../../../../shared/infrastructure/adapters';
import { AuthService } from '../../application/AuthService';
import { AuthController } from './AuthController';

export function createAuthRouter(prisma: PrismaClient): Router {
  const router = Router();

  // Inyección de dependencias hacia los puertos de dominio (Arquitectura Hexagonal)
  const reniecPort: IReniecPort = new MockReniecAdapter();
  const sunarpPort: ISunarpPort = new MockSunarpAdapter();
  const ssoPort: ISsoPort = new MockSsoAdapter();
  const notificationPort: INotificationPort = new MockNotificationAdapter(prisma);

  const authService = new AuthService(
    prisma,
    reniecPort,
    sunarpPort,
    ssoPort,
    notificationPort
  );
  const authController = new AuthController(authService);

  router.post('/register-landlord', authController.registerLandlord);
  router.post('/sso-student', authController.ssoStudent);
  router.post('/login', authController.loginLandlord);
  router.post('/login-landlord', authController.loginLandlord);
  router.get('/users', authController.listUsers);

  return router;
}
