import React, { useCallback, useEffect, useState } from 'react';
import {
  Bath,
  BedDouble,
  Bookmark,
  CheckCircle2,
  Footprints,
  Lock,
  MapPin,
  Maximize2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sofa,
  Star,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { DemoUserProfile, roomService } from '../services/api';
import {
  syncFavoritesWithAvailableRooms,
  useFavorites,
} from '../hooks/useFavorites';
import { RoomItem } from '../types/room';

interface CatalogProps {
  activeUser: DemoUserProfile;
  onSelectRoom: (roomId: string) => void;
  favoritesOnly?: boolean;
  externalDistrict?: string | null;
  onClearExternalDistrict?: () => void;
  onShowAllCatalog?: () => void;
}

const DISTRICTS = [
  { value: 'TODOS', label: 'Todos los distritos' },
  { value: 'San Miguel', label: 'San Miguel' },
  { value: 'Pueblo Libre', label: 'Pueblo Libre' },
  { value: 'Jesús María', label: 'Jesús María' },
  { value: 'Magdalena', label: 'Magdalena' },
  { value: 'Cercado', label: 'Cercado' },
];

export const Catalog: React.FC<CatalogProps> = ({
  activeUser,
  onSelectRoom,
  favoritesOnly = false,
  externalDistrict,
  onClearExternalDistrict,
  onShowAllCatalog,
}) => {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { favoriteIds, toggleFavorite } = useFavorites();

  // Estado de la barra omnibox y filtros en tiempo real
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [district, setDistrict] = useState<string>('TODOS');
  const [maxPrice, setMaxPrice] = useState<number>(1300);
  const [privateBathOnly, setPrivateBathOnly] = useState<boolean>(false);
  const [furnishedOnly, setFurnishedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<
    'distance_asc' | 'price_asc' | 'price_desc' | 'rating_desc' | 'date_desc'
  >('distance_asc');

  useEffect(() => {
    if (externalDistrict) {
      setDistrict(externalDistrict);
      onClearExternalDistrict?.();
    }
  }, [externalDistrict, onClearExternalDistrict]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      // Si estamos en la vista /favorites, cargamos todo el catálogo base para garantizar
      // sincronización exacta 1:1 con el contador del Header (Favoritos (N))
      const result = await roomService.getRooms(
        favoritesOnly
          ? {
              studentId:
                activeUser.role === 'ESTUDIANTE' ? activeUser.id : undefined,
            }
          : {
              district: district !== 'TODOS' ? district : undefined,
              maxPrice,
              bathroomType: privateBathOnly ? 'PRIVADO' : undefined,
              isFurnished: furnishedOnly ? true : undefined,
              search: searchQuery.trim() !== '' ? searchQuery.trim() : undefined,
              sortBy,
              studentId:
                activeUser.role === 'ESTUDIANTE' ? activeUser.id : undefined,
            }
      );

      setRooms(result);
      if (favoritesOnly) {
        syncFavoritesWithAvailableRooms(result.map((r) => r.id));
      }
    } catch (error) {
      toast.error('No se pudo cargar el catálogo', {
        description:
          error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  }, [
    favoritesOnly,
    district,
    maxPrice,
    privateBathOnly,
    furnishedOnly,
    searchQuery,
    sortBy,
    activeUser,
  ]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const displayedRooms = favoritesOnly
    ? rooms.filter((r) => favoriteIds.includes(r.id))
    : rooms;

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    district !== 'TODOS' ||
    maxPrice < 1300 ||
    privateBathOnly ||
    furnishedOnly ||
    sortBy !== 'distance_asc';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDistrict('TODOS');
    setMaxPrice(1300);
    setPrivateBathOnly(false);
    setFurnishedOnly(false);
    setSortBy('distance_asc');
  };

  const handleToggleFavorite = (e: React.MouseEvent, room: RoomItem) => {
    e.stopPropagation();
    const nowFav = toggleFavorite(room.id);
    if (nowFav) {
      toast.success('Guardado en Favoritos', {
        description: room.title,
      });
    } else {
      toast.info('Eliminado de Favoritos', {
        description: room.title,
      });
    }
  };

  const isLandlordMarketView = activeUser.role === 'ARRENDADOR';

  return (
    <div className="space-y-6">
      {/* Encabezado limpio */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F2042] tracking-tight">
            {favoritesOnly
              ? 'Mis Habitaciones Favoritas'
              : isLandlordMarketView
              ? 'Explorar Mercado de Alquileres'
              : 'Alojamiento cercano al campus PUCP'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {favoritesOnly
              ? 'Habitaciones guardadas para comparar opciones.'
              : 'Habitaciones verificadas en San Miguel, Pueblo Libre, Jesús María y Magdalena.'}
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-500 tabular-nums">
          {loading
            ? 'Buscando...'
            : `${displayedRooms.length} ${
                displayedRooms.length === 1
                  ? 'habitación disponible'
                  : 'habitaciones disponibles'
              }`}
        </span>
      </div>

      {/* Barra de Búsqueda Rápida Omnibox (se muestra en Explorar / Mercado) */}
      {!favoritesOnly && (
        <section
          aria-label="Barra de búsqueda rápida y filtros"
          className="sticky top-14 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-xs overflow-hidden"
        >
          {/* Fila 1: Campo Omnibox de texto libre en tiempo real */}
          <div className="relative flex items-center px-3.5 border-b border-slate-200/80">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por distrito, calle, zona o palabra clave..."
              className="w-full h-11 pl-3 pr-9 bg-transparent text-sm text-[#0F2042] placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Fila 2: Controles desplegables y chips integrados en la misma barra */}
          <div className="px-3.5 py-2.5 bg-[#F8F9FA]/70 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrar por distrito"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-8 px-2.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-[#0F2042] focus:outline-none focus:border-[#1D4ED8]"
              >
                {DISTRICTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>

              <div className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md bg-white border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Precio máx:</span>
                <input
                  type="range"
                  min={550}
                  max={1300}
                  step={50}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-20 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1D4ED8]"
                />
                <span className="font-bold text-[#1D4ED8] tabular-nums min-w-[58px] text-right">
                  S/ {maxPrice.toLocaleString('es-PE')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPrivateBathOnly((prev) => !prev)}
                aria-pressed={privateBathOnly}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                  privateBathOnly
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Bath className="w-3.5 h-3.5" />
                <span>Baño privado</span>
                {privateBathOnly && <CheckCircle2 className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={() => setFurnishedOnly((prev) => !prev)}
                aria-pressed={furnishedOnly}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                  furnishedOnly
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Sofa className="w-3.5 h-3.5" />
                <span>Amoblado</span>
                {furnishedOnly && <CheckCircle2 className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                <select
                  aria-label="Ordenar por"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | 'distance_asc'
                        | 'price_asc'
                        | 'price_desc'
                        | 'rating_desc'
                        | 'date_desc'
                    )
                  }
                  className="h-8 px-2.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-[#0F2042] focus:outline-none focus:border-[#1D4ED8]"
                >
                  <option value="distance_asc">Cercanía al campus</option>
                  <option value="price_asc">Precio: menor a mayor</option>
                  <option value="price_desc">Precio: mayor a menor</option>
                  <option value="rating_desc">Mejor valoración</option>
                  <option value="date_desc">Más recientes</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-xs font-semibold text-[#DC2626] bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Cuadrícula de tarjetas */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="p-4 space-y-2.5">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-5 bg-slate-200 rounded w-4/5" />
                <div className="h-4 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedRooms.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <BedDouble className="w-9 h-9 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-[#0F2042]">
            {favoritesOnly
              ? 'Aún no tienes habitaciones guardadas en Favoritos'
              : 'No se encontraron habitaciones con estos criterios'}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {favoritesOnly
              ? 'Pulsa el icono de marcador en cualquier tarjeta del catálogo para guardarla aquí.'
              : 'Prueba con otra palabra clave o restablece los filtros activos.'}
          </p>
          <button
            type="button"
            onClick={favoritesOnly ? onShowAllCatalog : handleResetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1D4ED8] text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              {favoritesOnly ? 'Explorar todo el catálogo' : 'Restablecer filtros'}
            </span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(displayedRooms ?? []).map((room) => {
            const isFav = favoriteIds.includes(room?.id);
            const landlordName =
              room?.landlord?.fullName ?? room?.landlord?.name ?? 'Propietario';
            const landlordRating = Number(
              room?.landlord?.averageRating ?? room?.landlord?.rating ?? 0
            );

            return (
              <article
                key={room?.id}
                onClick={() => room?.id && onSelectRoom(room.id)}
                className="group bg-white border border-slate-200 rounded-lg shadow-xs hover:border-[#1D4ED8]/50 transition-all cursor-pointer flex flex-col overflow-hidden"
              >
                {/* Imagen 4:3 */}
                <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                  <img
                    src={room?.photos?.[0] ?? ''}
                    alt={room?.title ?? 'Habitación'}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0F2042]/90 text-white text-xs font-semibold shadow-xs tabular-nums">
                    <Footprints className="w-3.5 h-3.5 text-sky-300" />
                    <span>{room?.walkingMinutesToPucp ?? 8} min a pie</span>
                  </div>

                  {/* Botón vectorial profesional estilo Instagram (Bookmark) */}
                  {!isLandlordMarketView && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, room)}
                      aria-label={
                        isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'
                      }
                      className={`absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-150 active:scale-110 ${
                        isFav
                          ? 'bg-white border-[#0F2042] text-[#0F2042] shadow-xs'
                          : 'bg-white/95 backdrop-blur-xs border-slate-200/90 text-[#0F2042] hover:bg-white hover:border-slate-400'
                      }`}
                    >
                      <Bookmark
                        className="w-4 h-4 stroke-[1.75]"
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                    </button>
                  )}
                </div>

                {/* Cuerpo de la tarjeta */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {room?.district ?? 'San Miguel'}
                      </span>

                      <div className="text-right tabular-nums">
                        <span className="text-lg font-extrabold text-[#0F2042]">
                          S/ {(room?.monthlyPrice ?? 0).toLocaleString('es-PE')}
                        </span>
                        <span className="text-xs text-slate-500"> / mes</span>
                      </div>
                    </div>

                    <h2 className="mt-1 text-sm sm:text-base font-bold text-[#0F2042] group-hover:text-[#1D4ED8] transition-colors line-clamp-1">
                      {room?.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {room?.address}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8F9FA] border border-slate-200 tabular-nums">
                        <Maximize2 className="w-3 h-3 text-slate-400" />
                        {room?.areaSqm ?? 16} m²
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8F9FA] border border-slate-200">
                        <Bath className="w-3 h-3 text-slate-400" />
                        {room?.bathroomType === 'PRIVADO'
                          ? 'Baño privado'
                          : 'Baño compartido'}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8F9FA] border border-slate-200">
                        <Sofa className="w-3 h-3 text-slate-400" />
                        {room?.isFurnished ? 'Amoblado' : 'Sin amoblar'}
                      </span>
                    </div>
                  </div>

                  {/* Pie de tarjeta */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1 min-w-0">
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {landlordName}
                        </span>
                        {room?.landlord?.isVerified && (
                          <CheckCircle2
                            className="w-4 h-4 text-[#059669] shrink-0"
                            aria-label="Propietario verificado"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs tabular-nums shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-[#0F2042]">
                          {landlordRating > 0
                            ? landlordRating.toFixed(1)
                            : 'Nuevo'}
                        </span>
                      </div>
                    </div>

                    {/* Botón deshabilitado cuando el rol es Arrendador */}
                    {isLandlordMarketView && (
                      <button
                        type="button"
                        disabled
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-2 px-3 rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed text-xs font-semibold inline-flex items-center justify-center"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                        Exclusivo estudiantes
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Catalog;
