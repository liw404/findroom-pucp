import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bath,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Droplets,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  GraduationCap,
  ImagePlus,
  Inbox,
  Lock,
  MapPin,
  Maximize2,
  MessageCircle,
  Pencil,
  Plus,
  Sofa,
  Star,
  Trash2,
  UploadCloud,
  UserCheck,
  Wifi,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DEMO_PROFILES,
  DEMO_SAFE_WHATSAPP_DIGITS,
  DemoUserProfile,
  getStudentPublicProfile,
  getTenantLeasesForLandlord,
  LANDLORD_ELENA_ID,
  requestService,
  roomService,
  subscribeStudentEvaluations,
  useRequests,
} from '../services/api';
import { SEED_IDS } from '../services/seedData';
import {
  ContactRequestItem,
  RoomItem,
  RoomStatus,
  TenantLeaseItem,
} from '../types/room';
import EditRoomModal from '../components/EditRoomModal';
import StudentProfileDrawer from '../components/StudentProfileDrawer';
import RateStudentModal from '../components/RateStudentModal';

export type LandlordSection = 'PROPERTIES' | 'REQUESTS' | 'TENANTS' | 'CREATE';

interface LandlordDashboardProps {
  activeUser?: DemoUserProfile | null;
  activeSection?: LandlordSection;
  onChangeSection?: (section: LandlordSection) => void;
  onSelectRoom?: (roomId: string) => void;
}

export const LandlordDashboard: React.FC<LandlordDashboardProps> = ({
  activeUser,
  activeSection = 'PROPERTIES',
  onChangeSection,
  onSelectRoom,
}) => {
  const currentUser: DemoUserProfile =
    activeUser?.role === 'ARRENDADOR' ? activeUser : DEMO_PROFILES.ARRENDADOR;

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [tenantLeases, setTenantLeases] = useState<TenantLeaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [togglingRoomId, setTogglingRoomId] = useState<string | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(
    activeSection === 'CREATE'
  );

  // Almacén reactivo unificado de solicitudes (findroom_requests)
  const { requests: allRequests, refreshRequests } = useRequests();

  // Estado para Drawer de Perfil Público del Estudiante y Modal de Calificación a Inquilino
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<{
    studentId: string;
    fullName?: string;
    facultad?: string;
    memberSince?: string;
  } | null>(null);
  const [leaseToRate, setLeaseToRate] = useState<TenantLeaseItem | null>(null);
  const [, setEvalVersion] = useState<number>(0);

  // Estado del formulario "Publicar Habitación"
  const [newRoomTitle, setNewRoomTitle] = useState<string>('');
  const [newRoomDistrict, setNewRoomDistrict] = useState<string>('San Miguel');
  const [newRoomAddress, setNewRoomAddress] = useState<string>('');
  const [newRoomPrice, setNewRoomPrice] = useState<number>(750);
  const [newRoomArea, setNewRoomArea] = useState<number>(16);
  const [newRoomBath, setNewRoomBath] = useState<'PRIVADO' | 'COMPARTIDO'>('PRIVADO');
  const [newRoomFurnished, setNewRoomFurnished] = useState<boolean>(true);
  const [newIncludesWater, setNewIncludesWater] = useState<boolean>(true);
  const [newIncludesElectricity, setNewIncludesElectricity] = useState<boolean>(true);
  const [newIncludesWifi, setNewIncludesWifi] = useState<boolean>(true);
  const [newRoomDescription, setNewRoomDescription] = useState<string>('');
  const [newRoomPhotos, setNewRoomPhotos] = useState<string[]>([]);
  const [isDraggingCreate, setIsDraggingCreate] = useState<boolean>(false);
  const [creatingRoom, setCreatingRoom] = useState<boolean>(false);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeSection === 'CREATE') {
      setShowCreateForm(true);
    } else if (activeSection === 'REQUESTS' || activeSection === 'TENANTS') {
      setShowCreateForm(false);
    }
  }, [activeSection]);

  const refreshLeasesAndRatings = useCallback(() => {
    setTenantLeases(getTenantLeasesForLandlord(currentUser?.id));
    setEvalVersion((v) => v + 1);
  }, [currentUser?.id]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const targetLandlordId = currentUser?.id ?? LANDLORD_ELENA_ID;
      const landlordRooms = await roomService.getLandlordRooms(targetLandlordId);
      setRooms(Array.isArray(landlordRooms) ? landlordRooms : []);
      setTenantLeases(getTenantLeasesForLandlord(targetLandlordId));
      refreshRequests();
    } catch (error) {
      toast.error('No se pudo cargar el panel de gestión', {
        description:
          error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, refreshRequests]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const unsubscribe = subscribeStudentEvaluations(refreshLeasesAndRatings);
    return unsubscribe;
  }, [refreshLeasesAndRatings]);

  // Filtro seguro por ID en "Mis Propiedades"
  const myRooms = (rooms ?? []).filter(
    (r) =>
      r?.landlordId === currentUser?.id || r?.landlord?.id === currentUser?.id
  );

  // Filtro reactivo por ID en "Solicitudes Recibidas" desde findroom_requests
  const landlordRequests = (allRequests ?? []).filter(
    (request) =>
      request?.landlordId === currentUser?.id ||
      request?.room?.landlordId === currentUser?.id ||
      request?.room?.landlord?.id === currentUser?.id
  );

  const handleToggleRoomStatus = async (room: RoomItem) => {
    if (!room?.id) return;
    const nextStatus: RoomStatus =
      room?.status === 'ALQUILADO' ? 'DISPONIBLE' : 'ALQUILADO';

    setTogglingRoomId(room.id);
    try {
      await roomService.updateRoomStatus(
        room.id,
        nextStatus,
        currentUser?.id
      );

      setRooms((prev) =>
        (prev ?? []).map((r) =>
          r?.id === room.id ? { ...r, status: nextStatus } : r
        )
      );

      toast.success(
        nextStatus === 'ALQUILADO'
          ? 'Estado cambiado a Alquilado'
          : 'Estado cambiado a Disponible'
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el estado.'
      );
    } finally {
      setTogglingRoomId(null);
    }
  };

  const handleDeleteRoom = async (room: RoomItem) => {
    if (!room?.id) return;
    try {
      await roomService.deleteRoom(room.id, currentUser?.id);
      setRooms((prev) => (prev ?? []).filter((r) => r?.id !== room.id));
      refreshRequests();
      toast.success('Publicación eliminada');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se puede eliminar una habitación con solicitudes activas.'
      );
    }
  };

  const handleUpdateRequestStatus = async (
    reqItem: ContactRequestItem,
    newStatus: 'ACEPTADA' | 'RECHAZADA'
  ) => {
    if (!reqItem?.id) return;
    setUpdatingRequestId(reqItem.id);
    try {
      await requestService.updateRequestStatus(
        reqItem.id,
        newStatus,
        currentUser?.id
      );
      refreshRequests();

      toast.success(
        newStatus === 'ACEPTADA'
          ? 'Solicitud aceptada — Botón de WhatsApp (987654321) habilitado'
          : 'Solicitud rechazada'
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la solicitud.'
      );
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const processCreateFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.warning(`El archivo "${file.name}" no es una imagen válida.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewRoomPhotos((prev) => {
            if (prev.length >= 10) {
              toast.warning('Máximo 10 fotografías por publicación.');
              return prev;
            }
            return [...prev, reader.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success('Fotografías añadidas a la nueva publicación');
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesc = newRoomDescription.trim();
    if (cleanDesc.length < 30 || cleanDesc.length > 300) {
      toast.error('La descripción debe tener entre 30 y 300 caracteres.');
      return;
    }
    if (newRoomPhotos.length < 3 || newRoomPhotos.length > 10) {
      toast.error('Debes adjuntar entre 3 y 10 fotografías.');
      return;
    }

    const services: string[] = [];
    if (newIncludesWater) services.push('Agua');
    if (newIncludesElectricity) services.push('Luz');
    if (newIncludesWifi) services.push('WiFi fibra óptica');

    setCreatingRoom(true);
    try {
      await roomService.createRoom({
        landlordId: currentUser?.id ?? LANDLORD_ELENA_ID,
        title: newRoomTitle.trim() || `Habitación en ${newRoomDistrict}`,
        type: 'INDIVIDUAL',
        district: newRoomDistrict,
        address:
          newRoomAddress.trim() || `Av. Universitaria 1820, ${newRoomDistrict}`,
        monthlyPrice: Number(newRoomPrice),
        areaSqm: Number(newRoomArea),
        bathroomType: newRoomBath,
        isFurnished: newRoomFurnished,
        includesWater: newIncludesWater,
        includesElectricity: newIncludesElectricity,
        includesWifi: newIncludesWifi,
        includedServices: services,
        description: cleanDesc,
        photos: newRoomPhotos,
        distanceToPucpKm: 0.6,
        walkingMinutesToPucp: 8,
      });

      toast.success('Habitación publicada exitosamente');
      setNewRoomTitle('');
      setNewRoomAddress('');
      setNewRoomDescription('');
      setNewRoomPhotos([]);
      setShowCreateForm(false);
      onChangeSection?.('PROPERTIES');
      await fetchDashboardData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo publicar la habitación.'
      );
    } finally {
      setCreatingRoom(false);
    }
  };

  const renderTenantLeasesSection = () => {
    const safeLeases = tenantLeases ?? [];
    return (
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#1D4ED8]" />
              <h2 className="text-base sm:text-lg font-bold text-[#0F2042] tracking-tight">
                Historial de Inquilinos y Arriendos
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evalúa el comportamiento del estudiante únicamente cuando el contrato de alquiler ha finalizado.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700 self-start sm:self-auto">
            {safeLeases.length}{' '}
            {safeLeases.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="divide-y divide-slate-200/80">
          {safeLeases.map((lease) => {
            const studentFullName =
              lease?.student?.fullName ??
              lease?.student?.name ??
              lease?.studentName ??
              'Mateo Salazar';
            const studentFacultad =
              lease?.student?.facultad ??
              lease?.studentFacultad ??
              'Ciencias e Ingeniería';
            const rawMemberSince =
              lease?.student?.memberSince ??
              lease?.studentMemberSince ??
              'marzo 2025';
            const cleanMemberSince = rawMemberSince.replace(
              /^Miembro desde\s+/i,
              ''
            );

            const publicProfile = getStudentPublicProfile(
              lease?.studentId ?? SEED_IDS.STUDENT_MATEO,
              {
                fullName: studentFullName,
                facultad: studentFacultad,
                memberSince: cleanMemberSince,
              }
            );
            const isFinished = lease?.status === 'FINALIZADO';

            return (
              <div
                key={lease?.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedStudentForDrawer({
                          studentId: lease?.studentId ?? SEED_IDS.STUDENT_MATEO,
                          fullName: studentFullName,
                          facultad: studentFacultad,
                          memberSince: cleanMemberSince,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0F2042] hover:text-[#1D4ED8] transition-colors cursor-pointer"
                    >
                      <GraduationCap className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                      <span className="underline decoration-slate-300 underline-offset-2">
                        {studentFullName}
                      </span>
                    </button>

                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                      {(publicProfile?.averageRating ?? 5.0).toFixed(1)} (
                      {publicProfile?.totalEvaluations ?? 0})
                    </span>

                    {isFinished ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#059669] text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Contrato Finalizado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#1D4ED8] text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Arriendo en curso</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                    <span>Facultad: {studentFacultad}</span>
                    <span className="text-slate-300">•</span>
                    <span>Miembro desde {cleanMemberSince}</span>
                  </div>

                  <p className="text-xs font-medium text-slate-700">
                    Inmueble:{' '}
                    <span className="font-semibold text-[#0F2042]">
                      {lease?.roomTitle ?? 'Habitación'}
                    </span>{' '}
                    <span className="text-slate-500">
                      ({lease?.periodLabel ?? 'Semestral'})
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStudentForDrawer({
                        studentId: lease?.studentId ?? SEED_IDS.STUDENT_MATEO,
                        fullName: studentFullName,
                        facultad: studentFacultad,
                        memberSince: cleanMemberSince,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0F2042] transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    <span>Ver perfil</span>
                  </button>

                  {isFinished && !lease?.alreadyEvaluated ? (
                    <button
                      type="button"
                      onClick={() => setLeaseToRate(lease)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F2042] hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Calificar a inquilino</span>
                    </button>
                  ) : isFinished && lease?.alreadyEvaluated ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Inquilino calificado</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Solo se permite calificar cuando el contrato tiene estado Finalizado"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Calificar a inquilino</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const createCharCount = newRoomDescription.trim().length;
  const isCreateLengthValid = createCharCount >= 30 && createCharCount <= 300;
  const isRequestsView = activeSection === 'REQUESTS';
  const isTenantsView = activeSection === 'TENANTS';

  // ==========================================================
  // VISTA 3 EXCLUSIVA: HISTORIAL DE INQUILINOS (/landlord/tenants)
  // ==========================================================
  if (isTenantsView) {
    return (
      <div className="space-y-6">
        {renderTenantLeasesSection()}

        <StudentProfileDrawer
          isOpen={selectedStudentForDrawer !== null}
          studentId={selectedStudentForDrawer?.studentId ?? null}
          landlordId={currentUser?.id}
          fallbackStudent={selectedStudentForDrawer ?? undefined}
          onClose={() => setSelectedStudentForDrawer(null)}
          onOpenRateModal={(lease) => {
            setSelectedStudentForDrawer(null);
            setLeaseToRate(lease);
          }}
        />

        <RateStudentModal
          isOpen={leaseToRate !== null}
          lease={leaseToRate}
          landlordId={currentUser?.id ?? LANDLORD_ELENA_ID}
          landlordName={currentUser?.fullName ?? currentUser?.name ?? 'Elena Vargas'}
          onClose={() => setLeaseToRate(null)}
          onSuccess={() => {
            refreshLeasesAndRatings();
          }}
        />
      </div>
    );
  }

  // ==========================================================
  // VISTA 2 EXCLUSIVA: SOLICITUDES RECIBIDAS (/landlord/requests)
  // ==========================================================
  if (isRequestsView) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-[#1D4ED8]" />
              <h1 className="text-lg sm:text-xl font-bold text-[#0F2042] tracking-tight">
                Solicitudes Recibidas
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Revisa el perfil público y reputación del estudiante antes de autorizar el contacto por WhatsApp.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs font-semibold text-[#0F2042] tabular-nums self-start sm:self-auto">
            {landlordRequests.length}{' '}
            {landlordRequests.length === 1 ? 'solicitud' : 'solicitudes'}
          </span>
        </div>

        <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3 animate-pulse">
              <div className="h-24 bg-slate-200 rounded-lg" />
              <div className="h-24 bg-slate-200 rounded-lg" />
            </div>
          ) : landlordRequests.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
              <h2 className="text-sm font-bold text-[#0F2042]">
                No tienes solicitudes registradas
              </h2>
              <p className="text-xs text-slate-500">
                Cuando un estudiante se interese por alguna de tus habitaciones, aparecerá aquí inmediatamente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/80">
              {landlordRequests.map((reqItem) => {
                const isUpdating = updatingRequestId === reqItem?.id;
                const isAccepted = reqItem?.status === 'ACEPTADA';
                const isRejected =
                  reqItem?.status === 'RECHAZADA' ||
                  reqItem?.status === 'CANCELADA';

                const studentFullName =
                  reqItem?.studentName ??
                  reqItem?.student?.fullName ??
                  reqItem?.student?.name ??
                  'Mateo Salazar';
                const studentFacultad =
                  reqItem?.studentFaculty ??
                  reqItem?.student?.facultad ??
                  'Ciencias e Ingeniería';
                const rawMemberSince =
                  reqItem?.student?.memberSince ?? 'marzo 2025';
                const studentMemberSince = rawMemberSince.replace(
                  /^Miembro desde\s+/i,
                  ''
                );

                const publicProfile = getStudentPublicProfile(
                  reqItem?.studentId ?? SEED_IDS.STUDENT_MATEO,
                  {
                    fullName: studentFullName,
                    facultad: studentFacultad,
                    memberSince: studentMemberSince,
                  }
                );

                const studentFirstName = studentFullName.split(' ')[0] || 'Mateo';
                const whatsappHref = `https://wa.me/${DEMO_SAFE_WHATSAPP_DIGITS}?text=${encodeURIComponent(
                  `Hola ${studentFirstName}, vi tu solicitud en FindRoom para la habitación. Conversemos.`
                )}`;

                const displayRoomTitle =
                  reqItem?.roomTitle ?? reqItem?.room?.title ?? 'Habitación';
                const displayRoomDistrict =
                  reqItem?.roomDistrict ?? reqItem?.room?.district;

                return (
                  <div
                    key={reqItem?.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Nombre clicable para desplegar la ficha pública del estudiante */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudentForDrawer({
                              studentId:
                                reqItem?.studentId ?? SEED_IDS.STUDENT_MATEO,
                              fullName: studentFullName,
                              facultad: studentFacultad,
                              memberSince: studentMemberSince,
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0F2042] hover:text-[#1D4ED8] transition-colors cursor-pointer"
                          title="Ver ficha pública del estudiante"
                        >
                          <GraduationCap className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                          <span className="underline decoration-slate-300 underline-offset-2">
                            {studentFullName}
                          </span>
                        </button>

                        {/* Promedio de reputación en estrellas */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] font-bold">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                          <span>
                            {(publicProfile?.averageRating ?? 5.0).toFixed(1)} (
                            {publicProfile?.totalEvaluations ?? 0})
                          </span>
                        </span>

                        {isAccepted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#059669] text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aceptada</span>
                          </span>
                        ) : reqItem?.status === 'CANCELADA' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancelada</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-50 border border-red-200 text-[#DC2626] text-[11px] font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rechazada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pendiente</span>
                          </span>
                        )}
                      </div>

                      {/* Datos públicos permitidos: Facultad y Tiempo registrado (sin código PUCP ni correo institucional) */}
                      <div className="text-xs font-medium text-slate-600 flex flex-wrap items-center gap-2">
                        <span>Facultad: {studentFacultad}</span>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Miembro desde {studentMemberSince}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1 text-[#059669] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Identidad SSO PUCP
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#F8F9FA] border border-slate-200/80 space-y-1">
                        <div className="text-xs font-semibold text-[#1D4ED8]">
                          Inmueble: {displayRoomTitle}
                          {displayRoomDistrict ? ` (${displayRoomDistrict})` : ''}
                        </div>
                        {reqItem?.message && (
                          <p className="text-xs text-slate-600">
                            {reqItem.message.replace(/^\[CANCELADA\]\s*/, '')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Botón discreto "Ver perfil" */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStudentForDrawer({
                            studentId:
                              reqItem?.studentId ?? SEED_IDS.STUDENT_MATEO,
                            fullName: studentFullName,
                            facultad: studentFacultad,
                            memberSince: studentMemberSince,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[#0F2042] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        <span>Ver perfil</span>
                      </button>

                      {reqItem?.status !== 'CANCELADA' && (
                        <>
                          {isAccepted && (
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp (987654321)</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={isUpdating || isAccepted}
                            onClick={() =>
                              handleUpdateRequestStatus(reqItem, 'ACEPTADA')
                            }
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                              isAccepted
                                ? 'bg-emerald-100 text-[#059669] cursor-default'
                                : 'bg-[#059669] hover:bg-emerald-700 text-white cursor-pointer'
                            } disabled:opacity-60`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aceptar</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating || isRejected}
                            onClick={() =>
                              handleUpdateRequestStatus(reqItem, 'RECHAZADA')
                            }
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold transition-colors ${
                              isRejected
                                ? 'bg-red-100 text-[#DC2626] cursor-default'
                                : 'bg-white border border-[#DC2626] text-[#DC2626] hover:bg-red-50 cursor-pointer'
                            } disabled:opacity-60`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <StudentProfileDrawer
          isOpen={selectedStudentForDrawer !== null}
          studentId={selectedStudentForDrawer?.studentId ?? null}
          landlordId={currentUser?.id}
          fallbackStudent={selectedStudentForDrawer ?? undefined}
          onClose={() => setSelectedStudentForDrawer(null)}
          onOpenRateModal={(lease) => {
            setSelectedStudentForDrawer(null);
            setLeaseToRate(lease);
          }}
        />

        <RateStudentModal
          isOpen={leaseToRate !== null}
          lease={leaseToRate}
          landlordId={currentUser?.id ?? LANDLORD_ELENA_ID}
          landlordName={currentUser?.fullName ?? currentUser?.name ?? 'Elena Vargas'}
          onClose={() => setLeaseToRate(null)}
          onSuccess={() => {
            refreshLeasesAndRatings();
          }}
        />
      </div>
    );
  }

  // ==========================================================
  // VISTA 1 EXCLUSIVA: MIS PROPIEDADES (/landlord/properties)
  // ==========================================================
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1D4ED8]" />
            <h1 className="text-lg sm:text-xl font-bold text-[#0F2042] tracking-tight">
              Mis Propiedades — {currentUser?.fullName ?? currentUser?.name ?? 'Elena Vargas'}
            </h1>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Administra tus habitaciones publicadas, cambia su estado Disponible/Alquilado o edita sus detalles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const nextState = !showCreateForm;
            setShowCreateForm(nextState);
            onChangeSection?.(nextState ? 'CREATE' : 'PROPERTIES');
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-bold transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            {showCreateForm ? 'Ocultar formulario' : 'Registrar nueva publicación'}
          </span>
        </button>
      </div>

      {/* Formulario de Nueva Publicación */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateRoom}
          className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#0F2042]">
                Registrar nueva publicación
              </h2>
              <p className="text-xs text-slate-500">
                Completa los datos del inmueble y sube fotografías reales desde tu equipo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                onChangeSection?.('PROPERTIES');
              }}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Título del anuncio
              </label>
              <input
                type="text"
                required
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                placeholder="Ej. Habitación iluminada frente a parque a 6 min de PUCP"
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Distrito
              </label>
              <select
                value={newRoomDistrict}
                onChange={(e) => setNewRoomDistrict(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="San Miguel">San Miguel</option>
                <option value="Pueblo Libre">Pueblo Libre</option>
                <option value="Jesús María">Jesús María</option>
                <option value="Magdalena">Magdalena</option>
                <option value="Cercado">Cercado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Dirección referencial
              </label>
              <input
                type="text"
                required
                value={newRoomAddress}
                onChange={(e) => setNewRoomAddress(e.target.value)}
                placeholder="Av. Bolívar 1540, Pueblo Libre"
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Precio mensual (S/)
              </label>
              <input
                type="number"
                min={250}
                required
                value={newRoomPrice}
                onChange={(e) => setNewRoomPrice(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm font-semibold tabular-nums focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Área (m²)
              </label>
              <input
                type="number"
                min={6}
                required
                value={newRoomArea}
                onChange={(e) => setNewRoomArea(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm tabular-nums focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#0F2042] mb-2">
              Comodidades y servicios incluidos
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setNewRoomBath((prev) =>
                    prev === 'PRIVADO' ? 'COMPARTIDO' : 'PRIVADO'
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                  newRoomBath === 'PRIVADO'
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-[#F8F9FA] text-slate-700 border-slate-200'
                }`}
              >
                <Bath className="w-3.5 h-3.5" />
                <span>
                  {newRoomBath === 'PRIVADO' ? 'Baño Privado' : 'Baño Compartido'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setNewRoomFurnished((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                  newRoomFurnished
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-[#F8F9FA] text-slate-700 border-slate-200'
                }`}
              >
                <Sofa className="w-3.5 h-3.5" />
                <span>{newRoomFurnished ? 'Amoblado' : 'Sin amoblar'}</span>
              </button>

              <button
                type="button"
                onClick={() => setNewIncludesWater((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                  newIncludesWater
                    ? 'bg-emerald-50 text-[#059669] border-emerald-300'
                    : 'bg-[#F8F9FA] text-slate-600 border-slate-200'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Agua</span>
              </button>

              <button
                type="button"
                onClick={() => setNewIncludesElectricity((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                  newIncludesElectricity
                    ? 'bg-emerald-50 text-[#059669] border-emerald-300'
                    : 'bg-[#F8F9FA] text-slate-600 border-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Luz</span>
              </button>

              <button
                type="button"
                onClick={() => setNewIncludesWifi((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                  newIncludesWifi
                    ? 'bg-emerald-50 text-[#059669] border-emerald-300'
                    : 'bg-[#F8F9FA] text-slate-600 border-slate-200'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>WiFi fibra óptica</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="font-semibold text-[#0F2042]">
                Descripción de la habitación (30 a 300 caracteres)
              </label>
              <span
                className={`font-mono font-bold tabular-nums ${
                  isCreateLengthValid ? 'text-[#059669]' : 'text-[#DC2626]'
                }`}
              >
                {createCharCount} / 300
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              required
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              placeholder="Describe las comodidades, iluminación y cercanía al campus PUCP (mínimo 30 caracteres)..."
              className="w-full rounded-md bg-[#F8F9FA] border border-slate-200 p-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F2042]">
                Fotografías ({newRoomPhotos.length} / 10)
              </span>
              <button
                type="button"
                onClick={() => createFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Subir desde mi computadora</span>
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingCreate(true);
              }}
              onDragLeave={() => setIsDraggingCreate(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingCreate(false);
                processCreateFiles(e.dataTransfer.files);
              }}
              onClick={() => createFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDraggingCreate
                  ? 'border-[#1D4ED8] bg-blue-50/50'
                  : 'border-slate-300 bg-[#F8F9FA] hover:border-[#1D4ED8]'
              }`}
            >
              <input
                ref={createFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  processCreateFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-[#0F2042]">
                Arrastra tus fotografías o haz clic para subir (mínimo 3, máximo 10 fotos)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Previsualización inmediata con soporte JPG, PNG y WebP
              </p>
            </div>

            {newRoomPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {newRoomPhotos.map((photoUrl, index) => (
                  <div
                    key={index}
                    className="relative group aspect-[4/3] rounded-md overflow-hidden border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={photoUrl}
                      alt={`Previsualización ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewRoomPhotos((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-[#DC2626] text-white opacity-90 hover:opacity-100 transition-opacity shadow-xs"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                onChangeSection?.('PROPERTIES');
              }}
              className="px-4 py-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                creatingRoom ||
                !isCreateLengthValid ||
                newRoomPhotos.length < 3 ||
                newRoomPhotos.length > 10
              }
              className="px-4 py-2 rounded-md bg-[#059669] text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {creatingRoom ? 'Publicando...' : 'Publicar habitación'}
            </button>
          </div>
        </form>
      )}

      {/* Listado Exclusivo de Habitaciones Publicadas */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-28 bg-slate-200 rounded-lg" />
            <div className="h-28 bg-slate-200 rounded-lg" />
          </div>
        ) : myRooms.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-9 h-9 text-slate-400 mx-auto" />
            <h2 className="text-base font-bold text-[#0F2042]">
              No tienes propiedades registradas aún
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Publica tu primera habitación verificada para recibir solicitudes de estudiantes de la comunidad PUCP.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(true);
                onChangeSection?.('CREATE');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar mi primera habitación</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80">
            {myRooms.map((room) => {
              const isRented = room?.status === 'ALQUILADO';
              const isToggling = togglingRoomId === room?.id;

              return (
                <div
                  key={room?.id}
                  className={`p-5 transition-colors ${
                    isRented ? 'bg-slate-50/80' : 'bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-5">
                    <div
                      onClick={() => room?.id && onSelectRoom?.(room.id)}
                      className="w-full sm:w-44 aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 shrink-0 cursor-pointer border border-slate-200"
                    >
                      {room?.photos?.[0] && (
                        <img
                          src={room.photos[0]}
                          alt={room?.title ?? 'Habitación'}
                          className={`w-full h-full object-cover ${
                            isRented ? 'grayscale opacity-75' : ''
                          }`}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]">
                              <MapPin className="w-3.5 h-3.5" />
                              {room?.district ?? 'San Miguel'}
                            </span>
                            <h3
                              onClick={() => room?.id && onSelectRoom?.(room.id)}
                              className="text-base font-bold text-[#0F2042] hover:text-[#1D4ED8] cursor-pointer line-clamp-1"
                            >
                              {room?.title ?? 'Habitación'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {room?.address ?? ''}
                            </p>
                          </div>

                          <div className="text-right tabular-nums shrink-0">
                            <span className="text-base font-extrabold text-[#0F2042]">
                              S/ {(room?.monthlyPrice ?? 0).toLocaleString('es-PE')}
                            </span>
                            <span className="text-xs text-slate-500"> / mes</span>
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#F8F9FA] border border-slate-200 tabular-nums">
                            <Maximize2 className="w-3 h-3" />
                            {room?.areaSqm ?? 16} m²
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#F8F9FA] border border-slate-200">
                            <Bath className="w-3 h-3" />
                            {room?.bathroomType === 'PRIVADO'
                              ? 'Baño privado'
                              : 'Baño compartido'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#F8F9FA] border border-slate-200">
                            {room?.photos?.length ?? 0} fotografías
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!isRented}
                            disabled={isToggling}
                            onClick={() => handleToggleRoomStatus(room)}
                            className={`relative inline-flex h-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              !isRented ? 'bg-[#059669]' : 'bg-slate-400'
                            } disabled:opacity-50`}
                            style={{ width: '44px' }}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                !isRented ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {isRented ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-semibold">
                              <EyeOff className="w-3.5 h-3.5" />
                              Alquilado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-semibold">
                              <Eye className="w-3.5 h-3.5" />
                              Disponible
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingRoom(room)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:border-[#1D4ED8] text-[#0F2042] hover:text-[#1D4ED8] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar Habitación</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room)}
                            title="Eliminar publicación"
                            className="p-1.5 rounded-md border border-red-200 bg-red-50 text-[#DC2626] hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <EditRoomModal
        isOpen={editingRoom !== null}
        room={editingRoom}
        landlordId={currentUser?.id}
        onClose={() => setEditingRoom(null)}
        onRoomUpdated={(updated) => {
          setRooms((prev) =>
            (prev ?? []).map((item) =>
              item?.id === updated?.id ? updated : item
            )
          );
        }}
      />

      <StudentProfileDrawer
        isOpen={selectedStudentForDrawer !== null}
        studentId={selectedStudentForDrawer?.studentId ?? null}
        landlordId={currentUser?.id}
        fallbackStudent={selectedStudentForDrawer ?? undefined}
        onClose={() => setSelectedStudentForDrawer(null)}
        onOpenRateModal={(lease) => {
          setSelectedStudentForDrawer(null);
          setLeaseToRate(lease);
        }}
      />

      <RateStudentModal
        isOpen={leaseToRate !== null}
        lease={leaseToRate}
        landlordId={currentUser?.id ?? LANDLORD_ELENA_ID}
        landlordName={currentUser?.fullName ?? currentUser?.name ?? 'Elena Vargas'}
        onClose={() => setLeaseToRate(null)}
        onSuccess={() => {
          refreshLeasesAndRatings();
        }}
      />
    </div>
  );
};

export default LandlordDashboard;
