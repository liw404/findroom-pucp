import { PrismaClient } from '@prisma/client';
import { INotificationPort, NotificationPayload } from '../../core/ports/INotificationPort';

export class MockNotificationAdapter implements INotificationPort {
  constructor(private readonly prisma: PrismaClient) {}

  public async sendNotification(payload: NotificationPayload): Promise<void> {
    console.log(
      `📧 [MockNotificationAdapter] (${payload.eventType}) -> Para: ${payload.recipientEmail} | Asunto: ${payload.subject}`
    );

    await this.prisma.notificationLog.create({
      data: {
        recipientEmail: payload.recipientEmail,
        subject: payload.subject,
        message: payload.message,
        eventType: payload.eventType,
      },
    });
  }
}
