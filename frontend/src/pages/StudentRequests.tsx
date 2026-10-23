import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  Lock,
  MapPin,
  MessageCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DEMO_SAFE_WHATSAPP,
  DEMO_SAFE_WHATSAPP_DIGITS,
  DemoUserProfile,
  requestService,
} from '../services/api';
import { useRequests } from '../hooks/useRequests';
import { INITIAL_ROOMS, STUDENT_MATEO_ID } from '../services/seedData';

interface StudentRequestsProps {
  activeUser: DemoUserProfile;
  onSelectRoom: (roomId: string) => void;
  onExploreCatalog: () => void;
}

export const StudentRequests: React.FC<StudentRequestsProps> = ({
  activeUser,
  onSelectRoom,
  onExploreCatalog,
}) => {
  const { requests: allRequests } = useRequests();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const currentStudentId = activeUser?.id ?? STUDENT_MATEO_ID;
  const requests = (allRequests ?? []).filter(
    (req) =>
      req?.studentId === currentStudentId ||
      req?.student?.id === currentStudentId
  );

  const handleCancel = async (reqId: string) => {
    setCancelingId(reqId);
    try {
      await requestService.cancelRequest(reqId, currentStudentId);
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
      setCancelingId(null);
    }
  };

  const handleOpenWhatsapp = (phone?: string | null, landlordFullName?: string) => {
    const landlordName = landlordFullName ?? 'Elena Vargas';
    const rawDigits = (phone ?? DEMO_SAFE_WHATSAPP).replace(/\D/g, '');
    const waDigits = rawDigits.startsWith('51')
      ? rawDigits
      : rawDigits.length === 9
      ? `51${rawDigits}`
      : DEMO_SAFE_WHATSAPP_DIGITS;
    const text = encodeURIComponent(
      `Hola ${landlordName}, soy Mateo de la PUCP, mi solicitud fue aceptada y quisiera coordinar una visita.`
    );
    window.open(
      `https://wa.me/${waDigits}?text=${text}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F2042] tracking-tight">
            Mis Solicitudes de Contacto
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Seguimiento de solicitudes enviadas a propietarios verificados.
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-500 tabular-nums">
          {requests.length} solicitud{requests.length === 1 ? '' : 'es'}
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <Inbox className="w-9 h-9 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-[#0F2042]">
            Aún no has enviado solicitudes
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Explora el catálogo y contacta al propietario de la habitación que te interese.
          </p>
          <button
            type="button"
            onClick={onExploreCatalog}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1D4ED8] text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
          >
            <span>Explorar habitaciones</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((reqItem) => {
            const room =
              reqItem?.room ??
              (INITIAL_ROOMS ?? []).find((r) => r?.id === reqItem?.roomId);
            const targetRoomId = room?.id ?? reqItem?.roomId;
            const displayTitle =
              room?.title ?? reqItem?.roomTitle ?? 'Habitación Universitaria';
            const displayDistrict =
              room?.district ?? reqItem?.roomDistrict ?? 'San Miguel';
            const landlordName =
              room?.landlord?.fullName ??
              room?.landlord?.name ??
              'Elena Vargas';
            const landlordPhone =
              room?.landlord?.whatsapp ??
              room?.landlord?.phone ??
              DEMO_SAFE_WHATSAPP;

            const isAccepted = reqItem?.status === 'ACEPTADA';
            const isPending = reqItem?.status === 'PENDIENTE';
            const isCanceled = reqItem?.status === 'CANCELADA';

            return (
              <div
                key={reqItem?.id}
                className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  {room?.photos?.[0] && (
                    <img
                      src={room.photos[0]}
                      alt={displayTitle}
                      onClick={() => targetRoomId && onSelectRoom(targetRoomId)}
                      className="w-24 aspect-[4/3] rounded-md object-cover border border-slate-200 shrink-0 cursor-pointer"
                    />
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isAccepted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#059669] text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Solicitud aceptada
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                          <Clock className="w-3 h-3" />
                          Solicitud enviada (Pendiente)
                        </span>
                      ) : isCanceled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
                          <XCircle className="w-3 h-3" />
                          Envío pausado por control de solicitudes (48h)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-[#DC2626] text-[11px] font-semibold">
                          <XCircle className="w-3 h-3" />
                          Rechazada
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        <MapPin className="w-3 h-3 text-[#1D4ED8]" />
                        {displayDistrict}
                      </span>
                    </div>

                    <h3
                      onClick={() => targetRoomId && onSelectRoom(targetRoomId)}
                      className="text-sm sm:text-base font-bold text-[#0F2042] hover:text-[#1D4ED8] cursor-pointer truncate"
                    >
                      {displayTitle}
                    </h3>

                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <span>Propietario: {landlordName}</span>
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {isAccepted ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenWhatsapp(landlordPhone, landlordName)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Contactar por WhatsApp ({landlordPhone})</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : isPending ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#F8F9FA] border border-slate-200 text-xs text-slate-500 font-mono">
                        <Lock className="w-3 h-3" />
                        {room?.landlord?.whatsappMasked ?? '+51 9•• ••• •••'}
                      </span>
                      <button
                        type="button"
                        disabled={cancelingId === reqItem.id}
                        onClick={() => handleCancel(reqItem.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-[#DC2626] text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancelar solicitud</span>
                      </button>
                    </>
                  ) : null}

                  {targetRoomId && (
                    <button
                      type="button"
                      onClick={() => onSelectRoom(targetRoomId)}
                      className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0F2042] transition-colors"
                    >
                      Ver habitación
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentRequests;
