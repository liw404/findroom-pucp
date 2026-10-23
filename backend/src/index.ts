import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createAuthRouter } from './modules/auth/infrastructure/http/auth.routes';
import { createRoomRouter } from './modules/rooms/infrastructure/http/room.routes';
import { createRequestRouter } from './modules/requests/infrastructure/http/request.routes';
import { createReviewRouter } from './modules/reviews/infrastructure/http/review.routes';
import { createContractRouter } from './modules/contracts/infrastructure/http/contract.routes';

export const app = express();
export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Rutas Modulares bajo Arquitectura Hexagonal
app.use('/api/auth', createAuthRouter(prisma));
app.use('/api/rooms', createRoomRouter(prisma));
app.use('/api/requests', createRequestRouter(prisma));
app.use('/api/reviews', createReviewRouter(prisma));
app.use('/api/contracts', createContractRouter(prisma));

app.get('/api/notifications', async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.status(200).json({ status: 'success', count: logs.length, logs });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Error consultando NotificationLog',
    });
  }
});

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      service: 'FindRoom Backend API',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'FindRoom Backend API',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const PORT = Number(process.env.PORT) || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 FindRoom Backend ejecutándose en http://localhost:${PORT}`);
  });
}
