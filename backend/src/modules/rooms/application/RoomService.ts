import {
  BathroomType,
  ContactRequestStatus,
  Prisma,
  PrismaClient,
  Role,
  RoomStatus,
  RoomType,
} from '@prisma/client';
import { DomainValidationError } from '../../auth/application/AuthService';

export interface RoomSearchFilters {
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  bathroomType?: BathroomType;
  isFurnished?: boolean;
  maxDistanceKm?: number;
  type?: RoomType;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'date_desc' | 'distance_asc';
  studentId?: string;
}

export interface CreateRoomCommand {
  landlordId: string;
  title: string;
  type: RoomType;
  district: string;
  address: string;
  monthlyPrice: number;
  areaSqm: number;
  bathroomType: BathroomType;
  isFurnished: boolean;
  includesWater?: boolean;
  includesElectricity?: boolean;
  includesWifi?: boolean;
  includedServices?: string[];
  description: string;
  photos: string[];
  distanceToPucpKm?: number;
  walkingMinutesToPucp?: number;
}

export class RoomService {
  constructor(private readonly prisma: PrismaClient) {}

  private maskWhatsapp(rawWhatsapp?: string | null): string {
    if (!rawWhatsapp) {
      return '+51 9•• ••• •••';
    }
    const digits = rawWhatsapp.replace(/\D/g, '');
    const lastTwo = digits.slice(-2) || '••';
    return `+51 9•• ••• •${lastTwo}`;
  }

  /**
   * Búsqueda de habitaciones con filtros combinables (RF-11, RF-12)
   * y exclusión estricta de habitaciones con estado ALQUILADO (RF-18).
   */
  public async searchAvailableRooms(filters: RoomSearchFilters) {
    // RF-18: Habitaciones con estado "Alquilado" NUNCA aparecen en los resultados del buscador
    const where: Prisma.RoomWhereInput = {
      status: RoomStatus.DISPONIBLE,
    };

    if (filters.district && filters.district.trim() !== '' && filters.district !== 'TODOS') {
      where.district = {
        equals: filters.district.trim(),
        mode: 'insensitive',
      };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.monthlyPrice = {};
      if (filters.minPrice !== undefined && !Number.isNaN(filters.minPrice)) {
        where.monthlyPrice.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined && !Number.isNaN(filters.maxPrice)) {
        where.monthlyPrice.lte = filters.maxPrice;
      }
    }

    if (filters.bathroomType) {
      where.bathroomType = filters.bathroomType;
    }

    if (filters.isFurnished !== undefined) {
      where.isFurnished = filters.isFurnished;
    }

    if (filters.maxDistanceKm !== undefined && !Number.isNaN(filters.maxDistanceKm)) {
      where.distanceToPucpKm = {
        lte: filters.maxDistanceKm,
      };
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.search && filters.search.trim() !== '') {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        { district: { contains: term, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.RoomOrderByWithRelationInput = { createdAt: 'desc' };
    switch (filters.sortBy) {
      case 'price_asc':
        orderBy = { monthlyPrice: 'asc' };
        break;
      case 'price_desc':
        orderBy = { monthlyPrice: 'desc' };
        break;
      case 'rating_desc':
        orderBy = { landlord: { averageRating: 'desc' } };
        break;
      case 'distance_asc':
        orderBy = { distanceToPucpKm: 'asc' };
        break;
      case 'date_desc':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const rooms = await this.prisma.room.findMany({
      where,
      orderBy,
      include: {
        landlord: {
          select: {
            id: true,
            fullName: true,
            email: true,
            whatsapp: true,
            isVerified: true,
            isReniecVerified: true,
            isSunarpVerified: true,
            averageRating: true,
            totalReviews: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            contactRequests: true,
          },
        },
      },
    });

    // Si hay un estudiante autenticado, consultar sus solicitudes para evaluar RF-15
    const acceptedRoomIds = new Set<string>();
    const requestStatusByRoom = new Map<string, ContactRequestStatus>();

    if (filters.studentId) {
      const studentRequests = await this.prisma.contactRequest.findMany({
        where: { studentId: filters.studentId },
        orderBy: { createdAt: 'desc' },
      });

      for (const req of studentRequests) {
        if (!requestStatusByRoom.has(req.roomId)) {
          const effectiveStatus = req.message?.startsWith('[CANCELADA]')
            ? ('CANCELADA' as unknown as ContactRequestStatus)
            : req.status;
          requestStatusByRoom.set(req.roomId, effectiveStatus);
        }
        if (req.status === ContactRequestStatus.ACEPTADA) {
          acceptedRoomIds.add(req.roomId);
        }
      }
    }

    return rooms.map((room) => {
      const isWhatsappUnlocked = acceptedRoomIds.has(room.id);
      return {
        ...room,
        whatsappRevealed: isWhatsappUnlocked,
        studentContactStatus: requestStatusByRoom.get(room.id) ?? null,
        landlord: {
          ...room.landlord,
          // RF-15: El número de WhatsApp permanece oculto hasta aceptación manual
          whatsapp: isWhatsappUnlocked ? room.landlord.whatsapp : null,
          whatsappMasked: this.maskWhatsapp(room.landlord.whatsapp),
        },
      };
    });
  }

  /**
   * Detalle de habitación por ID aplicando estricto control de visibilidad de WhatsApp (RF-15).
   */
  public async getRoomById(roomId: string, requesterUserId?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        landlord: {
          select: {
            id: true,
            fullName: true,
            email: true,
            whatsapp: true,
            dni: true,
            partidaRegistral: true,
            isVerified: true,
            isReniecVerified: true,
            isSunarpVerified: true,
            averageRating: true,
            totalReviews: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                facultad: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new DomainValidationError(
        404,
        'ROOM_NOT_FOUND',
        'La habitación solicitada no existe.'
      );
    }

    let isWhatsappUnlocked = false;
    let latestContactRequest = null;
    let eligibleContractForReview = null;

    if (requesterUserId) {
      if (requesterUserId === room.landlordId) {
        isWhatsappUnlocked = true;
      } else {
        // Buscar solicitudes del estudiante hacia esta habitación
        const requests = await this.prisma.contactRequest.findMany({
          where: {
            roomId: room.id,
            studentId: requesterUserId,
          },
          orderBy: { createdAt: 'desc' },
        });

        latestContactRequest = requests[0]
          ? {
              ...requests[0],
              status: requests[0].message?.startsWith('[CANCELADA]')
                ? ('CANCELADA' as unknown as ContactRequestStatus)
                : requests[0].status,
            }
          : null;
        isWhatsappUnlocked = requests.some(
          (req) => req.status === ContactRequestStatus.ACEPTADA
        );

        // Verificar si el estudiante tiene contrato previo para habilitar formulario de reseña (RF-23)
        eligibleContractForReview = await this.prisma.contract.findFirst({
          where: {
            roomId: room.id,
            studentId: requesterUserId,
          },
          include: {
            review: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    return {
      ...room,
      whatsappRevealed: isWhatsappUnlocked,
      studentContactStatus: latestContactRequest?.status ?? null,
      latestContactRequest,
      eligibleContractForReview,
      landlord: {
        ...room.landlord,
        // RF-15: Solo incluir WhatsApp si la solicitud del estudiante está ACEPTADA (o si es el propio arrendador)
        whatsapp: isWhatsappUnlocked ? room.landlord.whatsapp : null,
        whatsappMasked: this.maskWhatsapp(room.landlord.whatsapp),
      },
    };
  }

  /**
   * Publicar nueva habitación validando todas las reglas de RF-7.
   */
  public async createRoom(command: CreateRoomCommand) {
    const landlord = await this.prisma.user.findUnique({
      where: { id: command.landlordId },
    });

    if (!landlord || landlord.role !== Role.ARRENDADOR) {
      throw new DomainValidationError(
        403,
        'FORBIDDEN_ROLE',
        'Solo los usuarios con rol ARRENDADOR pueden publicar habitaciones.'
      );
    }

    if (!landlord.isVerified) {
      throw new DomainValidationError(
        403,
        'UNVERIFIED_LANDLORD',
        'El arrendador debe estar verificado por RENIEC y SUNARP antes de publicar inmuebles (RF-2).'
      );
    }

    const description = (command.description ?? '').trim();
    if (description.length < 30 || description.length > 300) {
      throw new DomainValidationError(
        400,
        'INVALID_DESCRIPTION_LENGTH',
        `La descripción de la habitación debe tener entre 30 y 300 caracteres (actual: ${description.length} caracteres) según RF-7.`
      );
    }

    const photos = Array.isArray(command.photos)
      ? command.photos.map((p) => p.trim()).filter(Boolean)
      : [];
    if (photos.length < 3 || photos.length > 10) {
      throw new DomainValidationError(
        400,
        'INVALID_PHOTOS_COUNT',
        `Debe adjuntar entre 3 y 10 fotografías por habitación (actual: ${photos.length}) según RF-7.`
      );
    }

    if (!command.monthlyPrice || command.monthlyPrice <= 0) {
      throw new DomainValidationError(
        400,
        'INVALID_PRICE',
        'El precio mensual en Soles (S/) debe ser mayor a 0 (RF-7).'
      );
    }

    if (!command.areaSqm || command.areaSqm <= 0) {
      throw new DomainValidationError(
        400,
        'INVALID_AREA',
        'El área de la habitación en m² debe ser mayor a 0 (RF-7).'
      );
    }

    const includesWater = command.includesWater ?? true;
    const includesElectricity = command.includesElectricity ?? true;
    const includesWifi = command.includesWifi ?? true;

    const computedServices: string[] =
      command.includedServices && command.includedServices.length > 0
        ? command.includedServices
        : [
            ...(includesWater ? ['Agua'] : []),
            ...(includesElectricity ? ['Luz'] : []),
            ...(includesWifi ? ['WiFi'] : []),
          ];

    const room = await this.prisma.room.create({
      data: {
        landlordId: command.landlordId,
        title: (command.title ?? '').trim() || `Habitación en ${command.district}`,
        type: command.type ?? RoomType.INDIVIDUAL,
        district: command.district.trim(),
        address: command.address.trim(),
        monthlyPrice: Number(command.monthlyPrice),
        areaSqm: Number(command.areaSqm),
        bathroomType: command.bathroomType ?? BathroomType.PRIVADO,
        isFurnished: Boolean(command.isFurnished),
        includesWater,
        includesElectricity,
        includesWifi,
        includedServices: computedServices,
        description,
        photos,
        distanceToPucpKm: Number(command.distanceToPucpKm ?? 0.8),
        walkingMinutesToPucp: Number(command.walkingMinutesToPucp ?? 10),
        status: RoomStatus.DISPONIBLE,
      },
      include: {
        landlord: {
          select: {
            id: true,
            fullName: true,
            isVerified: true,
            averageRating: true,
            totalReviews: true,
          },
        },
      },
    });

    return room;
  }

  /**
   * Cambiar estado de una habitación (DISPONIBLE, ALQUILADO, PAUSADO) - RF-18.
   */
  public async updateRoomStatus(roomId: string, status: RoomStatus, landlordId?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new DomainValidationError(404, 'ROOM_NOT_FOUND', 'La habitación no existe.');
    }

    if (landlordId && room.landlordId !== landlordId) {
      throw new DomainValidationError(
        403,
        'NOT_ROOM_OWNER',
        'No tiene permisos para modificar una habitación que no le pertenece.'
      );
    }

    return this.prisma.room.update({
      where: { id: roomId },
      data: { status },
    });
  }

  /**
   * Eliminar habitación verificando RF-8:
   * No se permite eliminar habitaciones si tienen solicitudes de contacto pendientes o aceptadas.
   */
  public async deleteRoom(roomId: string, landlordId?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        contactRequests: {
          where: {
            status: {
              in: [ContactRequestStatus.PENDIENTE, ContactRequestStatus.ACEPTADA],
            },
          },
        },
        contracts: true,
      },
    });

    if (!room) {
      throw new DomainValidationError(404, 'ROOM_NOT_FOUND', 'La habitación no existe.');
    }

    if (landlordId && room.landlordId !== landlordId) {
      throw new DomainValidationError(
        403,
        'NOT_ROOM_OWNER',
        'No tiene permisos para eliminar una habitación que no le pertenece.'
      );
    }

    if (room.contactRequests.length > 0) {
      throw new DomainValidationError(
        409,
        'ROOM_HAS_ACTIVE_REQUESTS',
        `No se permite eliminar esta habitación porque tiene ${room.contactRequests.length} solicitud(es) de contacto en estado PENDIENTE o ACEPTADA (RF-8).`
      );
    }

    if (room.contracts.length > 0) {
      throw new DomainValidationError(
        409,
        'ROOM_HAS_CONTRACTS',
        'No se puede eliminar una habitación con historial de contratos registrados.'
      );
    }

    await this.prisma.contactRequest.deleteMany({
      where: { roomId: room.id },
    });

    await this.prisma.room.delete({
      where: { id: room.id },
    });
  }

  /**
   * Listar todas las habitaciones de un arrendador (incluyendo ALQUILADO y PAUSADO) para su panel de gestión.
   */
  public async getLandlordRooms(landlordId: string) {
    return this.prisma.room.findMany({
      where: { landlordId },
      orderBy: { createdAt: 'desc' },
      include: {
        contactRequests: {
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
          },
        },
        _count: {
          select: {
            contactRequests: true,
            reviews: true,
          },
        },
      },
    });
  }
}
