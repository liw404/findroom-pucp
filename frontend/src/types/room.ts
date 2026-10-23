export type RoomType = 'INDIVIDUAL' | 'COMPARTIDA' | 'MINIDEPARTAMENTO' | 'ESTUDIO';
export type BathroomType = 'PRIVADO' | 'COMPARTIDO';
export type RoomStatus = 'DISPONIBLE' | 'ALQUILADO' | 'PAUSADO';
export type ContactRequestStatus = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';

export interface LandlordSummary {
  id: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  dni?: string | null;
  partidaRegistral?: string | null;
  whatsapp: string | null;
  whatsappMasked?: string;
  isVerified: boolean;
  reniecVerified?: boolean;
  sunarpVerified?: boolean;
  isReniecVerified?: boolean;
  isSunarpVerified?: boolean;
  rating: number;
  reviewCount: number;
  averageRating: number;
  totalReviews: number;
}

export interface RoomReviewItem {
  id: string;
  contractId: string;
  roomId: string;
  studentId: string;
  landlordId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  student?: {
    id: string;
    name?: string;
    fullName: string;
    facultad?: string | null;
    ciclo?: string | null;
  };
}

export interface StudentEvaluationItem {
  id: string;
  contractId?: string;
  studentId: string;
  landlordId: string;
  landlordName: string;
  roomTitle?: string;
  rating: number;
  tags: string[];
  comment: string;
  createdAt: string;
  periodLabel?: string;
}

export interface StudentPublicProfile {
  id: string;
  name: string;
  fullName: string;
  publicName: string;
  facultad: string;
  ciclo?: string;
  memberSince: string;
  averageRating: number;
  totalEvaluations: number;
  evaluations: StudentEvaluationItem[];
}

export interface TenantLeaseItem {
  id: string;
  roomId: string;
  roomTitle: string;
  district: string;
  studentId: string;
  studentName: string;
  studentFacultad: string;
  studentMemberSince: string;
  student: {
    id: string;
    name: string;
    fullName: string;
    facultad: string;
    memberSince: string;
  };
  landlordId: string;
  monthlyRent: number;
  status: 'ACTIVO' | 'FINALIZADO';
  periodLabel: string;
  createdAt: string;
  alreadyEvaluated?: boolean;
  studentEvaluation?: StudentEvaluationItem | null;
}

export interface ContactRequestItem {
  id: string;
  studentId: string;
  studentName?: string;
  studentFaculty?: string;
  roomId: string;
  roomTitle?: string;
  roomDistrict?: string;
  landlordId: string;
  message: string | null;
  status: ContactRequestStatus;
  respondedAt: string | null;
  createdAt: string;
  whatsappRevealed?: boolean;
  studentWhatsapp?: string;
  student?: {
    id: string;
    name?: string;
    fullName: string;
    email?: string;
    codigoPucp?: string | null;
    facultad?: string | null;
    ciclo?: string | null;
    memberSince?: string;
    averageRating?: number;
    totalEvaluations?: number;
    whatsapp?: string | null;
    phone?: string;
  };
  room?: RoomItem;
}

export interface RoomItem {
  id: string;
  landlordId: string;
  title: string;
  type: RoomType;
  district: string;
  address: string;
  monthlyPrice: number;
  areaSqm: number;
  bathroomType: BathroomType;
  isFurnished: boolean;
  includesWater: boolean;
  includesElectricity: boolean;
  includesWifi: boolean;
  includedServices: string[];
  description: string;
  photos: string[];
  distanceToPucpKm: number;
  walkingMinutesToPucp: number;
  status: RoomStatus;
  createdAt: string;
  updatedAt?: string;
  whatsappRevealed?: boolean;
  studentContactStatus?: ContactRequestStatus | null;
  latestContactRequest?: ContactRequestItem | null;
  eligibleContractForReview?: {
    id: string;
    status: string;
    review?: RoomReviewItem | null;
  } | null;
  landlord: LandlordSummary;
  reviews?: RoomReviewItem[];
  _count?: {
    reviews: number;
    contactRequests: number;
  };
}

export interface AppNotificationItem {
  id: string;
  targetRole: 'ESTUDIANTE' | 'ARRENDADOR';
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  roomId?: string;
  whatsappPhone?: string;
  whatsappLabel?: string;
}
