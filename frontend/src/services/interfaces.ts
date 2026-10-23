import {
  BathroomType,
  ContactRequestItem,
  RoomItem,
  RoomReviewItem,
  RoomStatus,
  RoomType,
} from '../types/room';

export interface DemoUserProfile {
  id: string;
  name: string;
  fullName: string;
  role: 'ESTUDIANTE' | 'ARRENDADOR';
  label: string;
  shortLabel: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  codigoPucp?: string;
  facultad?: string;
  ciclo?: string;
  dni?: string;
  partidaRegistral?: string;
  reniecVerified?: boolean;
  sunarpVerified?: boolean;
  isVerified: boolean;
  token: string;
}

export interface RoomSearchParams {
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  bathroomType?: BathroomType;
  isFurnished?: boolean;
  maxDistanceKm?: number;
  type?: RoomType;
  search?: string;
  sortBy?: 'distance_asc' | 'price_asc' | 'price_desc' | 'rating_desc' | 'date_desc';
  studentId?: string;
}

export interface CreateRoomPayload {
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

export interface UpdateRoomPayload {
  title?: string;
  type?: RoomType;
  district?: string;
  address?: string;
  monthlyPrice?: number;
  areaSqm?: number;
  bathroomType?: BathroomType;
  isFurnished?: boolean;
  includesWater?: boolean;
  includesElectricity?: boolean;
  includesWifi?: boolean;
  includedServices?: string[];
  description?: string;
  photos?: string[];
}

export interface CreateReviewPayload {
  contractId?: string;
  roomId: string;
  studentId: string;
  rating: number;
  comment?: string;
}

export interface CreateReviewResult {
  review: RoomReviewItem;
  landlordRating: {
    id?: string;
    fullName?: string;
    averageRating: number;
    totalReviews: number;
  };
}

export interface CreateRequestPayload {
  studentId: string;
  roomId: string;
  message?: string;
}

export interface RequestSearchParams {
  studentId?: string;
  landlordId?: string;
  roomId?: string;
}

export interface RegisterLandlordPayload {
  email: string;
  password?: string;
  fullName?: string;
  dni: string;
  partidaRegistral: string;
  whatsapp?: string;
}

export interface SsoStudentPayload {
  email: string;
  fullName?: string;
  codigoPucp?: string;
  facultad?: string;
}

export interface IRoomService {
  getRooms(params?: RoomSearchParams): Promise<RoomItem[]>;
  getRoomById(roomId: string, requesterUserId?: string): Promise<RoomItem>;
  getLandlordRooms(landlordId: string): Promise<RoomItem[]>;
  createRoom(payload: CreateRoomPayload): Promise<RoomItem>;
  updateRoom(roomId: string, payload: UpdateRoomPayload): Promise<RoomItem>;
  updateRoomStatus(
    roomId: string,
    status: RoomStatus,
    landlordId?: string
  ): Promise<RoomItem>;
  deleteRoom(roomId: string, landlordId?: string): Promise<void>;
  createReview(payload: CreateReviewPayload): Promise<CreateReviewResult>;
}

export interface IRequestService {
  getRequests(params?: RequestSearchParams): Promise<ContactRequestItem[]>;
  createRequest(payload: CreateRequestPayload): Promise<ContactRequestItem>;
  updateRequestStatus(
    requestId: string,
    status: 'ACEPTADA' | 'RECHAZADA',
    landlordId?: string
  ): Promise<ContactRequestItem>;
  cancelRequest(requestId: string, studentId?: string): Promise<ContactRequestItem>;
}

export interface IAuthService {
  getActiveUser(): DemoUserProfile;
  setActiveRole(role: 'ESTUDIANTE' | 'ARRENDADOR'): DemoUserProfile;
  registerLandlord(payload: RegisterLandlordPayload): Promise<unknown>;
  ssoStudent(payload: SsoStudentPayload): Promise<unknown>;
}
