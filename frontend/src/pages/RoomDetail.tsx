import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bath,
  Bookmark,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  ExternalLink,
  Footprints,
  Lock,
  MapPin,
  Maximize2,
  MessageCircle,
  Sofa,
  Star,
  Unlock,
  Wifi,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addAppNotification,
  DEMO_SAFE_WHATSAPP,
  DEMO_SAFE_WHATSAPP_DIGITS,
  DemoUserProfile,
  requestService,
  roomService,
} from '../services/api';
import { useFavorites } from '../hooks/useFavorites';
import { useRequests } from '../hooks/useRequests';
import { STUDENT_MATEO_ID } from '../services/seedData';
import { RoomItem } from '../types/room';
import ReviewModal from '../components/ReviewModal';

interface RoomDetailProps {
  roomId: string;
  activeUser: DemoUserProfile;
  onBack: () => void;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Habitación Individual',
  COMPARTIDA: 'Habitación Compartida',
  MINIDEPARTAMENTO: 'Minidepartamento',
  ESTUDIO: 'Estudio Independiente',
};

export const RoomDetail: React.FC<RoomDetailProps> = ({
  roomId,
  activeUser,
  onBack,
}) => {
  const [room, setRoom] = useState<RoomItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [animatingFav, setAnimatingFav] = useState<boolean>(false);

  const { isFavorite, toggleFavorite } = useFavorites();
  const { getRoomRequestForStudent } = useRequests();
  const isFav = isFavorite(roomId);

  const [contactMessage, setContactMessage] = useState<string>(
    'Hola, soy estudiante de la PUCP y me interesa coordinar una visita a la habitación esta semana.'
  );
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);
  const [cancelingRequest, setCancelingRequest] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  const isLandlordMarketView = activeUser?.role === 'ARRENDADOR';
  const currentStudentId = activeUser?.id ?? STUDENT_MATEO_ID;

  const fetchRoomDetail = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await roomService.getRoomById(roomId, currentStudentId);
      setRoom(detail);
      setActivePhotoIndex(0);
    } catch (error) {
      toast.error('Error al cargar la habitación', {
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo obtener la información.',
      });
    } finally {
      setLoading(false);
    }
  }, [roomId, currentStudentId]);

  useEffect(() => {
    fetchRoomDetail();
  }, [fetchRoomDetail]);

  const handleToggleFavorite = () => {
    if (!room) return;
    setAnimatingFav(true);
    setTimeout(() => setAnimatingFav(false), 240);
    const nowFav = toggleFavorite(room.id);
    if (nowFav) {
      toast.success('Guardado en Favoritos', { description: room.title });
    } else {
      toast.info('Eliminado de Favoritos', { description: room.title });
    }
  };

  const photos = room?.photos ?? [];

  const handlePrevPhoto = () => {
    if (photos.length === 0) return;
    setActivePhotoIndex((prev) =>
      prev === 0 ? photos.length - 1 : prev - 1
    );
  };

  const handleNextPhoto = () => {
    if (photos.length === 0) return;
    setActivePhotoIndex((prev) =>
      prev === photos.length - 1 ? 0 : prev + 1
    );
  };

  const reactiveRequest = room?.id
    ? getRoomRequestForStudent?.(room.id, currentStudentId)
    : undefined;
  const effectiveRequest = reactiveRequest ?? room?.latestContactRequest ?? null;
  const contactStatus =
    reactiveRequest?.status ?? room?.studentContactStatus ?? null;
  const isAccepted =
    !isLandlordMarketView &&
    (contactStatus === 'ACEPTADA' || Boolean(room?.whatsappRevealed));
  const isPending = contactStatus === 'PENDIENTE';
  const isCanceled = contactStatus === 'CANCELADA';
  const isOwnedByActiveLandlord =
    isLandlordMarketView &&
    Boolean(
      room?.landlordId === activeUser?.id ||
        room?.landlord?.id === activeUser?.id
    );

  const handleContactLandlord = async () => {
    if (!room || isLandlordMarketView) return;

    if (isAccepted) {
      const landlordName =
        room?.landlord?.fullName ?? room?.landlord?.name ?? 'Elena Vargas';
      const rawDigits = (
        room?.landlord?.whatsapp ??
        room?.landlord?.phone ??
        DEMO_SAFE_WHATSAPP
      ).replace(/\D/g, '');
      const waDigits = rawDigits.startsWith('51')
        ? rawDigits
        : rawDigits.length === 9
        ? `51${rawDigits}`
        : DEMO_SAFE_WHATSAPP_DIGITS;
      const whatsappText = encodeURIComponent(
        `Hola ${landlordName}, soy Mateo de la PUCP, mi solicitud fue aceptada y quisiera coordinar una visita.`
      );
      const whatsappUrl = `https://wa.me/${waDigits}?text=${whatsappText}`;

      toast.success('Abriendo WhatsApp del propietario');
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setSubmittingRequest(true);
    try {
      const created = await requestService.createRequest({
        studentId: currentStudentId,
        roomId: room.id,
        message: contactMessage.trim(),
      });

      setRoom((prev) =>
        prev
          ? {
              ...prev,
              studentContactStatus: 'PENDIENTE',
              latestContactRequest: created,
            }
          : prev
      );

      addAppNotification({
        targetRole: 'ARRENDADOR',
        title: `El estudiante ${activeUser?.shortLabel ?? 'Mateo S.'} envió una solicitud para ${room.title}`,
        description: `Revisa su perfil académico en Solicitudes Recibidas.`,
        roomId: room.id,
      });

      toast.success('Solicitud enviada (Pendiente)', {
        description:
          'El número de WhatsApp se habilitará cuando el propietario acepte tu solicitud.',
      });
    } catch (error) {
      toast.warning(
        error instanceof Error
          ? error.message
          : 'Envío pausado por control de solicitudes (48h)'
      );
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!effectiveRequest?.id) return;

    setCancelingRequest(true);
    try {
      const canceled = await requestService.cancelRequest(
        effectiveRequest.id,
        currentStudentId
      );

      setRoom((prev) =>
        prev
          ? {
              ...prev,
              studentContactStatus: 'CANCELADA',
              latestContactRequest: canceled,
            }
          : prev
      );

      toast.info('Solicitud cancelada', {
        description: 'Envío pausado por control de solicitudes (48h).',
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo cancelar la solicitud.'
      );
    } finally {
      setCancelingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-9 w-40 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 aspect-[4/3] bg-slate-200 rounded-lg" />
          <div className="h-80 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs p-8 text-center">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto" />
        <h2 className="mt-3 text-lg font-bold text-[#0F2042]">
          No se encontró la habitación solicitada
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#1D4ED8] text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </button>
      </div>
    );
  }

  const totalPhotos = photos.length;
  const currentPhoto = photos[activePhotoIndex] ?? photos[0] ?? '';
  const landlordFullName =
    room?.landlord?.fullName ?? room?.landlord?.name ?? 'Elena Vargas';
  const landlordRating = Number(
    room?.landlord?.averageRating ?? room?.landlord?.rating ?? 4.8
  );
  const landlordReviewCount = Number(
    room?.landlord?.totalReviews ?? room?.landlord?.reviewCount ?? 0
  );
  const unmaskedWhatsapp =
    room?.landlord?.whatsapp ?? room?.landlord?.phone ?? DEMO_SAFE_WHATSAPP;

  return (
    <div className="space-y-5">
      {/* Barra superior de retorno y acciones rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-[#0F2042] hover:border-[#1D4ED8] transition-colors shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#1D4ED8]" />
          <span>
            {isOwnedByActiveLandlord
              ? 'Volver a Mis Propiedades'
              : 'Volver al catálogo'}
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          {!isLandlordMarketView && (
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-all duration-150 ${
                animatingFav ? 'scale-105' : 'scale-100'
              } ${
                isFav
                  ? 'bg-[#0F2042] border-[#0F2042] text-white'
                  : 'bg-white border-slate-200 text-[#0F2042] hover:border-slate-300'
              }`}
            >
              <Bookmark
                className="w-4 h-4 stroke-[1.75]"
                fill={isFav ? 'currentColor' : 'none'}
              />
              <span>
                {isFav ? 'Guardado en Favoritos' : 'Guardar en Favoritos'}
              </span>
            </button>
          )}

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F2042] text-white text-xs font-semibold tabular-nums">
            <Footprints className="w-3.5 h-3.5 text-sky-300" />
            {room?.walkingMinutesToPucp ?? 8} min a pie · {room?.distanceToPucpKm ?? 0.6} km PUCP
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna principal (2/3): Carrusel, Especificaciones y Reseñas */}
        <div className="lg:col-span-2 space-y-5">
          {/* Carrusel de fotos */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-xs overflow-hidden">
            <div className="relative aspect-[4/3] w-full bg-slate-100">
              <img
                src={currentPhoto}
                alt={`${room?.title ?? 'Habitación'} - Foto ${activePhotoIndex + 1}`}
                className="w-full h-full object-cover"
              />

              {totalPhotos > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    aria-label="Foto anterior"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#0F2042]/80 text-white flex items-center justify-center hover:bg-[#0F2042] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    aria-label="Foto siguiente"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#0F2042]/80 text-white flex items-center justify-center hover:bg-[#0F2042] transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded bg-[#0F2042]/85 text-white text-xs font-semibold tabular-nums">
                {activePhotoIndex + 1} / {Math.max(1, totalPhotos)}
              </div>
            </div>

            {totalPhotos > 1 && (
              <div className="p-3 bg-[#F8F9FA] border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto">
                {photos.map((photoUrl, idx) => (
                  <button
                    key={photoUrl + idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-20 aspect-[4/3] rounded overflow-hidden border-2 shrink-0 transition-all ${
                      idx === activePhotoIndex
                        ? 'border-[#1D4ED8]'
                        : 'border-transparent opacity-65 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photoUrl}
                      alt={`Miniatura ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Especificaciones del Inmueble */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{room?.district ?? 'San Miguel'}</span>
                  <span className="text-slate-300">·</span>
                  <span>{ROOM_TYPE_LABELS[room?.type ?? 'INDIVIDUAL'] ?? room?.type}</span>
                </div>
                <h1 className="mt-1 text-xl font-bold text-[#0F2042] tracking-tight">
                  {room?.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {room?.address}
                </p>
              </div>

              <div className="sm:text-right shrink-0 tabular-nums">
                <div className="text-2xl font-extrabold text-[#0F2042]">
                  S/ {(room?.monthlyPrice ?? 0).toLocaleString('es-PE')}
                </div>
                <div className="text-xs text-slate-500">mensual</div>
              </div>
            </div>

            {/* Atributos principales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-md bg-[#F8F9FA] border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Maximize2 className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span>Área</span>
                </div>
                <div className="mt-1 text-sm font-bold text-[#0F2042] tabular-nums">
                  {room?.areaSqm ?? 16} m²
                </div>
              </div>

              <div className="p-3 rounded-md bg-[#F8F9FA] border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Bath className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span>Baño</span>
                </div>
                <div className="mt-1 text-sm font-bold text-[#0F2042]">
                  {room?.bathroomType === 'PRIVADO' ? 'Privado' : 'Compartido'}
                </div>
              </div>

              <div className="p-3 rounded-md bg-[#F8F9FA] border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Sofa className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span>Mobiliario</span>
                </div>
                <div className="mt-1 text-sm font-bold text-[#0F2042]">
                  {room?.isFurnished ? 'Amoblado' : 'Sin amoblar'}
                </div>
              </div>

              <div className="p-3 rounded-md bg-[#F8F9FA] border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Footprints className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span>Distancia</span>
                </div>
                <div className="mt-1 text-sm font-bold text-[#0F2042] tabular-nums">
                  {room?.walkingMinutesToPucp ?? 8} min a pie
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Sobre la habitación
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {room?.description}
              </p>
            </div>

            {/* Servicios incluidos */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/80">
              {room?.includesWater && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F8F9FA] border border-slate-200 text-xs font-medium text-[#0F2042]">
                  <Droplets className="w-3.5 h-3.5 text-[#059669]" />
                  Agua incluida
                </span>
              )}
              {room?.includesElectricity && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F8F9FA] border border-slate-200 text-xs font-medium text-[#0F2042]">
                  <Zap className="w-3.5 h-3.5 text-[#059669]" />
                  Luz incluida
                </span>
              )}
              {room?.includesWifi && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F8F9FA] border border-slate-200 text-xs font-medium text-[#0F2042]">
                  <Wifi className="w-3.5 h-3.5 text-[#059669]" />
                  WiFi fibra óptica
                </span>
              )}
            </div>
          </div>

          {/* Reseñas de estudiantes */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-[#0F2042]">
                  Opiniones de estudiantes
                </h2>
                <p className="text-xs text-slate-500">
                  Experiencias de alquiler verificadas en la comunidad.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1 bg-[#F8F9FA] px-2.5 py-1.5 rounded border border-slate-200 tabular-nums">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-sm text-[#0F2042]">
                    {landlordRating > 0 ? landlordRating.toFixed(1) : 'Nuevo'}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({landlordReviewCount})
                  </span>
                </div>

                {activeUser?.role === 'ESTUDIANTE' && (
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1D4ED8] text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span>Calificar</span>
                  </button>
                )}
              </div>
            </div>

            {(room?.reviews ?? []).length > 0 ? (
              <div className="space-y-3">
                {(room?.reviews ?? []).map((rev) => (
                  <div
                    key={rev?.id}
                    className="p-3.5 rounded-md bg-[#F8F9FA] border border-slate-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F2042]">
                        {rev?.student?.fullName ?? 'Estudiante PUCP'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < (rev?.rating ?? 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {rev?.comment && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {rev.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Aún no hay comentarios registrados en esta habitación.
              </p>
            )}
          </div>
        </div>

        {/* Columna derecha (1/3): Propietario y Acción */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-xs p-6 space-y-4">
            <div className="pb-3.5 border-b border-slate-200/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Propietario
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <h2 className="text-base font-bold text-[#0F2042]">
                  {landlordFullName}
                </h2>
                {room?.landlord?.isVerified && (
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                )}
              </div>
            </div>

            {/* Si el rol activo es Arrendador */}
            {isLandlordMarketView ? (
              isOwnedByActiveLandlord ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-md bg-emerald-50/70 border border-emerald-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#059669]">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Inmueble de tu propiedad</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Estado actual:{' '}
                      <strong className="font-semibold text-[#0F2042]">
                        {room?.status === 'ALQUILADO' ? 'Alquilado' : 'Disponible'}
                      </strong>
                      . Puedes editar sus detalles o revisar interesados desde tu panel.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onBack}
                    className="w-full py-2.5 px-4 rounded-md bg-[#0F2042] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Gestionar en Mis Propiedades</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed text-xs sm:text-sm font-semibold inline-flex items-center justify-center"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Exclusivo estudiantes
                </button>
              )
            ) : (
              <>
                <div
                  className={`p-3.5 rounded-md border ${
                    isAccepted
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-[#F8F9FA] border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">WhatsApp de contacto</span>
                    {isAccepted ? (
                      <span className="inline-flex items-center gap-1 text-[#059669]">
                        <Unlock className="w-3.5 h-3.5" />
                        Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Lock className="w-3.5 h-3.5" />
                        Protegido
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 font-mono text-sm font-bold tabular-nums text-[#0F2042]">
                    {isAccepted
                      ? unmaskedWhatsapp
                      : room?.landlord?.whatsappMasked ?? '+51 9•• ••• •••'}
                  </div>

                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {isAccepted
                      ? 'Tu solicitud fue aceptada. Puedes comunicarte directamente por WhatsApp.'
                      : isPending
                      ? 'Tu solicitud está pendiente de aprobación por el propietario.'
                      : isCanceled
                      ? 'Solicitud cancelada recientemente.'
                      : 'Envía una solicitud para desbloquear el número de WhatsApp del propietario.'}
                  </p>
                </div>

                {!isAccepted && !isPending && !isCanceled && (
                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-semibold text-[#0F2042] mb-1"
                    >
                      Mensaje de presentación
                    </label>
                    <textarea
                      id="contact-message"
                      rows={3}
                      maxLength={300}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full rounded-md bg-[#F8F9FA] border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                )}

                {isAccepted ? (
                  <button
                    type="button"
                    onClick={handleContactLandlord}
                    className="w-full py-2.5 px-4 rounded-md bg-[#059669] hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Contactar por WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : isPending ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                      <span>Solicitud enviada (Pendiente)</span>
                    </button>

                    <button
                      type="button"
                      disabled={cancelingRequest}
                      onClick={handleCancelRequest}
                      className="w-full py-2 px-3 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-[#DC2626] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>
                        {cancelingRequest
                          ? 'Cancelando...'
                          : 'Cancelar solicitud'}
                      </span>
                    </button>
                  </div>
                ) : isCanceled ? (
                  <div className="space-y-2">
                    <div className="px-3 py-1.5 rounded bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Solicitud cancelada</span>
                    </div>

                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-3 rounded-md bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Envío pausado por control de solicitudes (48h)</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={submittingRequest}
                    onClick={handleContactLandlord}
                    className="w-full py-2.5 px-4 rounded-md bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-60"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {submittingRequest ? 'Enviando...' : 'Contactar arrendador'}
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        roomId={room.id}
        roomTitle={room.title}
        landlordName={landlordFullName}
        studentId={currentStudentId}
        onReviewSubmitted={fetchRoomDetail}
      />
    </div>
  );
};

export default RoomDetail;
