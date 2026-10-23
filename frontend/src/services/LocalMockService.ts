import {
  ContactRequestItem,
  ContactRequestStatus,
  LandlordSummary,
  RoomItem,
  RoomReviewItem,
  RoomStatus,
} from '../types/room';
import {
  CreateRequestPayload,
  CreateReviewPayload,
  CreateReviewResult,
  CreateRoomPayload,
  DemoUserProfile,
  IAuthService,
  IRequestService,
  IRoomService,
  RegisterLandlordPayload,
  RequestSearchParams,
  RoomSearchParams,
  SsoStudentPayload,
  UpdateRoomPayload,
} from './interfaces';
import {
  DEMO_SAFE_WHATSAPP,
  INITIAL_CONTRACTS,
  INITIAL_REVIEWS,
  INITIAL_ROOMS,
  LANDLORD_ELENA_ID,
  SEED_IDS,
  SEED_LANDLORDS,
  SEED_STUDENTS,
  STUDENT_MATEO_ID,
  SeedContractItem,
} from './seedData';
import {
  hydrateRequestItem,
  loadRequestsFromStorage,
  saveRequestsToStorage,
} from '../hooks/useRequests';

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

interface PersistedMockDatabase {
  rooms: RoomItem[];
  requests: ContactRequestItem[];
  reviews: RoomReviewItem[];
  contracts: SeedContractItem[];
  landlords: Record<string, LandlordSummary>;
}

const DB_STORAGE_KEY = 'findroom_mock_db_v9';
const VALID_ROOM3_PHOTO =
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80';

const LEGACY_ROOM_ID_MAP: Record<string, string> = {
  '33333333-3333-4333-8333-333333333301': SEED_IDS.ROOM_1,
  '33333333-3333-4333-8333-333333333302': SEED_IDS.ROOM_2,
  '33333333-3333-4333-8333-333333333303': SEED_IDS.ROOM_3,
  '33333333-3333-4333-8333-333333333304': SEED_IDS.ROOM_4,
  '33333333-3333-4333-8333-333333333305': SEED_IDS.ROOM_5,
  '33333333-3333-4333-8333-333333333306': SEED_IDS.ROOM_6,
};

function isSameLandlordId(candidateId?: string, targetId?: string): boolean {
  if (!targetId) return true;
  if (candidateId === targetId) return true;
  const elenaAliases = new Set([
    LANDLORD_ELENA_ID,
    'usr-landlord-1',
    SEED_IDS.LANDLORD_ELENA_LEGACY,
  ]);
  if (elenaAliases.has(targetId) && candidateId && elenaAliases.has(candidateId)) {
    return true;
  }
  return false;
}

function isSameStudentId(candidateId?: string, targetId?: string): boolean {
  if (!targetId) return true;
  if (candidateId === targetId) return true;
  const mateoAliases = new Set([
    STUDENT_MATEO_ID,
    SEED_IDS.STUDENT_MATEO_LEGACY,
  ]);
  if (mateoAliases.has(targetId) && candidateId && mateoAliases.has(candidateId)) {
    return true;
  }
  return false;
}

function maskWhatsapp(raw?: string | null): string {
  if (!raw) return '+51 987 ••• •21';
  const digits = raw.replace(/\D/g, '');
  const lastTwo = digits.slice(-2) || '21';
  return `+51 987 ••• •${lastTwo}`;
}

function normalizeLandlordSummary(
  raw?: Partial<LandlordSummary> | null,
  fallbackLandlordId?: string
): LandlordSummary {
  const seed =
    (fallbackLandlordId ? SEED_LANDLORDS[fallbackLandlordId] : undefined) ??
    (raw?.id ? SEED_LANDLORDS[raw.id] : undefined) ??
    SEED_LANDLORDS[LANDLORD_ELENA_ID];

  const rawName = (raw?.fullName ?? raw?.name ?? seed?.fullName ?? 'Elena Vargas')
    .replace(/^(Dra\.|Dr\.|Ing\.|Arq\.|Lic\.)\s+/i, '')
    .trim();

  const resolvedRating = Number(
    raw?.averageRating ?? raw?.rating ?? seed?.averageRating ?? 4.8
  );
  const resolvedCount = Number(
    raw?.totalReviews ?? raw?.reviewCount ?? seed?.totalReviews ?? 9
  );
  const resolvedId = isSameLandlordId(raw?.id ?? fallbackLandlordId, LANDLORD_ELENA_ID)
    ? LANDLORD_ELENA_ID
    : raw?.id ?? fallbackLandlordId ?? LANDLORD_ELENA_ID;

  return {
    id: resolvedId,
    name: rawName,
    fullName: rawName,
    email: raw?.email ?? seed?.email ?? 'elena.vargas@findroom.pe',
    phone: raw?.phone ?? seed?.phone ?? '987654321',
    dni: raw?.dni ?? seed?.dni ?? '43910285',
    partidaRegistral: raw?.partidaRegistral ?? seed?.partidaRegistral ?? '11294850',
    whatsapp: raw?.whatsapp ?? seed?.whatsapp ?? DEMO_SAFE_WHATSAPP,
    whatsappMasked: maskWhatsapp(raw?.whatsapp ?? seed?.whatsapp ?? DEMO_SAFE_WHATSAPP),
    isVerified: raw?.isVerified ?? true,
    reniecVerified: raw?.reniecVerified ?? true,
    sunarpVerified: raw?.sunarpVerified ?? true,
    isReniecVerified: raw?.isReniecVerified ?? true,
    isSunarpVerified: raw?.isSunarpVerified ?? true,
    rating: Number.isFinite(resolvedRating) ? resolvedRating : 4.8,
    reviewCount: Number.isFinite(resolvedCount) ? resolvedCount : 9,
    averageRating: Number.isFinite(resolvedRating) ? resolvedRating : 4.8,
    totalReviews: Number.isFinite(resolvedCount) ? resolvedCount : 9,
  };
}

export class LocalMockService implements IRoomService, IRequestService, IAuthService {
  constructor(
    private readonly getActiveDemoUserFn: () => DemoUserProfile,
    private readonly setActiveDemoRoleFn: (
      role: 'ESTUDIANTE' | 'ARRENDADOR'
    ) => DemoUserProfile,
    private readonly onNotificationCreated?: (notif: {
      targetRole: 'ESTUDIANTE' | 'ARRENDADOR';
      title: string;
      description: string;
      roomId?: string;
      whatsappPhone?: string;
      whatsappLabel?: string;
    }) => void
  ) {}

  private loadDb(): PersistedMockDatabase {
    let parsedDb: PersistedMockDatabase | null = null;
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedMockDatabase;
        if (
          Array.isArray(parsed?.rooms) &&
          parsed.rooms.some(
            (r) =>
              r?.id === SEED_IDS.ROOM_3 && r?.landlordId === LANDLORD_ELENA_ID
          )
        ) {
          parsedDb = parsed;
        }
      }
    } catch {
      // Fallback en memoria
    }

    if (!parsedDb) {
      parsedDb = {
        rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
        requests: [],
        reviews: JSON.parse(JSON.stringify(INITIAL_REVIEWS)),
        contracts: JSON.parse(JSON.stringify(INITIAL_CONTRACTS)),
        landlords: JSON.parse(JSON.stringify(SEED_LANDLORDS)),
      };
      this.saveDb(parsedDb);
    }

    // Sincronizar siempre las solicitudes con el almacén unificado findroom_requests
    parsedDb.requests = loadRequestsFromStorage(parsedDb.rooms);
    return parsedDb;
  }

  private saveDb(db: PersistedMockDatabase): void {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignorar bloqueo de localStorage
    }
  }

  public async getRooms(params: RoomSearchParams = {}): Promise<RoomItem[]> {
    const db = this.loadDb();
    const studentId = params.studentId || this.getActiveDemoUserFn()?.id || STUDENT_MATEO_ID;

    let filtered = (db.rooms ?? []).filter((room) => room?.status === 'DISPONIBLE');

    if (params.district && params.district !== 'TODOS') {
      const target = params.district.trim().toLowerCase();
      filtered = filtered.filter((r) => r?.district?.toLowerCase() === target);
    }

    if (params.minPrice !== undefined && !Number.isNaN(params.minPrice)) {
      filtered = filtered.filter((r) => (r?.monthlyPrice ?? 0) >= params.minPrice!);
    }

    if (params.maxPrice !== undefined && !Number.isNaN(params.maxPrice)) {
      filtered = filtered.filter((r) => (r?.monthlyPrice ?? 0) <= params.maxPrice!);
    }

    if (params.bathroomType) {
      filtered = filtered.filter((r) => r?.bathroomType === params.bathroomType);
    }

    if (params.isFurnished !== undefined) {
      filtered = filtered.filter((r) => r?.isFurnished === params.isFurnished);
    }

    if (params.maxDistanceKm !== undefined && !Number.isNaN(params.maxDistanceKm)) {
      filtered = filtered.filter(
        (r) => (r?.distanceToPucpKm ?? 0) <= params.maxDistanceKm!
      );
    }

    if (params.type) {
      filtered = filtered.filter((r) => r?.type === params.type);
    }

    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const bathText =
          r?.bathroomType === 'PRIVADO' ? 'baño privado' : 'baño compartido';
        const furnishedText = r?.isFurnished ? 'amoblado' : 'sin amoblar';
        const servicesText = (r?.includedServices ?? []).join(' ').toLowerCase();
        return (
          (r?.title ?? '').toLowerCase().includes(term) ||
          (r?.description ?? '').toLowerCase().includes(term) ||
          (r?.address ?? '').toLowerCase().includes(term) ||
          (r?.district ?? '').toLowerCase().includes(term) ||
          bathText.includes(term) ||
          furnishedText.includes(term) ||
          servicesText.includes(term)
        );
      });
    }

    filtered.sort((a, b) => {
      switch (params.sortBy) {
        case 'price_asc':
          return (a?.monthlyPrice ?? 0) - (b?.monthlyPrice ?? 0);
        case 'price_desc':
          return (b?.monthlyPrice ?? 0) - (a?.monthlyPrice ?? 0);
        case 'rating_desc': {
          const ratingA =
            db.landlords[a.landlordId]?.averageRating ?? a.landlord?.averageRating ?? 0;
          const ratingB =
            db.landlords[b.landlordId]?.averageRating ?? b.landlord?.averageRating ?? 0;
          return ratingB - ratingA;
        }
        case 'distance_asc':
          return (a?.distanceToPucpKm ?? 0) - (b?.distanceToPucpKm ?? 0);
        case 'date_desc':
        default:
          return (
            new Date(b?.createdAt ?? 0).getTime() -
            new Date(a?.createdAt ?? 0).getTime()
          );
      }
    });

    const studentRequests = (db.requests ?? [])
      .filter((req) => isSameStudentId(req?.studentId, studentId))
      .sort(
        (a, b) =>
          new Date(b?.createdAt ?? 0).getTime() -
          new Date(a?.createdAt ?? 0).getTime()
      );

    return filtered.map((room) => {
      const landlord = normalizeLandlordSummary(
        db.landlords[room.landlordId] ?? room.landlord,
        room.landlordId
      );
      const roomRequests = studentRequests.filter((r) => r?.roomId === room.id);
      const latestReq = roomRequests[0] ?? null;
      const isWhatsappUnlocked = roomRequests.some((r) => r?.status === 'ACEPTADA');
      const totalRoomRequests = (db.requests ?? []).filter(
        (r) => r?.roomId === room.id
      ).length;
      const totalRoomReviews = (db.reviews ?? []).filter(
        (r) => r?.roomId === room.id
      ).length;

      return {
        ...room,
        whatsappRevealed: isWhatsappUnlocked,
        studentContactStatus: latestReq?.status ?? null,
        latestContactRequest: latestReq,
        landlord: {
          ...landlord,
          whatsapp: isWhatsappUnlocked ? landlord.whatsapp : null,
          whatsappMasked: maskWhatsapp(landlord.whatsapp),
        },
        _count: {
          contactRequests: totalRoomRequests,
          reviews: totalRoomReviews,
        },
      };
    });
  }

  public async getRoomById(
    roomId: string,
    requesterUserId?: string
  ): Promise<RoomItem> {
    const db = this.loadDb();
    const targetId = LEGACY_ROOM_ID_MAP[roomId] ?? roomId;
    const room =
      (db.rooms ?? []).find((r) => r?.id === targetId) ??
      INITIAL_ROOMS.find((r) => r?.id === targetId);

    if (!room) {
      throw new ApiHttpError(
        404,
        'ROOM_NOT_FOUND',
        'La habitación solicitada no existe.'
      );
    }

    const userId = requesterUserId || this.getActiveDemoUserFn()?.id || STUDENT_MATEO_ID;
    const landlord = normalizeLandlordSummary(
      db.landlords[room.landlordId] ?? room.landlord,
      room.landlordId
    );

    const studentRequests = (db.requests ?? [])
      .filter(
        (req) => req?.roomId === room.id && isSameStudentId(req?.studentId, userId)
      )
      .sort(
        (a, b) =>
          new Date(b?.createdAt ?? 0).getTime() -
          new Date(a?.createdAt ?? 0).getTime()
      );

    const latestRequest = studentRequests[0] ?? null;
    const isWhatsappUnlocked =
      isSameLandlordId(room.landlordId, userId) ||
      studentRequests.some((req) => req?.status === 'ACEPTADA');

    const roomReviews = (db.reviews ?? [])
      .filter((rev) => rev?.roomId === room.id)
      .sort(
        (a, b) =>
          new Date(b?.createdAt ?? 0).getTime() -
          new Date(a?.createdAt ?? 0).getTime()
      );

    const priorContract = (db.contracts ?? []).find(
      (c) => c?.roomId === room.id && isSameStudentId(c?.studentId, userId)
    );

    return {
      ...room,
      whatsappRevealed: isWhatsappUnlocked,
      studentContactStatus: latestRequest?.status ?? null,
      latestContactRequest: latestRequest,
      eligibleContractForReview: priorContract
        ? {
            id: priorContract.id,
            status: priorContract.status,
            review: null,
          }
        : null,
      reviews: roomReviews,
      landlord: {
        ...landlord,
        whatsapp: isWhatsappUnlocked ? landlord.whatsapp : null,
        whatsappMasked: maskWhatsapp(landlord.whatsapp),
      },
    };
  }

  public async getLandlordRooms(landlordId: string): Promise<RoomItem[]> {
    const db = this.loadDb();
    return (db.rooms ?? [])
      .filter(
        (r) =>
          isSameLandlordId(r?.landlordId, landlordId) ||
          isSameLandlordId(r?.landlord?.id, landlordId)
      )
      .sort(
        (a, b) =>
          new Date(b?.createdAt ?? 0).getTime() -
          new Date(a?.createdAt ?? 0).getTime()
      )
      .map((room) => {
        const roomRequests = (db.requests ?? []).filter(
          (r) => r?.roomId === room.id
        );
        const roomReviews = (db.reviews ?? []).filter(
          (r) => r?.roomId === room.id
        );
        const landlord = normalizeLandlordSummary(
          db.landlords[room.landlordId] ?? room.landlord,
          room.landlordId
        );

        return {
          ...room,
          landlordId: isSameLandlordId(room.landlordId, LANDLORD_ELENA_ID)
            ? LANDLORD_ELENA_ID
            : room.landlordId,
          landlord,
          _count: {
            contactRequests: roomRequests.length,
            reviews: roomReviews.length,
          },
        };
      });
  }

  public async createRoom(payload: CreateRoomPayload): Promise<RoomItem> {
    const db = this.loadDb();
    const description = (payload.description ?? '').trim();

    if (description.length < 30 || description.length > 300) {
      throw new ApiHttpError(
        400,
        'INVALID_DESCRIPTION_LENGTH',
        'La descripción debe tener entre 30 y 300 caracteres.'
      );
    }

    const photos =
      payload.photos && payload.photos.length >= 1
        ? payload.photos
        : [
            VALID_ROOM3_PHOTO,
            'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1400&q=80',
            'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80',
          ];

    const landlord =
      db.landlords[payload.landlordId] ?? SEED_LANDLORDS[LANDLORD_ELENA_ID];

    const includesWater = payload.includesWater ?? true;
    const includesElectricity = payload.includesElectricity ?? true;
    const includesWifi = payload.includesWifi ?? true;

    const services =
      payload.includedServices && payload.includedServices.length > 0
        ? payload.includedServices
        : [
            ...(includesWater ? ['Agua'] : []),
            ...(includesElectricity ? ['Luz'] : []),
            ...(includesWifi ? ['WiFi'] : []),
          ];

    const created: RoomItem = {
      id: `room-local-${Date.now()}`,
      landlordId: payload.landlordId || LANDLORD_ELENA_ID,
      title: payload.title.trim() || `Habitación en ${payload.district}`,
      type: payload.type || 'INDIVIDUAL',
      district: payload.district,
      address: payload.address,
      monthlyPrice: Number(payload.monthlyPrice),
      areaSqm: Number(payload.areaSqm),
      bathroomType: payload.bathroomType,
      isFurnished: Boolean(payload.isFurnished),
      includesWater,
      includesElectricity,
      includesWifi,
      includedServices: services,
      description,
      photos,
      distanceToPucpKm: Number(payload.distanceToPucpKm ?? 0.6),
      walkingMinutesToPucp: Number(payload.walkingMinutesToPucp ?? 8),
      status: 'DISPONIBLE',
      createdAt: new Date().toISOString(),
      landlord,
      _count: {
        contactRequests: 0,
        reviews: 0,
      },
    };

    db.rooms.unshift(created);
    this.saveDb(db);
    return created;
  }

  public async updateRoom(
    roomId: string,
    payload: UpdateRoomPayload
  ): Promise<RoomItem> {
    const db = this.loadDb();
    const index = (db.rooms ?? []).findIndex((r) => r?.id === roomId);

    if (index === -1) {
      throw new ApiHttpError(404, 'ROOM_NOT_FOUND', 'La habitación no existe.');
    }

    if (payload.description !== undefined) {
      const cleanDesc = payload.description.trim();
      if (cleanDesc.length < 30 || cleanDesc.length > 300) {
        throw new ApiHttpError(
          400,
          'INVALID_DESCRIPTION_LENGTH',
          'La descripción debe tener entre 30 y 300 caracteres.'
        );
      }
    }

    const current = db.rooms[index];
    const includesWater = payload.includesWater ?? current.includesWater;
    const includesElectricity =
      payload.includesElectricity ?? current.includesElectricity;
    const includesWifi = payload.includesWifi ?? current.includesWifi;

    const includedServices =
      payload.includedServices ?? [
        ...(includesWater ? ['Agua'] : []),
        ...(includesElectricity ? ['Luz'] : []),
        ...(includesWifi ? ['WiFi'] : []),
      ];

    const updated: RoomItem = {
      ...current,
      ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
      ...(payload.type !== undefined ? { type: payload.type } : {}),
      ...(payload.district !== undefined ? { district: payload.district } : {}),
      ...(payload.address !== undefined ? { address: payload.address.trim() } : {}),
      ...(payload.monthlyPrice !== undefined
        ? { monthlyPrice: Number(payload.monthlyPrice) }
        : {}),
      ...(payload.areaSqm !== undefined ? { areaSqm: Number(payload.areaSqm) } : {}),
      ...(payload.bathroomType !== undefined
        ? { bathroomType: payload.bathroomType }
        : {}),
      ...(payload.isFurnished !== undefined
        ? { isFurnished: Boolean(payload.isFurnished) }
        : {}),
      includesWater,
      includesElectricity,
      includesWifi,
      includedServices,
      ...(payload.description !== undefined
        ? { description: payload.description.trim() }
        : {}),
      ...(payload.photos !== undefined && payload.photos.length > 0
        ? { photos: payload.photos }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    db.rooms[index] = updated;
    this.saveDb(db);
    return updated;
  }

  public async updateRoomStatus(
    roomId: string,
    status: RoomStatus,
    _landlordId?: string
  ): Promise<RoomItem> {
    const db = this.loadDb();
    const index = (db.rooms ?? []).findIndex((r) => r?.id === roomId);

    if (index === -1) {
      throw new ApiHttpError(404, 'ROOM_NOT_FOUND', 'La habitación no existe.');
    }

    db.rooms[index] = {
      ...db.rooms[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    this.saveDb(db);
    return db.rooms[index];
  }

  public async deleteRoom(roomId: string, _landlordId?: string): Promise<void> {
    const db = this.loadDb();
    const room = (db.rooms ?? []).find((r) => r?.id === roomId);
    if (!room) {
      throw new ApiHttpError(404, 'ROOM_NOT_FOUND', 'La habitación no existe.');
    }

    const activeRequests = (db.requests ?? []).filter(
      (req) =>
        req?.roomId === roomId &&
        (req?.status === 'PENDIENTE' || req?.status === 'ACEPTADA')
    );

    if (activeRequests.length > 0) {
      throw new ApiHttpError(
        409,
        'ROOM_HAS_ACTIVE_REQUESTS',
        'No se puede eliminar una habitación con solicitudes pendientes o aceptadas.'
      );
    }

    db.rooms = (db.rooms ?? []).filter((r) => r?.id !== roomId);
    const remainingRequests = (db.requests ?? []).filter(
      (req) => req?.roomId !== roomId
    );
    db.requests = saveRequestsToStorage(remainingRequests, db.rooms);
    this.saveDb(db);
  }

  public async createReview(
    payload: CreateReviewPayload
  ): Promise<CreateReviewResult> {
    const db = this.loadDb();
    const rating = Number(payload.rating);
    const trimmedComment = (payload.comment ?? '').trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ApiHttpError(
        400,
        'INVALID_RATING',
        'La calificación debe ser entre 1 y 5 estrellas.'
      );
    }

    if (rating <= 2 && (trimmedComment.length < 30 || trimmedComment.length > 300)) {
      throw new ApiHttpError(
        400,
        'MANDATORY_COMMENT_FOR_LOW_RATING',
        'Para calificaciones de 1 o 2 estrellas es obligatorio un comentario de 30 a 300 caracteres.'
      );
    }

    if (
      trimmedComment.length > 0 &&
      (trimmedComment.length < 30 || trimmedComment.length > 300)
    ) {
      throw new ApiHttpError(
        400,
        'INVALID_COMMENT_LENGTH',
        'El comentario debe tener entre 30 y 300 caracteres.'
      );
    }

    const room = (db.rooms ?? []).find((r) => r?.id === payload.roomId);
    if (!room) {
      throw new ApiHttpError(404, 'ROOM_NOT_FOUND', 'La habitación no existe.');
    }

    const studentInfo =
      SEED_STUDENTS[payload.studentId] ?? {
        id: payload.studentId,
        name: this.getActiveDemoUserFn()?.fullName ?? 'Mateo Salazar',
        fullName: this.getActiveDemoUserFn()?.fullName ?? 'Mateo Salazar',
        facultad: this.getActiveDemoUserFn()?.facultad ?? 'Ciencias e Ingeniería',
        ciclo: '7.° ciclo',
      };

    const newReview: RoomReviewItem = {
      id: `rev-local-${Date.now()}`,
      contractId: payload.contractId || `cnt-local-${Date.now()}`,
      roomId: room.id,
      studentId: payload.studentId,
      landlordId: room.landlordId,
      rating,
      comment: trimmedComment.length > 0 ? trimmedComment : null,
      createdAt: new Date().toISOString(),
      student: {
        id: studentInfo.id,
        name: studentInfo.fullName,
        fullName: studentInfo.fullName,
        facultad: studentInfo.facultad,
        ciclo: studentInfo.ciclo,
      },
    };

    db.reviews.unshift(newReview);

    const landlordReviews = (db.reviews ?? []).filter(
      (rev) => rev?.landlordId === room.landlordId
    );
    const sum = landlordReviews.reduce((acc, item) => acc + (item?.rating ?? 5), 0);
    const avg =
      landlordReviews.length > 0
        ? Number((sum / landlordReviews.length).toFixed(2))
        : 0;

    if (db.landlords[room.landlordId]) {
      db.landlords[room.landlordId].averageRating = avg;
      db.landlords[room.landlordId].rating = avg;
      db.landlords[room.landlordId].totalReviews = landlordReviews.length;
      db.landlords[room.landlordId].reviewCount = landlordReviews.length;
    }

    db.rooms = (db.rooms ?? []).map((r) =>
      r.landlordId === room.landlordId
        ? {
            ...r,
            landlord: {
              ...r.landlord,
              rating: avg,
              reviewCount: landlordReviews.length,
              averageRating: avg,
              totalReviews: landlordReviews.length,
            },
          }
        : r
    );

    this.saveDb(db);

    return {
      review: newReview,
      landlordRating: {
        id: room.landlordId,
        fullName: db.landlords[room.landlordId]?.fullName ?? room.landlord.fullName,
        averageRating: avg,
        totalReviews: landlordReviews.length,
      },
    };
  }

  public async getRequests(
    params: RequestSearchParams = {}
  ): Promise<ContactRequestItem[]> {
    const db = this.loadDb();

    return (db.requests ?? [])
      .filter((req) => {
        if (params.studentId && !isSameStudentId(req?.studentId, params.studentId)) {
          return false;
        }
        if (params.roomId && req?.roomId !== params.roomId) return false;
        if (params.landlordId) {
          const room = (db.rooms ?? []).find((r) => r?.id === req?.roomId);
          const reqLandlordId = req?.landlordId ?? room?.landlordId;
          if (!isSameLandlordId(reqLandlordId, params.landlordId)) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b?.createdAt ?? 0).getTime() -
          new Date(a?.createdAt ?? 0).getTime()
      );
  }

  public async createRequest(
    payload: CreateRequestPayload
  ): Promise<ContactRequestItem> {
    const db = this.loadDb();
    const room = (db.rooms ?? []).find((r) => r?.id === payload.roomId);
    if (!room) {
      throw new ApiHttpError(404, 'ROOM_NOT_FOUND', 'La habitación no existe.');
    }

    const studentId = payload.studentId || STUDENT_MATEO_ID;
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const recentDuplicate = (db.requests ?? []).find(
      (req) =>
        isSameStudentId(req?.studentId, studentId) &&
        req?.roomId === payload.roomId &&
        Date.now() - new Date(req?.createdAt ?? 0).getTime() < fortyEightHoursMs
    );

    if (recentDuplicate) {
      throw new ApiHttpError(
        409,
        'DUPLICATE_REQUEST_WITHIN_48H',
        'Envío pausado por control de solicitudes (48h).'
      );
    }

    const seedStudent = SEED_STUDENTS[studentId] ?? SEED_STUDENTS[STUDENT_MATEO_ID];
    const studentName =
      seedStudent?.fullName ??
      this.getActiveDemoUserFn()?.fullName ??
      'Mateo Salazar';
    const studentFaculty =
      seedStudent?.facultad ??
      this.getActiveDemoUserFn()?.facultad ??
      'Ciencias e Ingeniería';

    const newReq = hydrateRequestItem(
      {
        id: 'req-' + Date.now(),
        roomId: room.id,
        roomTitle: room.title,
        roomDistrict: room.district,
        studentId: STUDENT_MATEO_ID,
        studentName,
        studentFaculty,
        landlordId: room.landlordId,
        message:
          payload.message?.trim() ||
          `Hola ${room.landlord?.fullName ?? 'Elena Vargas'}, me interesa coordinar una visita a "${room.title}".`,
        status: 'PENDIENTE',
        respondedAt: null,
        createdAt: new Date().toISOString(),
        whatsappRevealed: false,
      },
      db.rooms
    );

    const updatedRequests = saveRequestsToStorage(
      [newReq, ...(db.requests ?? [])],
      db.rooms
    );
    db.requests = updatedRequests;
    this.saveDb(db);

    this.onNotificationCreated?.({
      targetRole: 'ARRENDADOR',
      title: `Nueva solicitud de ${studentName}`,
      description: `${studentFaculty} solicitó información por "${room.title}".`,
      roomId: room.id,
    });

    return newReq;
  }

  public async updateRequestStatus(
    requestId: string,
    status: 'ACEPTADA' | 'RECHAZADA',
    _landlordId?: string
  ): Promise<ContactRequestItem> {
    const db = this.loadDb();
    const idx = (db.requests ?? []).findIndex((r) => r?.id === requestId);
    if (idx === -1) {
      throw new ApiHttpError(
        404,
        'REQUEST_NOT_FOUND',
        'La solicitud de contacto no existe.'
      );
    }

    const updatedItem = hydrateRequestItem(
      {
        ...db.requests[idx],
        status: status as ContactRequestStatus,
        respondedAt: new Date().toISOString(),
        whatsappRevealed: status === 'ACEPTADA',
      },
      db.rooms
    );

    const nextList = [...(db.requests ?? [])];
    nextList[idx] = updatedItem;
    db.requests = saveRequestsToStorage(nextList, db.rooms);
    this.saveDb(db);

    const room = (db.rooms ?? []).find((r) => r?.id === updatedItem.roomId);
    const landlord = room
      ? db.landlords[room.landlordId] ?? room.landlord
      : SEED_LANDLORDS[LANDLORD_ELENA_ID];

    if (status === 'ACEPTADA' && room) {
      this.onNotificationCreated?.({
        targetRole: 'ESTUDIANTE',
        title: `Solicitud aceptada por ${landlord?.fullName ?? 'Elena Vargas'}`,
        description: `Tu solicitud para "${room.title}" fue aceptada. Ya puedes contactar por WhatsApp.`,
        roomId: room.id,
        whatsappPhone: DEMO_SAFE_WHATSAPP,
        whatsappLabel: 'Abrir WhatsApp',
      });
    }

    return updatedItem;
  }

  public async cancelRequest(
    requestId: string,
    _studentId?: string
  ): Promise<ContactRequestItem> {
    const db = this.loadDb();
    const idx = (db.requests ?? []).findIndex((r) => r?.id === requestId);
    if (idx === -1) {
      throw new ApiHttpError(
        404,
        'REQUEST_NOT_FOUND',
        'La solicitud de contacto no existe.'
      );
    }

    const updatedItem = hydrateRequestItem(
      {
        ...db.requests[idx],
        status: 'CANCELADA',
        respondedAt: new Date().toISOString(),
        whatsappRevealed: false,
      },
      db.rooms
    );

    const nextList = [...(db.requests ?? [])];
    nextList[idx] = updatedItem;
    db.requests = saveRequestsToStorage(nextList, db.rooms);
    this.saveDb(db);
    return updatedItem;
  }

  public getActiveUser(): DemoUserProfile {
    return this.getActiveDemoUserFn();
  }

  public setActiveRole(role: 'ESTUDIANTE' | 'ARRENDADOR'): DemoUserProfile {
    return this.setActiveDemoRoleFn(role);
  }

  public async registerLandlord(payload: RegisterLandlordPayload): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return {
      status: 'success',
      user: {
        id: `landlord-local-${Date.now()}`,
        email: payload.email,
        fullName: payload.fullName || 'Propietario Verificado',
        role: 'ARRENDADOR',
        dni: payload.dni,
        partidaRegistral: payload.partidaRegistral,
        whatsapp: payload.whatsapp || DEMO_SAFE_WHATSAPP,
        isVerified: true,
      },
    };
  }

  public async ssoStudent(payload: SsoStudentPayload): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return {
      status: 'success',
      user: {
        id: STUDENT_MATEO_ID,
        email: payload.email,
        fullName: payload.fullName || 'Mateo Salazar',
        role: 'ESTUDIANTE',
        codigoPucp: payload.codigoPucp || '20210842',
        facultad: payload.facultad || 'Ciencias e Ingeniería',
        isVerified: true,
      },
    };
  }
}
