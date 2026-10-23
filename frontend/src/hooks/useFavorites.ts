import { useCallback, useEffect, useState } from 'react';
import { INITIAL_ROOMS, SEED_IDS } from '../services/seedData';

export const FAVORITES_STORAGE_KEY = 'findroom_favorites';

type FavoritesSubscriber = (ids: string[]) => void;
const subscribers = new Set<FavoritesSubscriber>();

const LEGACY_ID_MAP: Record<string, string> = {
  '33333333-3333-4333-8333-333333333301': SEED_IDS.ROOM_1,
  '33333333-3333-4333-8333-333333333302': SEED_IDS.ROOM_2,
  '33333333-3333-4333-8333-333333333303': SEED_IDS.ROOM_3,
  '33333333-3333-4333-8333-333333333304': SEED_IDS.ROOM_4,
  '33333333-3333-4333-8333-333333333305': SEED_IDS.ROOM_5,
  '33333333-3333-4333-8333-333333333306': SEED_IDS.ROOM_6,
};

const VALID_SEED_ROOM_IDS = new Set(INITIAL_ROOMS.map((r) => r.id));

function normalizeFavoriteIds(rawList: unknown[]): string[] {
  const unique = new Set<string>();
  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const mapped = LEGACY_ID_MAP[item] ?? item;
    if (
      VALID_SEED_ROOM_IDS.has(mapped) ||
      mapped.startsWith('room-local-') ||
      mapped.startsWith('fr-')
    ) {
      unique.add(mapped);
    }
  }
  return Array.from(unique);
}

function readFavoritesFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = normalizeFavoriteIds(parsed);
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
    }
  } catch {
    // Fallback en memoria
  }

  const initialDefaults = [SEED_IDS.ROOM_1];
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(initialDefaults)
    );
  } catch {
    // Ignorar errores de escritura
  }
  return initialDefaults;
}

let memoryFavoriteIds: string[] = readFavoritesFromStorage();

function notifySubscribers(): void {
  const snapshot = [...memoryFavoriteIds];
  subscribers.forEach((listener) => listener(snapshot));
}

export function getFavoriteRoomIds(): string[] {
  return [...memoryFavoriteIds];
}

export function isRoomFavorite(roomId: string): boolean {
  const normalized = LEGACY_ID_MAP[roomId] ?? roomId;
  return memoryFavoriteIds.includes(normalized);
}

export function toggleFavoriteRoom(roomId: string): {
  isFavorite: boolean;
  favorites: string[];
} {
  const normalized = LEGACY_ID_MAP[roomId] ?? roomId;
  const alreadyFav = memoryFavoriteIds.includes(normalized);

  if (alreadyFav) {
    memoryFavoriteIds = memoryFavoriteIds.filter((id) => id !== normalized);
  } else {
    memoryFavoriteIds = [...memoryFavoriteIds, normalized];
  }

  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(memoryFavoriteIds)
    );
  } catch {
    // Ignorar errores de almacenamiento
  }

  notifySubscribers();

  return {
    isFavorite: !alreadyFav,
    favorites: [...memoryFavoriteIds],
  };
}

export function syncFavoritesWithAvailableRooms(availableRoomIds: string[]): void {
  if (!availableRoomIds || availableRoomIds.length === 0) return;
  const availableSet = new Set(availableRoomIds);
  const filtered = memoryFavoriteIds.filter((id) => availableSet.has(id));
  if (filtered.length !== memoryFavoriteIds.length) {
    memoryFavoriteIds = filtered;
    try {
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(memoryFavoriteIds)
      );
    } catch {
      // Ignorar
    }
    notifySubscribers();
  }
}

export function subscribeFavorites(listener: FavoritesSubscriber): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    getFavoriteRoomIds()
  );

  useEffect(() => {
    setFavoriteIds(getFavoriteRoomIds());
    return subscribeFavorites((updatedIds) => {
      setFavoriteIds(updatedIds);
    });
  }, []);

  const isFavorite = useCallback(
    (roomId: string) => {
      const normalized = LEGACY_ID_MAP[roomId] ?? roomId;
      return favoriteIds.includes(normalized);
    },
    [favoriteIds]
  );

  const toggleFavorite = useCallback((roomId: string): boolean => {
    const result = toggleFavoriteRoom(roomId);
    return result.isFavorite;
  }, []);

  return {
    favoriteIds,
    favoritesCount: favoriteIds.length,
    isFavorite,
    toggleFavorite,
  };
}

export default useFavorites;
