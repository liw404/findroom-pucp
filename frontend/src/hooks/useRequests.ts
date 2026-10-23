import { useCallback, useEffect, useState } from 'react';
import { ContactRequestItem, ContactRequestStatus, RoomItem } from '../types/room';
import {
  DEMO_SAFE_WHATSAPP,
  INITIAL_REQUESTS,
  INITIAL_ROOMS,
  LANDLORD_ELENA_ID,
  SEED_IDS,
  SEED_LANDLORDS,
  SEED_STUDENTS,
  STUDENT_MATEO_ID,
} from '../services/seedData';

export const REQUESTS_STORAGE_KEY = 'findroom_requests';

type RequestsListener = (items: ContactRequestItem[]) => void;
const listeners = new Set<RequestsListener>();

function maskWhatsapp(raw?: string | null): string {
  if (!raw) return '+51 987 ••• •21';
  const digits = raw.replace(/\D/g, '');
  const lastTwo = digits.slice(-2) || '21';
  return `+51 987 ••• •${lastTwo}`;
}

export function hydrateRequestItem(
  rawReq: Partial<ContactRequestItem>,
  roomsPool: RoomItem[] = INITIAL_ROOMS
): ContactRequestItem {
  const room =
    rawReq.room ??
    roomsPool.find((r) => r?.id === rawReq.roomId) ??
    INITIAL_ROOMS.find((r) => r?.id === rawReq.roomId);

  const studentId = rawReq.studentId || STUDENT_MATEO_ID;
  const seedStudent =
    SEED_STUDENTS[studentId] ?? SEED_STUDENTS[STUDENT_MATEO_ID];

  const studentName =
    rawReq.studentName ??
    rawReq.student?.fullName ??
    rawReq.student?.name ??
    seedStudent?.fullName ??
    'Mateo Salazar';

  const studentFaculty =
    rawReq.studentFaculty ??
    rawReq.student?.facultad ??
    seedStudent?.facultad ??
    'Ciencias e Ingeniería';

  const landlordId =
    rawReq.landlordId ??
    room?.landlordId ??
    room?.landlord?.id ??
    LANDLORD_ELENA_ID;

  const isAccepted = rawReq.status === 'ACEPTADA';
  const landlordSummary =
    room?.landlord ??
    SEED_LANDLORDS[landlordId] ??
    SEED_LANDLORDS[LANDLORD_ELENA_ID];

  return {
    id: rawReq.id || `req-${Date.now()}`,
    roomId: rawReq.roomId || room?.id || SEED_IDS.ROOM_3,
    roomTitle: rawReq.roomTitle ?? room?.title ?? 'Habitación Universitaria',
    roomDistrict: rawReq.roomDistrict ?? room?.district ?? 'San Miguel',
    studentId,
    studentName,
    studentFaculty,
    landlordId,
    message:
      rawReq.message ??
      `Hola ${landlordSummary?.fullName ?? 'Elena Vargas'}, soy ${studentName} de la PUCP y me interesa coordinar una visita.`,
    status: (rawReq.status as ContactRequestStatus) || 'PENDIENTE',
    respondedAt: rawReq.respondedAt ?? null,
    createdAt: rawReq.createdAt || new Date().toISOString(),
    whatsappRevealed: isAccepted,
    student: {
      id: studentId,
      name: studentName,
      fullName: studentName,
      email: rawReq.student?.email ?? seedStudent?.email ?? 'mateo.salazar@pucp.edu.pe',
      codigoPucp: rawReq.student?.codigoPucp ?? seedStudent?.codigoPucp ?? '20210842',
      facultad: studentFaculty,
      ciclo: rawReq.student?.ciclo ?? seedStudent?.ciclo ?? '7.° ciclo',
      memberSince: rawReq.student?.memberSince ?? seedStudent?.memberSince ?? 'marzo 2025',
      averageRating: rawReq.student?.averageRating ?? seedStudent?.averageRating ?? 4.9,
      totalEvaluations:
        rawReq.student?.totalEvaluations ?? seedStudent?.totalEvaluations ?? 2,
      phone: '987654321',
      whatsapp: DEMO_SAFE_WHATSAPP,
    },
    room: room
      ? {
          ...room,
          landlord: {
            ...landlordSummary,
            whatsapp: isAccepted ? DEMO_SAFE_WHATSAPP : null,
            whatsappMasked: maskWhatsapp(landlordSummary?.whatsapp),
          },
        }
      : undefined,
  };
}

export function loadRequestsFromStorage(
  roomsPool: RoomItem[] = INITIAL_ROOMS
): ContactRequestItem[] {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => hydrateRequestItem(item, roomsPool));
      }
    }
  } catch {
    // Fallback a datos semilla
  }

  const seeded = INITIAL_REQUESTS.map((item) =>
    hydrateRequestItem(item, roomsPool)
  );
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    // Ignorar error de almacenamiento
  }
  return seeded;
}

export function saveRequestsToStorage(
  items: ContactRequestItem[],
  roomsPool: RoomItem[] = INITIAL_ROOMS
): ContactRequestItem[] {
  const hydrated = (items ?? []).map((item) =>
    hydrateRequestItem(item, roomsPool)
  );
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(hydrated));
  } catch {
    // Ignorar error de almacenamiento
  }
  listeners.forEach((listener) => listener(hydrated));
  return hydrated;
}

export function subscribeRequests(listener: RequestsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRequests() {
  const [requests, setRequests] = useState<ContactRequestItem[]>(() =>
    loadRequestsFromStorage()
  );

  useEffect(() => {
    setRequests(loadRequestsFromStorage());
    const unsubscribe = subscribeRequests((updated) => {
      setRequests(updated);
    });

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === REQUESTS_STORAGE_KEY || e.key === null) {
        setRequests(loadRequestsFromStorage());
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const refreshRequests = useCallback(() => {
    const latest = loadRequestsFromStorage();
    setRequests(latest);
    return latest;
  }, []);

  const getRoomRequestForStudent = useCallback(
    (roomId?: string, studentId?: string): ContactRequestItem | undefined => {
      if (!roomId) return undefined;
      const targetStudent = studentId || STUDENT_MATEO_ID;
      const matching = (requests ?? [])
        .filter(
          (req) =>
            req?.roomId === roomId &&
            (req?.studentId === targetStudent ||
              req?.student?.id === targetStudent ||
              (targetStudent === STUDENT_MATEO_ID &&
                req?.studentId === SEED_IDS.STUDENT_MATEO_LEGACY))
        )
        .sort(
          (a, b) =>
            new Date(b?.createdAt ?? 0).getTime() -
            new Date(a?.createdAt ?? 0).getTime()
        );
      return matching[0];
    },
    [requests]
  );

  return {
    requests,
    refreshRequests,
    getRoomRequestForStudent,
  };
}

export default useRequests;
