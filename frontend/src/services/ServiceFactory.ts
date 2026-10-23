import { toast } from 'sonner';
import {
  IAuthService,
  IRequestService,
  IRoomService,
} from './interfaces';
import { HttpService, NetworkConnectionError } from './HttpService';
import { LocalMockService } from './LocalMockService';

export class ServiceFactory {
  private forceMockMode: boolean;
  private hasNotifiedFallback = false;

  constructor(
    private readonly httpService: HttpService,
    private readonly localMockService: LocalMockService
  ) {
    // En modo demostración o cuando VITE_USE_MOCK !== 'false', priorizar el almacén reactivo local
    // para garantizar integridad relacional con usr-landlord-elena, usr-student-mateo y findroom_requests
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    this.forceMockMode = env?.VITE_USE_MOCK !== 'false';
  }

  public isUsingLocalMock(): boolean {
    return this.forceMockMode;
  }

  private activateFallbackMock(): void {
    this.forceMockMode = true;
    if (!this.hasNotifiedFallback) {
      this.hasNotifiedFallback = true;
      toast.info('Modo demostración local activo', {
        id: 'hybrid-fallback-toast',
        duration: 3000,
      });
    }
  }

  private async executeWithFallback<T>(
    httpCall: () => Promise<T>,
    mockCall: () => Promise<T>,
    syncLocalMockOnHttpSuccess?: () => Promise<unknown>
  ): Promise<T> {
    if (this.forceMockMode) {
      return mockCall();
    }

    try {
      const result = await httpCall();
      if (syncLocalMockOnHttpSuccess) {
        await syncLocalMockOnHttpSuccess().catch(() => {});
      }
      return result;
    } catch (error) {
      if (error instanceof NetworkConnectionError) {
        this.activateFallbackMock();
      }
      return mockCall();
    }
  }

  public createRoomService(): IRoomService {
    return {
      getRooms: (params) =>
        this.executeWithFallback(
          () => this.httpService.getRooms(params),
          () => this.localMockService.getRooms(params)
        ),
      getRoomById: (roomId, requesterUserId) =>
        this.executeWithFallback(
          () => this.httpService.getRoomById(roomId, requesterUserId),
          () => this.localMockService.getRoomById(roomId, requesterUserId)
        ),
      getLandlordRooms: async (landlordId) => {
        if (this.forceMockMode) {
          return this.localMockService.getLandlordRooms(landlordId);
        }
        try {
          const httpRooms = await this.httpService.getLandlordRooms(landlordId);
          if (Array.isArray(httpRooms) && httpRooms.length > 0) {
            return httpRooms;
          }
          return this.localMockService.getLandlordRooms(landlordId);
        } catch {
          return this.localMockService.getLandlordRooms(landlordId);
        }
      },
      createRoom: (payload) =>
        this.executeWithFallback(
          () => this.httpService.createRoom(payload),
          () => this.localMockService.createRoom(payload),
          () => this.localMockService.createRoom(payload)
        ),
      updateRoom: (roomId, payload) =>
        this.executeWithFallback(
          () => this.httpService.updateRoom(roomId, payload),
          () => this.localMockService.updateRoom(roomId, payload),
          () => this.localMockService.updateRoom(roomId, payload)
        ),
      updateRoomStatus: (roomId, status, landlordId) =>
        this.executeWithFallback(
          () => this.httpService.updateRoomStatus(roomId, status, landlordId),
          () => this.localMockService.updateRoomStatus(roomId, status, landlordId),
          () => this.localMockService.updateRoomStatus(roomId, status, landlordId)
        ),
      deleteRoom: (roomId, landlordId) =>
        this.executeWithFallback(
          () => this.httpService.deleteRoom(roomId, landlordId),
          () => this.localMockService.deleteRoom(roomId, landlordId),
          () => this.localMockService.deleteRoom(roomId, landlordId)
        ),
      createReview: (payload) =>
        this.executeWithFallback(
          () => this.httpService.createReview(payload),
          () => this.localMockService.createReview(payload),
          () => this.localMockService.createReview(payload)
        ),
    };
  }

  public createRequestService(): IRequestService {
    return {
      getRequests: (params) =>
        this.executeWithFallback(
          () => this.httpService.getRequests(params),
          () => this.localMockService.getRequests(params)
        ),
      createRequest: (payload) =>
        this.executeWithFallback(
          () => this.httpService.createRequest(payload),
          () => this.localMockService.createRequest(payload),
          () => this.localMockService.createRequest(payload)
        ),
      updateRequestStatus: (requestId, status, landlordId) =>
        this.executeWithFallback(
          () => this.httpService.updateRequestStatus(requestId, status, landlordId),
          () =>
            this.localMockService.updateRequestStatus(requestId, status, landlordId),
          () =>
            this.localMockService.updateRequestStatus(requestId, status, landlordId)
        ),
      cancelRequest: (requestId, studentId) =>
        this.executeWithFallback(
          () => this.httpService.cancelRequest(requestId, studentId),
          () => this.localMockService.cancelRequest(requestId, studentId),
          () => this.localMockService.cancelRequest(requestId, studentId)
        ),
    };
  }

  public createAuthService(): IAuthService {
    return {
      getActiveUser: () => this.localMockService.getActiveUser(),
      setActiveRole: (role) => this.localMockService.setActiveRole(role),
      registerLandlord: (payload) =>
        this.executeWithFallback(
          () => this.httpService.registerLandlord(payload),
          () => this.localMockService.registerLandlord(payload)
        ),
      ssoStudent: (payload) =>
        this.executeWithFallback(
          () => this.httpService.ssoStudent(payload),
          () => this.localMockService.ssoStudent(payload)
        ),
    };
  }
}
