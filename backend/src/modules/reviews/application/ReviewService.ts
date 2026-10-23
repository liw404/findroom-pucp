import { ContractStatus, PrismaClient } from '@prisma/client';
import { INotificationPort } from '../../../shared/core/ports';
import { DomainValidationError } from '../../auth/application/AuthService';

export interface CreateReviewCommand {
  contractId?: string;
  roomId?: string;
  studentId: string;
  rating: number;
  comment?: string;
}

export class ReviewService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificationPort?: INotificationPort
  ) {}

  /**
   * Crear reseña verificando contrato previo (RF-23),
   * comentario obligatorio de 30-300 caracteres si rating <= 2 (RF-23),
   * y recalculando automáticamente el promedio del arrendador en PostgreSQL (RF-24).
   */
  public async createReview(command: CreateReviewCommand) {
    const studentId = (command.studentId ?? '').trim();
    const rating = Number(command.rating);
    const rawComment = command.comment !== undefined && command.comment !== null
      ? String(command.comment).trim()
      : '';

    if (!studentId) {
      throw new DomainValidationError(
        400,
        'MISSING_STUDENT_ID',
        'El identificador del estudiante (studentId) es obligatorio para registrar una calificación.'
      );
    }

    // RF-23: Sistema de calificaciones de 1 a 5 estrellas
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new DomainValidationError(
        400,
        'INVALID_RATING_RANGE',
        'La calificación debe ser un número entero entre 1 y 5 estrellas (RF-23).'
      );
    }

    // RF-23: Comentario OBLIGATORIO (30 a 300 caracteres) si la puntuación es <= 2 estrellas
    if (rating <= 2) {
      if (!rawComment || rawComment.length < 30 || rawComment.length > 300) {
        throw new DomainValidationError(
          400,
          'MANDATORY_COMMENT_FOR_LOW_RATING',
          `Para calificaciones de 1 o 2 estrellas es obligatorio incluir un comentario justificativo de entre 30 y 300 caracteres (longitud actual: ${rawComment.length}) según RF-23.`
        );
      }
    } else if (rawComment.length > 0 && (rawComment.length < 30 || rawComment.length > 300)) {
      throw new DomainValidationError(
        400,
        'INVALID_COMMENT_LENGTH',
        `El comentario debe tener entre 30 y 300 caracteres (longitud actual: ${rawComment.length}) según RF-23.`
      );
    }

    // RF-23: Validar que exista arriendo/contrato previo
    const contracts = await this.prisma.contract.findMany({
      where: {
        studentId,
        ...(command.contractId ? { id: command.contractId.trim() } : {}),
        ...(command.roomId ? { roomId: command.roomId.trim() } : {}),
        status: {
          in: [ContractStatus.ACTIVO, ContractStatus.FINALIZADO],
        },
      },
      include: {
        review: true,
        room: true,
        landlord: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (contracts.length === 0) {
      throw new DomainValidationError(
        403,
        'PRIOR_CONTRACT_REQUIRED',
        'No se puede registrar la calificación: Solo pueden calificar los estudiantes que tuvieron un contrato de arriendo previo en la habitación (RF-23).'
      );
    }

    // Preferir un contrato previo que aún no tenga reseña asociada
    let targetContract = contracts.find((c) => !c.review) ?? contracts[0];

    // Si todos los contratos previos de ese estudiante en esa habitación ya tenían reseña
    // y no se forzó un contractId específico, creamos un registro de ciclo de contrato
    // para permitir la nueva evaluación manteniendo la integridad 1:1 de contractId
    if (targetContract.review && !command.contractId) {
      targetContract = await this.prisma.contract.create({
        data: {
          roomId: targetContract.roomId,
          studentId: targetContract.studentId,
          landlordId: targetContract.landlordId,
          monthlyRent: targetContract.monthlyRent,
          status: ContractStatus.FINALIZADO,
          notes: 'Periodo de arrendamiento verificado para nueva calificación.',
        },
        include: {
          review: true,
          room: true,
          landlord: true,
        },
      });
    } else if (targetContract.review && command.contractId) {
      throw new DomainValidationError(
        409,
        'CONTRACT_ALREADY_REVIEWED',
        'Este contrato de alquiler ya cuenta con una calificación registrada.'
      );
    }

    const finalComment = rawComment.length > 0 ? rawComment : null;

    // Transacción atómica: crear reseña y recalcular promedio del arrendador (RF-24)
    const result = await this.prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          contractId: targetContract.id,
          roomId: targetContract.roomId,
          studentId: targetContract.studentId,
          landlordId: targetContract.landlordId,
          rating,
          comment: finalComment,
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              facultad: true,
            },
          },
          room: {
            select: {
              id: true,
              title: true,
              district: true,
            },
          },
        },
      });

      // RF-24: Recalcular automáticamente el promedio del arrendador tras cada nueva calificación
      const aggregation = await tx.review.aggregate({
        where: { landlordId: targetContract.landlordId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const updatedAverage = Number((aggregation._avg.rating ?? 0).toFixed(2));
      const updatedTotal = aggregation._count.rating;

      const updatedLandlord = await tx.user.update({
        where: { id: targetContract.landlordId },
        data: {
          averageRating: updatedAverage,
          totalReviews: updatedTotal,
        },
        select: {
          id: true,
          fullName: true,
          averageRating: true,
          totalReviews: true,
        },
      });

      return {
        review: createdReview,
        landlordRating: updatedLandlord,
      };
    });

    if (this.notificationPort) {
      await this.notificationPort.sendNotification({
        recipientEmail: targetContract.landlord.email,
        subject: `Nueva calificación recibida (${rating}★) - FindRoom`,
        message: `Has recibido una calificación de ${rating} estrella(s) por "${targetContract.room.title}". Tu nuevo promedio general es ${result.landlordRating.averageRating} (${result.landlordRating.totalReviews} reseñas) según RF-24.`,
        eventType: 'REVIEW_CREATED',
      });
    }

    return result;
  }

  public async listReviews(filters: {
    roomId?: string;
    landlordId?: string;
    studentId?: string;
  }) {
    return this.prisma.review.findMany({
      where: {
        ...(filters.roomId ? { roomId: filters.roomId } : {}),
        ...(filters.landlordId ? { landlordId: filters.landlordId } : {}),
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            facultad: true,
          },
        },
        room: {
          select: {
            id: true,
            title: true,
            district: true,
          },
        },
      },
    });
  }
}
