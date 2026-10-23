import {
  AppNotificationItem,
  StudentEvaluationItem,
  StudentPublicProfile,
  TenantLeaseItem,
} from '../types/room';
import { DemoUserProfile } from './interfaces';
import { HttpService } from './HttpService';
import { ApiHttpError, LocalMockService } from './LocalMockService';
import { ServiceFactory } from './ServiceFactory';
import {
  DEMO_SAFE_PHONE,
  DEMO_SAFE_WHATSAPP,
  DEMO_SAFE_WHATSAPP_DIGITS,
  INITIAL_NOTIFICATIONS,
  INITIAL_STUDENT_EVALUATIONS,
  INITIAL_TENANT_LEASES,
  LANDLORD_ELENA_ID,
  SEED_IDS,
  SEED_STUDENTS,
  STUDENT_MATEO_ID,
} from './seedData';
import {
  getFavoriteRoomIds,
  isRoomFavorite,
  subscribeFavorites,
  toggleFavoriteRoom,
  useFavorites,
} from '../hooks/useFavorites';
import {
  hydrateRequestItem,
  loadRequestsFromStorage,
  REQUESTS_STORAGE_KEY,
  saveRequestsToStorage,
  subscribeRequests,
  useRequests,
} from '../hooks/useRequests';

export * from './interfaces';
export { ApiHttpError, LocalMockService } from './LocalMockService';
export { HttpService, NetworkConnectionError } from './HttpService';
export { ServiceFactory } from './ServiceFactory';
export {
  DEMO_SAFE_PHONE,
  DEMO_SAFE_WHATSAPP,
  DEMO_SAFE_WHATSAPP_DIGITS,
  LANDLORD_ELENA_ID,
  STUDENT_MATEO_ID,
};
export {
  getFavoriteRoomIds,
  isRoomFavorite,
  subscribeFavorites,
  toggleFavoriteRoom,
  useFavorites,
};
export {
  hydrateRequestItem,
  loadRequestsFromStorage,
  REQUESTS_STORAGE_KEY,
  saveRequestsToStorage,
  subscribeRequests,
  useRequests,
};

export const API_BASE_URL = 'http://localhost:3001/api';

export type UserRole = 'ESTUDIANTE' | 'ARRENDADOR' | 'ADMIN';

// ==========================================
// 0. Migración y Limpieza Automática de Cache (localStorage: findroom_v4)
// ==========================================
export const STORAGE_VERSION = 'findroom_v4';
const STORAGE_VERSION_KEY = 'findroom_storage_version';
const ROLE_STORAGE_KEY = 'findroom_active_demo_role';
const NOTIFICATIONS_STORAGE_KEY = 'findroom_notifications_v6';
const STUDENT_EVALUATIONS_STORAGE_KEY = 'findroom_student_evaluations_v3';
const TENANT_LEASES_STORAGE_KEY = 'findroom_tenant_leases_v3';

export function ensureStorageMigration(): void {
  if (typeof window === 'undefined') return;
  try {
    const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (currentVersion !== STORAGE_VERSION) {
      const preservedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('findroom_')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);

      if (preservedRole === 'ARRENDADOR' || preservedRole === 'ESTUDIANTE') {
        localStorage.setItem(ROLE_STORAGE_KEY, preservedRole);
      }
    }
  } catch {
    // Ignorar errores de almacenamiento privado
  }
}

// Ejecutar migración inmediatamente antes de hidratar stores
ensureStorageMigration();

export const DEMO_PROFILES: Record<'ESTUDIANTE' | 'ARRENDADOR', DemoUserProfile> = {
  ESTUDIANTE: {
    id: STUDENT_MATEO_ID,
    name: 'Mateo Salazar',
    fullName: 'Mateo Salazar',
    role: 'ESTUDIANTE',
    label: 'Estudiante (Mateo Salazar)',
    shortLabel: 'Mateo Salazar',
    email: 'mateo.salazar@pucp.edu.pe',
    codigoPucp: '20210842',
    facultad: 'Ciencias e Ingeniería',
    ciclo: '7.° ciclo',
    phone: '987654321',
    whatsapp: DEMO_SAFE_WHATSAPP,
    isVerified: true,
    token: STUDENT_MATEO_ID,
  },
  ARRENDADOR: {
    id: LANDLORD_ELENA_ID,
    name: 'Elena Vargas',
    fullName: 'Elena Vargas',
    role: 'ARRENDADOR',
    label: 'Arrendador (Elena Vargas)',
    shortLabel: 'Elena Vargas',
    email: 'elena.vargas@findroom.pe',
    phone: '987654321',
    whatsapp: DEMO_SAFE_WHATSAPP,
    dni: '43910285',
    partidaRegistral: '11294850',
    reniecVerified: true,
    sunarpVerified: true,
    isVerified: true,
    token: LANDLORD_ELENA_ID,
  },
};

// ==========================================
// 1. Gestión reactiva de Rol Activo e Hidratación Segura
// ==========================================
type RoleListener = (profile: DemoUserProfile) => void;
const roleListeners = new Set<RoleListener>();

function loadInitialProfile(): DemoUserProfile {
  try {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      if (path.startsWith('/landlord') || path.startsWith('/panel-arrendador')) {
        localStorage.setItem(ROLE_STORAGE_KEY, 'ARRENDADOR');
        return DEMO_PROFILES.ARRENDADOR;
      }
    }
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    if (saved === 'ARRENDADOR' || saved === 'ESTUDIANTE') {
      return DEMO_PROFILES[saved];
    }
  } catch {
    // Fallback en memoria
  }
  return DEMO_PROFILES.ESTUDIANTE;
}

let currentDemoProfile: DemoUserProfile = loadInitialProfile();

export function getActiveDemoUser(): DemoUserProfile {
  return currentDemoProfile ?? DEMO_PROFILES.ESTUDIANTE;
}

export function setActiveDemoRole(role: 'ESTUDIANTE' | 'ARRENDADOR'): DemoUserProfile {
  currentDemoProfile = DEMO_PROFILES[role] ?? DEMO_PROFILES.ESTUDIANTE;
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  } catch {
    // Ignorar error de almacenamiento
  }
  roleListeners.forEach((listener) => listener(currentDemoProfile));
  return currentDemoProfile;
}

export function subscribeDemoUser(listener: RoleListener): () => void {
  roleListeners.add(listener);
  return () => {
    roleListeners.delete(listener);
  };
}

// ==========================================
// 2. Centro de Notificaciones (localStorage)
// ==========================================
type NotificationsListener = (items: AppNotificationItem[]) => void;
const notificationsListeners = new Set<NotificationsListener>();

function loadInitialNotifications(): AppNotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Fallback
  }
  const initial = JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS));
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // Ignorar
  }
  return initial;
}

let currentNotifications: AppNotificationItem[] = loadInitialNotifications();

export function getNotificationsForRole(
  role: 'ESTUDIANTE' | 'ARRENDADOR'
): AppNotificationItem[] {
  return (currentNotifications ?? []).filter((n) => n?.targetRole === role);
}

export function addAppNotification(notif: {
  targetRole: 'ESTUDIANTE' | 'ARRENDADOR';
  title: string;
  description: string;
  roomId?: string;
  whatsappPhone?: string;
  whatsappLabel?: string;
  whatsappText?: string;
}): AppNotificationItem {
  const created: AppNotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    targetRole: notif.targetRole,
    title: notif.title,
    description: notif.description,
    createdAt: 'Hace un momento',
    read: false,
    roomId: notif.roomId,
    whatsappPhone: notif.whatsappPhone,
    whatsappLabel: notif.whatsappLabel,
  };

  currentNotifications = [created, ...(currentNotifications ?? [])];
  try {
    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(currentNotifications)
    );
  } catch {
    // Ignorar
  }

  notificationsListeners.forEach((listener) => listener(currentNotifications));
  return created;
}

export function markAllNotificationsRead(role: 'ESTUDIANTE' | 'ARRENDADOR'): void {
  currentNotifications = (currentNotifications ?? []).map((n) =>
    n.targetRole === role ? { ...n, read: true } : n
  );
  try {
    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(currentNotifications)
    );
  } catch {
    // Ignorar
  }
  notificationsListeners.forEach((listener) => listener(currentNotifications));
}

export function markNotificationRead(notificationId: string): void {
  currentNotifications = (currentNotifications ?? []).map((n) =>
    n.id === notificationId ? { ...n, read: true } : n
  );
  try {
    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(currentNotifications)
    );
  } catch {
    // Ignorar
  }
  notificationsListeners.forEach((listener) => listener(currentNotifications));
}

export function subscribeNotifications(listener: NotificationsListener): () => void {
  notificationsListeners.add(listener);
  return () => {
    notificationsListeners.delete(listener);
  };
}

// ==========================================
// 3. Evaluaciones a Estudiantes y Arriendos (localStorage)
// ==========================================
type StudentEvaluationsListener = () => void;
const studentEvaluationListeners = new Set<StudentEvaluationsListener>();

function loadStudentEvaluations(): StudentEvaluationItem[] {
  try {
    const raw = localStorage.getItem(STUDENT_EVALUATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Fallback
  }
  const initial: StudentEvaluationItem[] = JSON.parse(
    JSON.stringify(INITIAL_STUDENT_EVALUATIONS)
  );
  try {
    localStorage.setItem(STUDENT_EVALUATIONS_STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // Ignorar
  }
  return initial;
}

function saveStudentEvaluations(items: StudentEvaluationItem[]): void {
  try {
    localStorage.setItem(STUDENT_EVALUATIONS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignorar
  }
}

function normalizeTenantLease(lease: Partial<TenantLeaseItem>): TenantLeaseItem {
  const seedStudent =
    SEED_STUDENTS[lease.studentId ?? ''] ?? SEED_STUDENTS[STUDENT_MATEO_ID];
  const fullName =
    lease.student?.fullName ??
    lease.student?.name ??
    lease.studentName ??
    seedStudent?.fullName ??
    'Mateo Salazar';
  const facultad =
    lease.student?.facultad ??
    lease.studentFacultad ??
    seedStudent?.facultad ??
    'Ciencias e Ingeniería';
  const rawMemberSince =
    lease.student?.memberSince ??
    lease.studentMemberSince ??
    seedStudent?.memberSince ??
    'marzo 2025';
  const cleanMemberSince = rawMemberSince.replace(/^Miembro desde\s+/i, '');

  return {
    id: lease.id ?? `lease-${Date.now()}`,
    roomId: lease.roomId ?? SEED_IDS.ROOM_3,
    roomTitle:
      lease.roomTitle ??
      'Habitación individual con escritorio amplio frente a parque',
    district: lease.district ?? 'San Miguel',
    studentId: lease.studentId ?? STUDENT_MATEO_ID,
    studentName: fullName,
    studentFacultad: facultad,
    studentMemberSince: cleanMemberSince,
    student: {
      id: lease.studentId ?? STUDENT_MATEO_ID,
      name: fullName,
      fullName,
      facultad,
      memberSince: cleanMemberSince,
    },
    landlordId: lease.landlordId ?? LANDLORD_ELENA_ID,
    monthlyRent: lease.monthlyRent ?? 750,
    status: lease.status ?? 'FINALIZADO',
    periodLabel: lease.periodLabel ?? 'Ciclo 2025-II',
    createdAt: lease.createdAt ?? new Date().toISOString(),
    alreadyEvaluated: Boolean(lease.alreadyEvaluated),
    studentEvaluation: lease.studentEvaluation ?? null,
  };
}

function loadTenantLeases(): TenantLeaseItem[] {
  try {
    const raw = localStorage.getItem(TENANT_LEASES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => normalizeTenantLease(item));
      }
    }
  } catch {
    // Fallback
  }
  const initial: TenantLeaseItem[] = JSON.parse(
    JSON.stringify(INITIAL_TENANT_LEASES)
  ).map((item: Partial<TenantLeaseItem>) => normalizeTenantLease(item));
  try {
    localStorage.setItem(TENANT_LEASES_STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // Ignorar
  }
  return initial;
}

function saveTenantLeases(items: TenantLeaseItem[]): void {
  try {
    localStorage.setItem(TENANT_LEASES_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignorar
  }
}

/**
 * Obtiene la ficha pública resumida del estudiante para el arrendador.
 * Protege estrictamente la confidencialidad omitiendo código universitario y correo PUCP.
 */
export function getStudentPublicProfile(
  studentId: string,
  fallback?: {
    fullName?: string;
    facultad?: string;
    memberSince?: string;
  }
): StudentPublicProfile {
  const isMateo =
    studentId === STUDENT_MATEO_ID ||
    studentId === SEED_IDS.STUDENT_MATEO_LEGACY;
  const seedStudent =
    SEED_STUDENTS[studentId] ??
    (isMateo ? SEED_STUDENTS[STUDENT_MATEO_ID] : undefined);

  const allEvaluations = loadStudentEvaluations();
  const studentEvaluations = (allEvaluations ?? [])
    .filter(
      (ev) =>
        ev?.studentId === studentId ||
        (isMateo &&
          (ev?.studentId === STUDENT_MATEO_ID ||
            ev?.studentId === SEED_IDS.STUDENT_MATEO_LEGACY))
    )
    .sort(
      (a, b) =>
        new Date(b?.createdAt ?? 0).getTime() -
        new Date(a?.createdAt ?? 0).getTime()
    );

  const totalEvaluations = studentEvaluations.length;
  const averageRating =
    totalEvaluations > 0
      ? Number(
          (
            studentEvaluations.reduce((acc, item) => acc + (item?.rating ?? 5), 0) /
            totalEvaluations
          ).toFixed(2)
        )
      : (seedStudent?.averageRating ?? 5.0);

  const resolvedName =
    fallback?.fullName ?? seedStudent?.fullName ?? 'Mateo Salazar';
  const rawMemberSince =
    fallback?.memberSince ?? seedStudent?.memberSince ?? 'marzo 2025';
  const cleanMemberSince = rawMemberSince.replace(/^Miembro desde\s+/i, '');

  return {
    id: studentId,
    name: resolvedName,
    fullName: resolvedName,
    publicName: resolvedName,
    facultad:
      fallback?.facultad ?? seedStudent?.facultad ?? 'Ciencias e Ingeniería',
    memberSince: cleanMemberSince,
    averageRating,
    totalEvaluations,
    evaluations: studentEvaluations,
  };
}

export function getTenantLeasesForLandlord(landlordId?: string): TenantLeaseItem[] {
  const leases = loadTenantLeases();
  const evaluations = loadStudentEvaluations();
  const isElena =
    !landlordId ||
    landlordId === LANDLORD_ELENA_ID ||
    landlordId === 'usr-landlord-1' ||
    landlordId === SEED_IDS.LANDLORD_ELENA_LEGACY;

  return (leases ?? [])
    .filter((l) => {
      if (!landlordId) return true;
      if (l?.landlordId === landlordId) return true;
      if (
        isElena &&
        (l?.landlordId === LANDLORD_ELENA_ID ||
          l?.landlordId === 'usr-landlord-1' ||
          l?.landlordId === SEED_IDS.LANDLORD_ELENA_LEGACY)
      ) {
        return true;
      }
      return false;
    })
    .map((lease) => {
      const normalized = normalizeTenantLease(lease);
      const evaluated = (evaluations ?? []).some(
        (ev) =>
          (ev?.contractId && ev.contractId === normalized.id) ||
          (ev?.studentId === normalized.studentId &&
            (ev?.landlordId === landlordId ||
              (isElena &&
                (ev?.landlordId === LANDLORD_ELENA_ID ||
                  ev?.landlordId === 'usr-landlord-1' ||
                  ev?.landlordId === SEED_IDS.LANDLORD_ELENA_LEGACY))) &&
            normalized.alreadyEvaluated)
      );
      return {
        ...normalized,
        alreadyEvaluated: Boolean(normalized.alreadyEvaluated || evaluated),
      };
    });
}

export function getStudentLeaseWithLandlord(
  studentId: string,
  landlordId?: string
): TenantLeaseItem | null {
  const leases = getTenantLeasesForLandlord(landlordId);
  const isMateo =
    studentId === STUDENT_MATEO_ID ||
    studentId === SEED_IDS.STUDENT_MATEO_LEGACY;
  return (
    (leases ?? []).find(
      (l) =>
        l?.studentId === studentId ||
        (isMateo &&
          (l?.studentId === STUDENT_MATEO_ID ||
            l?.studentId === SEED_IDS.STUDENT_MATEO_LEGACY))
    ) ?? null
  );
}

export function createStudentEvaluation(payload: {
  contractId?: string;
  studentId: string;
  landlordId: string;
  landlordName: string;
  roomTitle?: string;
  rating: number;
  comment: string;
  tags: string[];
}): {
  evaluation: StudentEvaluationItem;
  newAverageRating: number;
  totalEvaluations: number;
} {
  const rating = Number(payload.rating);
  const trimmedComment = (payload.comment ?? '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiHttpError(
      400,
      'INVALID_RATING',
      'La calificación debe ser entre 1 y 5 estrellas.'
    );
  }

  if (trimmedComment.length < 30 || trimmedComment.length > 300) {
    throw new ApiHttpError(
      400,
      'INVALID_COMMENT_LENGTH',
      'El comentario debe tener entre 30 y 300 caracteres.'
    );
  }

  const leases = loadTenantLeases();
  const matchingLease = (leases ?? []).find(
    (l) =>
      (payload.contractId && l.id === payload.contractId) ||
      (l.studentId === payload.studentId &&
        (l.landlordId === payload.landlordId ||
          l.landlordId === LANDLORD_ELENA_ID ||
          l.landlordId === 'usr-landlord-1' ||
          l.landlordId === SEED_IDS.LANDLORD_ELENA_LEGACY))
  );

  if (matchingLease && matchingLease.status !== 'FINALIZADO') {
    throw new ApiHttpError(
      409,
      'LEASE_NOT_FINISHED',
      'Solo se puede calificar al inquilino cuando el contrato tiene estado Finalizado.'
    );
  }

  const evaluations = loadStudentEvaluations();
  const newEval: StudentEvaluationItem = {
    id: `stev-local-${Date.now()}`,
    contractId: payload.contractId ?? matchingLease?.id,
    studentId: payload.studentId,
    landlordId: payload.landlordId,
    landlordName: payload.landlordName,
    roomTitle: payload.roomTitle ?? matchingLease?.roomTitle,
    rating,
    comment: trimmedComment,
    tags: payload.tags,
    createdAt: new Date().toISOString(),
  };

  const updatedEvaluations = [newEval, ...(evaluations ?? [])];
  saveStudentEvaluations(updatedEvaluations);

  if (matchingLease) {
    const updatedLeases = (leases ?? []).map((l) =>
      l.id === matchingLease.id ? { ...l, alreadyEvaluated: true } : l
    );
    saveTenantLeases(updatedLeases);
  }

  const studentEvals = updatedEvaluations.filter(
    (ev) => ev?.studentId === payload.studentId
  );
  const newAverageRating = Number(
    (
      studentEvals.reduce((acc, item) => acc + (item?.rating ?? 5), 0) /
      studentEvals.length
    ).toFixed(2)
  );

  studentEvaluationListeners.forEach((listener) => listener());

  return {
    evaluation: newEval,
    newAverageRating,
    totalEvaluations: studentEvals.length,
  };
}

export function subscribeStudentEvaluations(
  listener: StudentEvaluationsListener
): () => void {
  studentEvaluationListeners.add(listener);
  return () => {
    studentEvaluationListeners.delete(listener);
  };
}

// ==========================================
// 4. Cabeceras y Service Factory Dual-Mode
// ==========================================
export function getAuthHeaders(extraHeaders?: HeadersInit): Record<string, string> {
  const active = getActiveDemoUser();
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${active?.token ?? ''}`,
    'x-user-id': active?.id ?? '',
    'x-demo-role': active?.role ?? 'ESTUDIANTE',
  };

  if (active?.role === 'ESTUDIANTE') {
    baseHeaders['x-student-id'] = active.id;
  } else if (active?.role === 'ARRENDADOR') {
    baseHeaders['x-landlord-id'] = active.id;
  }

  if (extraHeaders) {
    const normalized = new Headers(extraHeaders);
    normalized.forEach((value, key) => {
      baseHeaders[key] = value;
    });
  }

  return baseHeaders;
}

const httpServiceInstance = new HttpService(
  API_BASE_URL,
  getAuthHeaders,
  getActiveDemoUser,
  setActiveDemoRole
);

const localMockServiceInstance = new LocalMockService(
  getActiveDemoUser,
  setActiveDemoRole,
  addAppNotification
);

export const serviceFactory = new ServiceFactory(
  httpServiceInstance,
  localMockServiceInstance
);

export const roomService = serviceFactory.createRoomService();
export const requestService = serviceFactory.createRequestService();
export const authService = serviceFactory.createAuthService();

export const api = {
  baseUrl: API_BASE_URL,
  rooms: roomService,
  requests: requestService,
  auth: authService,
};

export default api;
