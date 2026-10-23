import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Lock,
  MessageSquareQuote,
  ShieldCheck,
  Star,
  UserCheck,
  X,
} from 'lucide-react';
import { StudentPublicProfile, TenantLeaseItem } from '../types/room';
import {
  getStudentLeaseWithLandlord,
  getStudentPublicProfile,
  subscribeStudentEvaluations,
} from '../services/api';

interface StudentProfileDrawerProps {
  isOpen: boolean;
  studentId: string | null;
  landlordId?: string;
  fallbackStudent?: {
    fullName?: string;
    facultad?: string;
    memberSince?: string;
  };
  onClose: () => void;
  onOpenRateModal?: (lease: TenantLeaseItem, profile: StudentPublicProfile) => void;
}

export const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({
  isOpen,
  studentId,
  landlordId,
  fallbackStudent,
  onClose,
  onOpenRateModal,
}) => {
  const [profile, setProfile] = useState<StudentPublicProfile | null>(null);
  const [leaseWithLandlord, setLeaseWithLandlord] = useState<TenantLeaseItem | null>(
    null
  );

  useEffect(() => {
    if (!isOpen || !studentId) return;

    const refresh = () => {
      const loadedProfile = getStudentPublicProfile(studentId, fallbackStudent);
      const lease = getStudentLeaseWithLandlord(studentId, landlordId);
      setProfile(loadedProfile);
      setLeaseWithLandlord(lease);
    };

    refresh();
    const unsubscribe = subscribeStudentEvaluations(refresh);
    return unsubscribe;
  }, [isOpen, studentId, landlordId, fallbackStudent]);

  if (!isOpen || !studentId || !profile) return null;

  const displayName =
    profile?.fullName ??
    profile?.publicName ??
    profile?.name ??
    'Mateo Salazar';
  const evaluationsList = profile?.evaluations ?? [];
  const avgRating = profile?.averageRating ?? 5.0;
  const totalEvals = profile?.totalEvaluations ?? evaluationsList.length;

  const canRateStudent =
    leaseWithLandlord?.status === 'FINALIZADO' && !leaseWithLandlord?.alreadyEvaluated;
  const isAlreadyRated =
    leaseWithLandlord?.status === 'FINALIZADO' &&
    Boolean(leaseWithLandlord?.alreadyEvaluated);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-profile-modal-title"
      className="fixed inset-0 top-0 left-0 w-screen h-screen m-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md overflow-y-auto transition-opacity"
      style={{
        backdropFilter: 'blur(8px) saturate(140%)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
      }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal Centrado */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-royal" />
            <span
              id="student-profile-modal-title"
              className="text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Ficha Pública del Estudiante
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar perfil"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="max-h-[78vh] overflow-y-auto p-6 space-y-5">
          {/* Tarjeta principal de identidad permitida */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy text-white font-bold text-lg shadow-xs">
                {initials || 'ES'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-navy tracking-tight">
                    {displayName}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-verified border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    SSO PUCP Validado
                  </span>
                </div>

                {/* Datos públicos permitidos: Facultad y Tiempo registrado */}
                <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-royal shrink-0" />
                    <span>
                      Facultad:{' '}
                      <strong className="font-semibold text-slate-800">
                        {profile?.facultad ?? 'Ciencias e Ingeniería'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Miembro desde {profile?.memberSince ?? 'marzo 2025'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen de reputación en estrellas */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-200/70">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Reputación como Inquilino
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(avgRating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-base font-extrabold text-navy">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({totalEvals}{' '}
                    {totalEvals === 1 ? 'evaluación' : 'evaluaciones'})
                  </span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200">
                <Award className="w-4 h-4 text-amber-500" />
                Buen historial
              </div>
            </div>
          </div>

          {/* Aviso de Protección de Confidencialidad Institucional */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                Protección de datos institucionales activa
              </p>
              <p className="mt-0.5 text-slate-500">
                El código universitario de matrícula y el correo institucional fueron
                verificados por FindRoom mediante SSO PUCP y se mantienen ocultos por
                confidencialidad.
              </p>
            </div>
          </div>

          {/* Estado de contrato con el arrendador actual y acción de calificación */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Vínculo de Arrendamiento
                </h3>
                {leaseWithLandlord ? (
                  <p className="mt-1 text-xs text-slate-700">
                    Contrato en{' '}
                    <span className="font-semibold text-navy">
                      {leaseWithLandlord?.roomTitle ?? 'Habitación'}
                    </span>{' '}
                    ({leaseWithLandlord?.periodLabel ?? 'Semestral'}) — Estado:{' '}
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        leaseWithLandlord?.status === 'FINALIZADO'
                          ? 'bg-emerald-50 text-verified border border-emerald-200'
                          : 'bg-blue-50 text-royal border border-blue-200'
                      }`}
                    >
                      {leaseWithLandlord?.status === 'FINALIZADO'
                        ? 'Finalizado'
                        : 'En curso'}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Sin contrato finalizado registrado con tu cuenta de propietario.
                  </p>
                )}
              </div>

              {canRateStudent && leaseWithLandlord && onOpenRateModal ? (
                <button
                  type="button"
                  onClick={() => onOpenRateModal(leaseWithLandlord, profile)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Calificar a inquilino
                </button>
              ) : isAlreadyRated ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-verified">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Inquilino calificado
                </span>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Solo disponible cuando el contrato de alquiler ha finalizado"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Requiere contrato finalizado
                </button>
              )}
            </div>
          </div>

          {/* Historial de Evaluaciones de Arrendadores Anteriores */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-royal" />
                Historial de Evaluaciones de Arrendadores
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                {evaluationsList.length}{' '}
                {evaluationsList.length === 1 ? 'reseña' : 'reseñas'}
              </span>
            </div>

            {evaluationsList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <ShieldCheck className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  Sin evaluaciones previas registradas
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Este estudiante aún no cuenta con calificaciones de arriendos
                  anteriores.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {evaluationsList.map((evalItem) => (
                  <article
                    key={evalItem?.id}
                    className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-navy">
                          {evalItem?.landlordName ?? 'Propietario Verificado'}
                        </p>
                        {evalItem?.roomTitle && (
                          <p className="text-[11px] text-slate-500">
                            Arrendador en: {evalItem.roomTitle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 rounded-md bg-amber-50/90 border border-amber-200/80 px-2 py-0.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span className="text-xs font-bold text-amber-900">
                          {evalItem?.rating ?? 5}.0
                        </span>
                      </div>
                    </div>

                    {evalItem?.tags && evalItem.tags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {evalItem.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                      "{evalItem?.comment ?? ''}"
                    </p>

                    <p className="mt-2 text-[11px] text-slate-400">
                      Registrado el{' '}
                      {evalItem?.createdAt
                        ? new Date(evalItem.createdAt).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recientemente'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar ficha
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudentProfileDrawer;
