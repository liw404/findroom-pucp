import {
  ContactRequestStatus,
  PrismaClient,
  Role,
  RoomStatus,
} from '@prisma/client';
import { INotificationPort } from '../../../shared/core/ports';
import { DomainValidationError } from '../../auth/application/AuthService';

export interface CreateContactRequestCommand {
  studentId: string;
  roomId: string;
  message?: string;
}

export interface UpdateContactRequestStatusCommand {
  requestId: string;
  status: 'ACEPTADA' | 'RECHAZADA';
  landlordId?: string;
}

export class ContactRequestService {
  // RF-16: Control anti-duplicados de 48 horas por estudiante y habitación
  private static readonly COOLDOWN_HOURS = 48;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificationPort: INotificationPort
  ) {}

  private maskWhatsapp(rawWhatsapp?: string | null): string {
    if (!rawWhatsapp) {
      return '+51 9•• ••• •••';
    }
    const digits = rawWhatsapp.replace(/\D/g, '');
    const lastTwo = digits.slice(-2) || '••';
    return `+51 9•• ••• •${lastTwo}`;
  }

  /**
   * Crear solicitud de contacto verificando la regla anti-duplicados de 48 horas (RF-16)
   * y mantendo oculto el número de WhatsApp del arrendador (RF-15).
   */
  public async createRequest(command: CreateContactRequestCommand) {
    const studentId = (command.studentId ?? '').trim();
    const roomId = (command.roomId ?? '').trim();

    if (!studentId || !roomId) {
      throw new DomainValidationError(
        400,
        'MISSING_REQUIRED_FIELDS',
        'Los campos studentId y roomId son obligatorios para crear una solicitud de contacto.'
      );
    }

    const [student, room] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: studentId } }),
      this.prisma.room.findUnique({
        where: { id: roomId },
        include: { landlord: true },
      }),
    ]);

    if (!student || student.role !== Role.ESTUDIANTE) {
      throw new DomainValidationError(
        403,
        'STUDENT_ROLE_REQUIRED',
        'Solo los estudiantes autenticados PUCP pueden enviar solicitudes de contacto (RF-1, RF-15).'
      );
    }

    if (!room) {
      throw new DomainValidationError(
        404,
        'ROOM_NOT_FOUND',
        'La habitación solicitada no existe.'
      );
    }

    if (room.status === RoomStatus.ALQUILADO) {
      throw new DomainValidationError(
        409,
        'ROOM_ALREADY_RENTED',
        'No se pueden enviar solicitudes a una habitación con estado Alquilado (RF-18).'
      );
    }

    // RF-16: Máximo 1 solicitud por estudiante a una misma habitación cada 48 horas
    const fortyEightHoursAgo = new Date(
      Date.now() - ContactRequestService.COOLDOWN_HOURS * 60 * 60 * 1000
    );

    const recentDuplicate = await this.prisma.contactRequest.findFirst({
      where: {
        studentId,
        roomId,
        createdAt: {
          gte: fortyEightHoursAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentDuplicate) {
      const elapsedMs = Date.now() - recentDuplicate.createdAt.getTime();
      const cooldownMs = ContactRequestService.COOLDOWN_HOURS * 60 * 60 * 1000;
      const remainingHours = Math.max(
        1,
        Math.ceil((cooldownMs - elapsedMs) / (1000 * 60 * 60))
      );

      throw new DomainValidationError(
        409,
        'DUPLICATE_REQUEST_WITHIN_48H',
        `Ya registraste una solicitud reciente para esta habitación. El envío se encuentra pausado temporalmente por control de solicitudes (${remainingHours} h restantes).`,
        {
          existingRequestId: recentDuplicate.id,
          existingStatus: recentDuplicate.status,
          createdAt: recentDuplicate.createdAt.toISOString(),
          remainingHours,
        }
      );
    }

    const cleanMessage =
      command.message?.trim().slice(0, 300) ||
      `Hola ${room.landlord.fullName}, soy estudiante de la PUCP (${student.facultad ?? 'Pregrado'}) y estoy interesado en alquilar "${room.title}".`;

    const createdRequest = await this.prisma.contactRequest.create({
      data: {
        studentId,
        roomId,
        message: cleanMessage,
        status: ContactRequestStatus.PENDIENTE,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            codigoPucp: true,
            facultad: true,
          },
        },
        room: {
          include: {
            landlord: {
              select: {
                id: true,
                fullName: true,
                email: true,
                whatsapp: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    await this.notificationPort.sendNotification({
      recipientEmail: createdRequest.room.landlord.email,
      subject: `Nueva solicitud de contacto PUCP - ${createdRequest.room.title}`,
      message: `El estudiante ${createdRequest.student.fullName} (${createdRequest.student.email}) ha solicitado contactarte por "${createdRequest.room.title}". Tu número de WhatsApp permanece oculto hasta que aceptes la solicitud desde tu panel (RF-15).`,
      eventType: 'CONTACT_REQUEST_CREATED',
    });

    return {
      ...createdRequest,
      room: {
        ...createdRequest.room,
        landlord: {
          ...createdRequest.room.landlord,
          // RF-15: Ocultar WhatsApp al crear la solicitud en estado PENDIENTE
          whatsapp: null,
          whatsappMasked: this.maskWhatsapp(createdRequest.room.landlord.whatsapp),
        },
      },
    };
  }

  /**
   * Cambiar el estado de una solicitud a 'ACEPTADA' o 'RECHAZADA' por parte del arrendador (RF-15).
   */
  public async updateRequestStatus(command: UpdateContactRequestStatusCommand) {
    const { requestId, status, landlordId } = command;

    if (
      status !== ContactRequestStatus.ACEPTADA &&
      status !== ContactRequestStatus.RECHAZADA
    ) {
      throw new DomainValidationError(
        400,
        'INVALID_REQUEST_STATUS',
        "El nuevo estado de la solicitud debe ser únicamente 'ACEPTADA' o 'RECHAZADA'."
      );
    }

    const existingRequest = await this.prisma.contactRequest.findUnique({
      where: { id: requestId },
      include: {
        room: {
          include: {
            landlord: true,
          },
        },
        student: true,
      },
    });

    if (!existingRequest) {
      throw new DomainValidationError(
        404,
        'CONTACT_REQUEST_NOT_FOUND',
        'La solicitud de contacto especificada no existe.'
      );
    }

    if (landlordId && existingRequest.room.landlordId !== landlordId) {
      throw new DomainValidationError(
        403,
        'FORBIDDEN_LANDLORD',
        'Solo el arrendador titular de la habitación puede aceptar o rechazar esta solicitud.'
      );
    }

    const updatedRequest = await this.prisma.contactRequest.update({
      where: { id: requestId },
      data: {
        status,
        respondedAt: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            codigoPucp: true,
            facultad: true,
          },
        },
        room: {
          include: {
            landlord: {
              select: {
                id: true,
                fullName: true,
                email: true,
                whatsapp: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    await this.notificationPort.sendNotification({
      recipientEmail: updatedRequest.student.email,
      subject:
        status === ContactRequestStatus.ACEPTADA
          ? `Solicitud Aceptada - WhatsApp Desbloqueado (${updatedRequest.room.title})`
          : `Actualización de Solicitud - ${updatedRequest.room.title}`,
      message:
        status === ContactRequestStatus.ACEPTADA
          ? `El arrendador ${updatedRequest.room.landlord.fullName} ha aceptado tu solicitud para "${updatedRequest.room.title}". Ya puedes comunicarte vía WhatsApp al ${updatedRequest.room.landlord.whatsapp}.`
          : `El arrendador ha actualizado el estado de tu solicitud para "${updatedRequest.room.title}" a RECHAZADA.`,
      eventType:
        status === ContactRequestStatus.ACEPTADA
          ? 'CONTACT_REQUEST_ACCEPTED'
          : 'CONTACT_REQUEST_REJECTED',
    });

    const isAccepted = updatedRequest.status === ContactRequestStatus.ACEPTADA;

    return {
      ...updatedRequest,
      whatsappRevealed: isAccepted,
      room: {
        ...updatedRequest.room,
        landlord: {
          ...updatedRequest.room.landlord,
          whatsapp: isAccepted ? updatedRequest.room.landlord.whatsapp : null,
          whatsappMasked: this.maskWhatsapp(updatedRequest.room.landlord.whatsapp),
        },
      },
    };
  }

  /**
   * Cancelar una solicitud pendiente por parte del estudiante.
   * Mantiene el registro de fecha para conservar la pausa temporal anti-spam.
   */
  public async cancelRequest(requestId: string, studentId?: string) {
    const existingRequest = await this.prisma.contactRequest.findUnique({
      where: { id: requestId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            codigoPucp: true,
            facultad: true,
          },
        },
        room: {
          include: {
            landlord: {
              select: {
                id: true,
                fullName: true,
                email: true,
                whatsapp: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    if (!existingRequest) {
      throw new DomainValidationError(
        404,
        'CONTACT_REQUEST_NOT_FOUND',
        'La solicitud de contacto no existe.'
      );
    }

    if (studentId && existingRequest.studentId !== studentId) {
      throw new DomainValidationError(
        403,
        'FORBIDDEN_STUDENT',
        'Solo el estudiante que envió la solicitud puede cancelarla.'
      );
    }

    if (existingRequest.status !== ContactRequestStatus.PENDIENTE) {
      throw new DomainValidationError(
        409,
        'REQUEST_NOT_PENDING',
        'Solo se pueden cancelar solicitudes que se encuentren en estado pendiente.'
      );
    }

    const updated = await this.prisma.contactRequest.update({
      where: { id: requestId },
      data: {
        status: ContactRequestStatus.RECHAZADA,
        message: `[CANCELADA] ${existingRequest.message ?? ''}`.slice(0, 300),
        respondedAt: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            codigoPucp: true,
            facultad: true,
          },
        },
        room: {
          include: {
            landlord: {
              select: {
                id: true,
                fullName: true,
                email: true,
                whatsapp: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    return {
      ...updated,
      status: 'CANCELADA' as unknown as ContactRequestStatus,
      whatsappRevealed: false,
      room: {
        ...updated.room,
        landlord: {
          ...updated.room.landlord,
          whatsapp: null,
          whatsappMasked: this.maskWhatsapp(updated.room.landlord.whatsapp),
        },
      },
    };
  }

  /**
   * Listar solicitudes de contacto para panel de estudiante o panel de arrendador.
   */
  public async listRequests(filters: {
    studentId?: string;
    landlordId?: string;
    roomId?: string;
  }) {
    const requests = await this.prisma.contactRequest.findMany({
      where: {
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.roomId ? { roomId: filters.roomId } : {}),
        ...(filters.landlordId
          ? {
              room: {
                landlordId: filters.landlordId,
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            codigoPucp: true,
            facultad: true,
          },
        },
        room: {
          include: {
            landlord: {
              select: {
                id: true,
                fullName: true,
                email: true,
                whatsapp: true,
                isVerified: true,
                averageRating: true,
              },
            },
          },
        },
      },
    });

    return requests.map((req) => {
      const isAccepted = req.status === ContactRequestStatus.ACEPTADA;
      const isLandlordView = Boolean(
        filters.landlordId && filters.landlordId === req.room.landlordId
      );
      const shouldShowWhatsapp = isAccepted || isLandlordView;

      return {
        ...req,
        whatsappRevealed: isAccepted,
        room: {
          ...req.room,
          landlord: {
            ...req.room.landlord,
            // RF-15: Ocultar WhatsApp mientras la solicitud no esté ACEPTADA
            whatsapp: shouldShowWhatsapp ? req.room.landlord.whatsapp : null,
            whatsappMasked: this.maskWhatsapp(req.room.landlord.whatsapp),
          },
        },
      };
    });
  }
}
