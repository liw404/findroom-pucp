import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { DemoUserProfile, roomService } from '../services/api';
import {
  INITIAL_CONTRACTS,
  INITIAL_REVIEWS,
  INITIAL_ROOMS,
  SEED_LANDLORDS,
} from '../services/seedData';
import { RoomItem, RoomReviewItem } from '../types/room';

interface ProfilePageProps {
  activeUser?: DemoUserProfile | null;
  onSelectRoom?: (roomId: string) => void;
}

type StudentTab = 'HISTORIAL' | 'MIS_RESENAS';
type LandlordTab = 'REPUTACION' | 'INMUEBLES';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  activeUser,
  onSelectRoom,
}) => {
  const isStudent = activeUser?.role !== 'ARRENDADOR';

  const [studentTab, setStudentTab] = useState<StudentTab>('HISTORIAL');
  const [landlordTab, setLandlordTab] = useState<LandlordTab>('REPUTACION');

  const [allRooms, setAllRooms] = useState<RoomItem[]>(INITIAL_ROOMS);
  const [landlordRooms, setLandlordRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const catalogRooms = await roomService.getRooms({});
      if (Array.isArray(catalogRooms) && catalogRooms.length > 0) {
        setAllRooms(catalogRooms);
      }

      if (activeUser?.role === 'ARRENDADOR' && activeUser?.id) {
        const owned = await roomService.getLandlordRooms(activeUser.id);
        const filteredOwned = (Array.isArray(owned) ? owned : []).filter(
          (r) =>
            r?.landlordId === activeUser?.id ||
            r?.landlord?.id === activeUser?.id
        );
        setLandlordRooms(
          filteredOwned.length > 0
            ? filteredOwned
            : (INITIAL_ROOMS ?? []).filter(
                (r) =>
                  r?.landlordId === activeUser?.id ||
                  r?.landlord?.id === activeUser?.id
              )
        );
      }
    } catch {
      // Fallback seguro con datos locales
      setAllRooms(INITIAL_ROOMS);
      if (activeUser?.id) {
        setLandlordRooms(
          (INITIAL_ROOMS ?? []).filter(
            (r) =>
              r?.landlordId === activeUser?.id ||
              r?.landlord?.id === activeUser?.id
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [activeUser?.id, activeUser?.role]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Datos seguros para Estudiante con optional chaining
  const studentContracts = (INITIAL_CONTRACTS ?? []).filter(
    (c) => c?.studentId === (activeUser?.id ?? '')
  );

  // Recolectar reseñas desde las habitaciones cargadas + seed inicial
  const mergedReviews: RoomReviewItem[] = React.useMemo(() => {
    const map = new Map<string, RoomReviewItem>();
    (INITIAL_REVIEWS ?? []).forEach((rev) => {
      if (rev?.id) map.set(rev.id, rev);
    });
    (allRooms ?? []).forEach((room) => {
      (room?.reviews ?? []).forEach((rev) => {
        if (rev?.id) map.set(rev.id, rev);
      });
    });
    return Array.from(map.values());
  }, [allRooms]);

  const studentReviews = mergedReviews.filter(
    (rev) => rev?.studentId === (activeUser?.id ?? '')
  );

  const landlordReviews = mergedReviews.filter(
    (rev) => rev?.landlordId === (activeUser?.id ?? '')
  );

  const landlordSummary =
    (activeUser?.id ? SEED_LANDLORDS?.[activeUser.id] : undefined) ?? undefined;

  const computedAverageRating =
    landlordReviews.length > 0
      ? Number(
          (
            landlordReviews.reduce((acc, r) => acc + (r?.rating ?? 5), 0) /
            landlordReviews.length
          ).toFixed(1)
        )
      : landlordSummary?.averageRating ?? 4.8;

  const findRoomById = (roomId?: string): RoomItem | undefined => {
    if (!roomId) return undefined;
    return (
      allRooms?.find((r) => r?.id === roomId) ??
      INITIAL_ROOMS?.find((r) => r?.id === roomId)
    );
  };

  if (isStudent) {
    return (
      <div className="space-y-6">
        {/* Cabecera de Estudiante (Solo lectura) */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#0F2042] text-white flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6 text-sky-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-[#0F2042] tracking-tight">
                    {activeUser?.fullName ?? 'Mateo Salazar'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>SSO PUCP Verificado</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perfil institucional sincronizado con el directorio académico universitario
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 self-start sm:self-auto">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Datos institucionales de solo lectura</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Nombre completo</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1 text-sm font-bold text-[#0F2042]">
                {activeUser?.fullName ?? 'Mateo Salazar'}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Correo institucional
                </span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1 text-sm font-mono font-semibold text-[#0F2042] truncate">
                {activeUser?.email ?? 'mateo.salazar@pucp.edu.pe'}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Código universitario</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1 text-sm font-mono font-bold text-[#1D4ED8] tabular-nums">
                {activeUser?.codigoPucp ?? '20210842'}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Facultad</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1 text-sm font-bold text-[#0F2042]">
                {activeUser?.facultad ?? 'Ciencias e Ingeniería'}
              </div>
            </div>
          </div>
        </section>

        {/* Selector de Pestañas del Estudiante */}
        <div className="border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStudentTab('HISTORIAL')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-semibold transition-colors ${
              studentTab === 'HISTORIAL'
                ? 'border-[#1D4ED8] text-[#1D4ED8]'
                : 'border-transparent text-slate-500 hover:text-[#0F2042]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Historial de Alquileres ({studentContracts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setStudentTab('MIS_RESENAS')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-semibold transition-colors ${
              studentTab === 'MIS_RESENAS'
                ? 'border-[#1D4ED8] text-[#1D4ED8]'
                : 'border-transparent text-slate-500 hover:text-[#0F2042]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Mis Reseñas ({studentReviews.length})</span>
          </button>
        </div>

        {/* Contenido de la Pestaña Seleccionada */}
        {studentTab === 'HISTORIAL' ? (
          <section className="space-y-3">
            {studentContracts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
                No tienes contratos previos registrados.
              </div>
            ) : (
              studentContracts.slice(0, 1).map((contract) => {
                const room = findRoomById(contract?.roomId ?? 'fr-101');
                const targetRoomId = room?.id ?? 'fr-101';
                const landlord =
                  (contract?.landlordId
                    ? SEED_LANDLORDS?.[contract.landlordId]
                    : undefined) ?? room?.landlord;
                const associatedReview = studentReviews.find(
                  (r) =>
                    r?.contractId === contract?.id || r?.roomId === targetRoomId
                );

                return (
                  <div
                    key={contract?.id ?? 'cnt-seed-1'}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                            <span>Finalizado</span>
                          </span>

                          {room?.district && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8]">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{room.district}</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {contract?.periodLabel ?? 'Ciclo 2026-I'}
                            </span>
                          </span>
                        </div>

                        <h3
                          onClick={() => onSelectRoom?.(targetRoomId)}
                          className="text-sm sm:text-base font-bold text-[#0F2042] hover:text-[#1D4ED8] cursor-pointer"
                        >
                          {room?.title ??
                            'Habitación Ejecutiva Frente a Puerta Principal PUCP'}
                        </h3>

                        <p className="text-xs text-slate-500">
                          Arrendador:{' '}
                          <span className="font-semibold text-slate-700">
                            {landlord?.fullName ?? 'Carmen Mendoza'}
                          </span>{' '}
                          · Dirección:{' '}
                          {room?.address ??
                            'Av. Universitaria 1940, Dpto. 402, San Miguel'}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <div className="text-right tabular-nums">
                          <div className="text-base font-extrabold text-[#0F2042]">
                            S/{' '}
                            {(contract?.monthlyRent ?? 850).toLocaleString(
                              'es-PE'
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            renta mensual
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectRoom?.(targetRoomId)}
                          className="px-3.5 py-1.5 rounded-md border border-slate-200 bg-[#F8F9FA] hover:border-[#1D4ED8] hover:text-[#1D4ED8] text-xs font-semibold text-[#0F2042] transition-colors"
                        >
                          Ver habitación
                        </button>
                      </div>
                    </div>

                    {/* Reseña y calificación asociada a este contrato histórico */}
                    {associatedReview && (
                      <div className="pt-3 border-t border-slate-200/80 bg-[#F8F9FA] rounded-lg p-3.5 border space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#0F2042]">
                            Calificación emitida en este contrato
                          </span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`w-3.5 h-3.5 ${
                                  idx < (associatedReview.rating ?? 5)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-xs font-bold text-[#0F2042] tabular-nums">
                              {(associatedReview.rating ?? 5).toFixed(1)} / 5.0
                            </span>
                          </div>
                        </div>
                        {associatedReview.comment && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {associatedReview.comment}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        ) : (
          <section className="space-y-3">
            {studentReviews.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
                Aún no has publicado reseñas.
              </div>
            ) : (
              studentReviews.map((rev) => {
                const room = findRoomById(rev?.roomId);
                const landlord =
                  (rev?.landlordId
                    ? SEED_LANDLORDS?.[rev.landlordId]
                    : undefined) ?? room?.landlord;

                return (
                  <div
                    key={rev?.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3
                          onClick={() => room?.id && onSelectRoom?.(room.id)}
                          className="text-sm font-bold text-[#0F2042] hover:text-[#1D4ED8] cursor-pointer"
                        >
                          {room?.title ?? 'Habitación Universitaria'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Arrendador calificado:{' '}
                          <span className="font-semibold text-slate-700">
                            {landlord?.fullName ?? 'Propietario Verificado'}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-4 h-4 ${
                              idx < (rev?.rating ?? 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-xs font-bold text-[#0F2042] tabular-nums">
                          {(rev?.rating ?? 5).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {rev?.comment && (
                      <p className="text-xs sm:text-sm text-slate-600 bg-[#F8F9FA] border border-slate-200/80 rounded-lg p-3 leading-relaxed">
                        {rev.comment}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </section>
        )}
      </div>
    );
  }

  // ==========================================
  // Vista de Perfil de Arrendador
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Cabecera de Arrendador */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0F2042] text-white flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-[#0F2042] tracking-tight">
                  {activeUser?.fullName ?? 'Elena Vargas'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Propietario Verificado</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Titularidad registral e identidad validadas para publicación de inmuebles
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>DNI Verificado</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>Partida Registral Protegida</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Titular registrado</span>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-1 text-sm font-bold text-[#0F2042]">
              {activeUser?.fullName ?? 'Elena Vargas'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Correo electrónico</span>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-1 text-sm font-mono font-semibold text-[#0F2042] truncate">
              {activeUser?.email ?? 'elena.vargas@findroom-demo.pe'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Documento de identidad (RENIEC)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            </div>
            <div className="mt-1 text-sm font-mono font-bold text-[#0F2042] tabular-nums">
              DNI {activeUser?.dni ?? '43910285'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Partida Registral (SUNARP)</span>
              <Lock className="w-3.5 h-3.5 text-[#1D4ED8]" />
            </div>
            <div className="mt-1 text-sm font-mono font-bold text-[#059669] tabular-nums">
              N.° {activeUser?.partidaRegistral ?? '11294850'}
            </div>
          </div>
        </div>
      </section>

      {/* Pestañas de Perfil del Arrendador */}
      <div className="border-b border-slate-200 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLandlordTab('REPUTACION')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-semibold transition-colors ${
            landlordTab === 'REPUTACION'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent text-slate-500 hover:text-[#0F2042]'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Reputación ({computedAverageRating.toFixed(1)} / 5.0)</span>
        </button>

        <button
          type="button"
          onClick={() => setLandlordTab('INMUEBLES')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-semibold transition-colors ${
            landlordTab === 'INMUEBLES'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent text-slate-500 hover:text-[#0F2042]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Inmuebles Activos ({landlordRooms.length})</span>
        </button>
      </div>

      {landlordTab === 'REPUTACION' ? (
        <section className="space-y-4">
          {/* Resumen numérico de reputación */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="px-4 py-3 rounded-xl bg-[#F8F9FA] border border-slate-200 text-center tabular-nums">
                <div className="text-2xl font-extrabold text-[#0F2042]">
                  {computedAverageRating.toFixed(1)}{' '}
                  <span className="text-sm font-normal text-slate-400">/ 5.0</span>
                </div>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#0F2042]">
                  Índice de Confianza en la Comunidad PUCP
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Basado en {landlordReviews.length} valoraciones verificadas de estudiantes con contratos finalizados.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-semibold self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4" />
              <span>Reputación Sobresaliente</span>
            </span>
          </div>

          {/* Desglose de comentarios recibidos */}
          <div className="space-y-3">
            {landlordReviews.map((rev) => {
              const room = findRoomById(rev?.roomId);
              return (
                <div
                  key={rev?.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-[#0F2042]">
                        {rev?.student?.fullName ?? 'Estudiante PUCP'}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        · {rev?.student?.facultad ?? 'Comunidad PUCP'}
                      </span>
                      {room?.title && (
                        <div className="text-xs text-[#1D4ED8] font-medium mt-0.5">
                          Inmueble: {room.title}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3.5 h-3.5 ${
                            idx < (rev?.rating ?? 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {rev?.comment && (
                    <p className="text-xs sm:text-sm text-slate-600 bg-[#F8F9FA] border border-slate-200/80 rounded-lg p-3 leading-relaxed">
                      {rev.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {loading ? (
            <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ) : landlordRooms.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
              No tienes inmuebles asignados actualmente.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {landlordRooms.map((room) => {
                const isRented = room?.status === 'ALQUILADO';
                return (
                  <div
                    key={room?.id}
                    onClick={() => room?.id && onSelectRoom?.(room.id)}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-[#1D4ED8]/50 cursor-pointer transition-colors"
                  >
                    {room?.photos?.[0] && (
                      <img
                        src={room.photos[0]}
                        alt={room?.title ?? 'Inmueble'}
                        className="w-24 aspect-[4/3] rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#1D4ED8]">
                          {room?.district ?? 'San Miguel'}
                        </span>
                        {isRented ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            <EyeOff className="w-3 h-3" />
                            <span>Alquilado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#059669] text-[11px] font-semibold">
                            <Eye className="w-3 h-3" />
                            <span>Disponible</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#0F2042] truncate">
                        {room?.title ?? 'Habitación'}
                      </h3>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>{room?.areaSqm ?? 16} m²</span>
                        <span className="font-bold text-[#0F2042] tabular-nums">
                          S/ {(room?.monthlyPrice ?? 850).toLocaleString('es-PE')} / mes
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ProfilePage;
