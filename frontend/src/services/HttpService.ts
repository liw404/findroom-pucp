import {
  ContactRequestItem,
  RoomItem,
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
import { ApiHttpError } from './LocalMockService';

export class NetworkConnectionError extends Error {
  constructor(message = 'No se pudo establecer conexión con el servidor HTTP.') {
    super(message);
    this.name = 'NetworkConnectionError';
  }
}

export class HttpService implements IRoomService, IRequestService, IAuthService {
  constructor(
    public readonly baseUrl: string,
    private readonly getHeadersFn: (extra?: HeadersInit) => Record<string, string>,
    private readonly getActiveDemoUserFn: () => DemoUserProfile,
    private readonly setActiveDemoRoleFn: (
      role: 'ESTUDIANTE' | 'ARRENDADOR'
    ) => DemoUserProfile
  ) {}

  public async rawRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: this.getHeadersFn(options.headers),
      });
    } catch (err) {
      throw new NetworkConnectionError(
        err instanceof Error ? err.message : 'Fallo de conexión HTTP'
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiHttpError(
        response.status,
        data.code || 'API_ERROR',
        data.message || `Error HTTP ${response.status}`,
        data.details
      );
    }

    return data as T;
  }

  public async getRooms(params: RoomSearchParams = {}): Promise<RoomItem[]> {
    const query = new URLSearchParams();
    if (params.district && params.district !== 'TODOS') {
      query.set('district', params.district);
    }
    if (params.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
    if (params.bathroomType) query.set('bathroomType', params.bathroomType);
    if (params.isFurnished !== undefined) {
      query.set('isFurnished', String(params.isFurnished));
    }
    if (params.maxDistanceKm !== undefined) {
      query.set('maxDistanceKm', String(params.maxDistanceKm));
    }
    if (params.type) query.set('type', params.type);
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.studentId) query.set('studentId', params.studentId);

    const qs = query.toString();
    const res = await this.rawRequest<{ status: string; rooms: RoomItem[] }>(
      `/rooms${qs ? `?${qs}` : ''}`
    );
    return res.rooms;
  }

  public async getRoomById(
    roomId: string,
    requesterUserId?: string
  ): Promise<RoomItem> {
    const userId = requesterUserId || this.getActiveDemoUserFn().id;
    const activeRole = this.getActiveDemoUserFn().role;
    const queryParam =
      activeRole === 'ESTUDIANTE'
        ? `?studentId=${encodeURIComponent(userId)}`
        : `?userId=${encodeURIComponent(userId)}`;

    const res = await this.rawRequest<{ status: string; room: RoomItem }>(
      `/rooms/${roomId}${queryParam}`
    );
    return res.room;
  }

  public async getLandlordRooms(landlordId: string): Promise<RoomItem[]> {
    const res = await this.rawRequest<{ status: string; rooms: RoomItem[] }>(
      `/rooms/landlord/${landlordId}`
    );
    return res.rooms;
  }

  public async createRoom(payload: CreateRoomPayload): Promise<RoomItem> {
    const res = await this.rawRequest<{ status: string; room: RoomItem }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.room;
  }

  public async updateRoom(
    roomId: string,
    payload: UpdateRoomPayload
  ): Promise<RoomItem> {
    const res = await this.rawRequest<{ status: string; room: RoomItem }>(
      `/rooms/${roomId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return res.room;
  }

  public async updateRoomStatus(
    roomId: string,
    status: RoomStatus,
    landlordId?: string
  ): Promise<RoomItem> {
    const res = await this.rawRequest<{ status: string; room: RoomItem }>(
      `/rooms/${roomId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, landlordId }),
      }
    );
    return res.room;
  }

  public async deleteRoom(roomId: string, landlordId?: string): Promise<void> {
    await this.rawRequest(`/rooms/${roomId}`, {
      method: 'DELETE',
      body: JSON.stringify({ landlordId }),
    });
  }

  public async createReview(
    payload: CreateReviewPayload
  ): Promise<CreateReviewResult> {
    return this.rawRequest<CreateReviewResult>('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getRequests(
    params: RequestSearchParams = {}
  ): Promise<ContactRequestItem[]> {
    const query = new URLSearchParams();
    if (params.studentId) query.set('studentId', params.studentId);
    if (params.landlordId) query.set('landlordId', params.landlordId);
    if (params.roomId) query.set('roomId', params.roomId);

    const qs = query.toString();
    const res = await this.rawRequest<{
      status: string;
      requests: ContactRequestItem[];
    }>(`/requests${qs ? `?${qs}` : ''}`);
    return res.requests;
  }

  public async createRequest(
    payload: CreateRequestPayload
  ): Promise<ContactRequestItem> {
    const res = await this.rawRequest<{
      status: string;
      request: ContactRequestItem;
    }>('/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.request;
  }

  public async updateRequestStatus(
    requestId: string,
    status: 'ACEPTADA' | 'RECHAZADA',
    landlordId?: string
  ): Promise<ContactRequestItem> {
    const res = await this.rawRequest<{
      status: string;
      request: ContactRequestItem;
    }>(`/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, landlordId }),
    });
    return res.request;
  }

  public async cancelRequest(
    requestId: string,
    studentId?: string
  ): Promise<ContactRequestItem> {
    const res = await this.rawRequest<{
      status: string;
      request: ContactRequestItem;
    }>(`/requests/${requestId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ studentId }),
    });
    return res.request;
  }

  public getActiveUser(): DemoUserProfile {
    return this.getActiveDemoUserFn();
  }

  public setActiveRole(role: 'ESTUDIANTE' | 'ARRENDADOR'): DemoUserProfile {
    return this.setActiveDemoRoleFn(role);
  }

  public async registerLandlord(payload: RegisterLandlordPayload): Promise<unknown> {
    return this.rawRequest('/auth/register-landlord', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async ssoStudent(payload: SsoStudentPayload): Promise<unknown> {
    return this.rawRequest('/auth/sso-student', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
