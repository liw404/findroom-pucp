import React, { useEffect, useRef, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import {
  Bell,
  Bookmark,
  Building2,
  CheckCheck,
  Compass,
  ExternalLink,
  FileCheck2,
  FileText,
  Inbox,
  MessageCircle,
  PlusCircle,
  User,
} from 'lucide-react';
import DemoRoleSwitcher from './components/DemoRoleSwitcher';
import BrandLogo from './components/BrandLogo';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Catalog from './pages/Catalog';
import RoomDetail from './pages/RoomDetail';
import LandlordDashboard, { LandlordSection } from './pages/LandlordDashboard';
import StudentRequests from './pages/StudentRequests';
import ProfilePage from './pages/ProfilePage';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  DEMO_SAFE_WHATSAPP_DIGITS,
  DemoUserProfile,
  getActiveDemoUser,
  getNotificationsForRole,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeDemoUser,
  subscribeNotifications,
} from './services/api';
import { useFavorites } from './hooks/useFavorites';
import { AppNotificationItem } from './types/room';

const RoomDetailRouteWrapper: React.FC<{ activeUser: DemoUserProfile }> = ({
  activeUser,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return (
    <RoomDetail
      roomId={id}
      activeUser={activeUser}
      onBack={() => {
        if (activeUser?.role === 'ARRENDADOR') {
          navigate('/landlord/properties');
        } else {
          navigate('/');
        }
      }}
    />
  );
};

const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: authLoading } = useAuth();

  const [activeUser, setActiveUser] = useState<DemoUserProfile>(() =>
    getActiveDemoUser()
  );
  const [landlordCreateMode, setLandlordCreateMode] = useState<boolean>(false);
  const [externalDistrict, setExternalDistrict] = useState<string | null>(null);

  // Hook único centralizado de Favoritos con persistencia en localStorage
  const { favoritesCount } = useFavorites();

  // Notificaciones reactivas por rol
  const [notifications, setNotifications] = useState<AppNotificationItem[]>(() =>
    getNotificationsForRole(getActiveDemoUser()?.role ?? 'ESTUDIANTE')
  );
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return subscribeDemoUser((updatedProfile) => {
      setActiveUser(updatedProfile);
      setNotifications(getNotificationsForRole(updatedProfile.role));
      setIsNotifOpen(false);
      setLandlordCreateMode(false);

      if (updatedProfile.role === 'ARRENDADOR') {
        navigate('/landlord/properties', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!activeUser?.role) return;
    setNotifications(getNotificationsForRole(activeUser.role));
    return subscribeNotifications(() => {
      setNotifications(getNotificationsForRole(activeUser.role));
    });
  }, [activeUser?.role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = (notifications ?? []).filter((n) => !n?.read).length;

  const handleOpenWhatsAppFromNotification = (notif: AppNotificationItem) => {
    if (notif?.id) {
      markNotificationRead(notif.id);
    }
    const text = encodeURIComponent(
      'Hola Elena Vargas, soy Mateo de la PUCP, mi solicitud fue aceptada y quisiera coordinar una visita.'
    );
    window.open(
      `https://wa.me/${DEMO_SAFE_WHATSAPP_DIGITS}?text=${text}`,
      '_blank',
      'noopener,noreferrer'
    );
    toast.success('Abriendo conversación en WhatsApp');
  };

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col">
      <Toaster position="top-right" richColors closeButton />

      {/* Conmutador de prueba superior */}
      <DemoRoleSwitcher />

      {/* Header Sticky Translúcido con enlaces SPA <Link> */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-14 py-2 flex flex-wrap items-center justify-between gap-3">
          {/* Logo e Isotipo */}
          <BrandLogo
            onClick={() => {
              setLandlordCreateMode(false);
              if (activeUser?.role === 'ARRENDADOR') {
                navigate('/landlord/properties');
              } else {
                navigate('/');
              }
            }}
          />

          {/* Navegación por Rol + Campana + Mi Perfil */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {activeUser?.role === 'ESTUDIANTE' ? (
              <>
                <Link
                  to="/"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentPath === '/'
                      ? 'bg-[#0F2042] text-white'
                      : 'text-slate-600 hover:text-[#0F2042] hover:bg-slate-100'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Explorar</span>
                </Link>

                <Link
                  to="/favorites"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentPath === '/favorites'
                      ? 'bg-[#0F2042] text-white'
                      : 'text-slate-600 hover:text-[#0F2042] hover:bg-slate-100'
                  }`}
                >
                  <Bookmark
                    className="w-3.5 h-3.5 stroke-[1.75]"
                    fill={
                      favoritesCount > 0 && currentPath !== '/favorites'
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                  <span className="tabular-nums">
                    Favoritos ({favoritesCount})
                  </span>
                </Link>

                <Link
                  to="/requests"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentPath === '/requests'
                      ? 'bg-[#0F2042] text-white'
                      : 'text-slate-600 hover:text-[#0F2042] hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Mis Solicitudes</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/landlord/properties"
                  onClick={() => setLandlordCreateMode(false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentPath === '/landlord/properties' && !landlordCreateMode
                      ? 'bg-[#0F2042] text-white'
                      : 'text-slate-600 hover:text-[#0F2042] hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Mis Propiedades</span>
                </Link>

                <Link
                  to="/landlord/requests"
                  onClick={() => setLandlordCreateMode(false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentPath === '/landlord/requests'
                      ? 'bg-[#0F2042] text-white'
                      : 'text-slate-600 hover:text-[#0F2042] hover:bg-slate-100'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Solicitudes Recibidas</span>
                </Link>

                <Link
                  to="/landlord/tenants"
                  onClick={() => setLandlordCreateMode(false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentPath === '/landlord/tenants'
                      ? 'bg-[#0F2042] text-white'
                      : 'text-slate-600 hover:text-[#0F2042] hover:bg-slate-100'
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Historial de Inquilinos</span>
                </Link>

                <Link
                  to="/landlord/properties"
                  onClick={() => setLandlordCreateMode(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentPath === '/landlord/properties' && landlordCreateMode
                      ? 'bg-[#1D4ED8] text-white'
                      : 'text-[#1D4ED8] hover:bg-blue-50'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Publicar Habitación</span>
                </Link>

                <Link
                  to="/"
                  onClick={() => setLandlordCreateMode(false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    currentPath === '/'
                      ? 'bg-[#0F2042] text-white'
                      : 'text-slate-600 hover:text-[#0F2042] hover:bg-slate-100'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Explorar Mercado</span>
                </Link>
              </>
            )}

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Campana de Notificaciones con Dropdown Flotante */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                aria-label="Centro de notificaciones"
                className={`relative w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                  isNotifOpen
                    ? 'bg-slate-100 border-slate-300 text-[#0F2042]'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-[#0F2042] hover:border-slate-300'
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626] ring-2 ring-white" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8F9FA] border-b border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0F2042]">
                      Notificaciones
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        markAllNotificationsRead(
                          activeUser?.role ?? 'ESTUDIANTE'
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1D4ED8] hover:underline"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Marcar todas como leídas</span>
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {(notifications ?? []).length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No tienes notificaciones pendientes.
                      </div>
                    ) : (
                      (notifications ?? []).map((notif) => (
                        <div
                          key={notif?.id}
                          onClick={() => {
                            if (notif?.id) markNotificationRead(notif.id);
                            if (notif?.roomId && !notif?.whatsappPhone) {
                              setIsNotifOpen(false);
                              if (activeUser?.role === 'ARRENDADOR') {
                                navigate('/landlord/requests');
                              } else {
                                navigate(`/room/${notif.roomId}`);
                              }
                            }
                          }}
                          className={`p-3.5 space-y-2 transition-colors cursor-pointer ${
                            notif?.read ? 'bg-white' : 'bg-blue-50/40'
                          } hover:bg-slate-50`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-[#0F2042] leading-snug">
                              {notif?.title}
                            </span>
                            {!notif?.read && (
                              <span className="w-2 h-2 rounded-full bg-[#1D4ED8] shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {notif?.description}
                          </p>
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className="text-[11px] text-slate-400">
                              {notif?.createdAt}
                            </span>

                            {notif?.whatsappPhone && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWhatsAppFromNotification(notif);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#059669] hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors shadow-xs"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>Abrir WhatsApp</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Enlace SPA Mi Perfil -> /profile */}
            <Link
              to="/profile"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors whitespace-nowrap ${
                currentPath === '/profile'
                  ? 'bg-[#0F2042] text-white border-[#0F2042]'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-[#0F2042]'
              }`}
            >
              <User
                className={`w-3.5 h-3.5 ${
                  currentPath === '/profile' ? 'text-white' : 'text-[#1D4ED8]'
                }`}
              />
              <span>Mi Perfil</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal con React Router Declarativo */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          {/* Catálogo General / Explorar Mercado */}
          <Route
            path="/"
            element={
              <Catalog
                activeUser={activeUser}
                favoritesOnly={false}
                externalDistrict={externalDistrict}
                onClearExternalDistrict={() => setExternalDistrict(null)}
                onSelectRoom={(id) => navigate(`/room/${id}`)}
                onShowAllCatalog={() => navigate('/')}
              />
            }
          />

          {/* Vista de Favoritos sincronizada en tiempo real */}
          <Route
            path="/favorites"
            element={
              <Catalog
                activeUser={activeUser}
                favoritesOnly={true}
                onSelectRoom={(id) => navigate(`/room/${id}`)}
                onShowAllCatalog={() => navigate('/')}
              />
            }
          />

          {/* Mis Solicitudes (Estudiante) */}
          <Route
            path="/requests"
            element={
              <StudentRequests
                activeUser={activeUser}
                onSelectRoom={(id) => navigate(`/room/${id}`)}
                onExploreCatalog={() => navigate('/')}
              />
            }
          />

          {/* Detalle de Habitación (/room/:id y /rooms/:id) */}
          <Route
            path="/room/:id"
            element={<RoomDetailRouteWrapper activeUser={activeUser} />}
          />
          <Route
            path="/rooms/:id"
            element={<RoomDetailRouteWrapper activeUser={activeUser} />}
          />

          {/* Mi Perfil (Estudiante y Arrendador) */}
          <Route
            path="/profile"
            element={
              <ProfilePage
                activeUser={activeUser}
                onSelectRoom={(id) => navigate(`/room/${id}`)}
              />
            }
          />

          {/* Vista 1 Exclusiva del Arrendador: Mis Propiedades (/landlord/properties) */}
          <Route
            path="/landlord/properties"
            element={
              <ProtectedRoute
                activeUser={activeUser}
                isLoading={authLoading}
                allowedRole="ARRENDADOR"
              >
                <LandlordDashboard
                  activeUser={activeUser}
                  activeSection={landlordCreateMode ? 'CREATE' : 'PROPERTIES'}
                  onChangeSection={(sec: LandlordSection) => {
                    if (sec === 'REQUESTS') {
                      setLandlordCreateMode(false);
                      navigate('/landlord/requests');
                    } else if (sec === 'TENANTS') {
                      setLandlordCreateMode(false);
                      navigate('/landlord/tenants');
                    } else {
                      setLandlordCreateMode(sec === 'CREATE');
                    }
                  }}
                  onSelectRoom={(id) => navigate(`/room/${id}`)}
                />
              </ProtectedRoute>
            }
          />

          {/* Vista 2 Exclusiva del Arrendador: Solicitudes Recibidas (/landlord/requests) */}
          <Route
            path="/landlord/requests"
            element={
              <ProtectedRoute
                activeUser={activeUser}
                isLoading={authLoading}
                allowedRole="ARRENDADOR"
              >
                <LandlordDashboard
                  activeUser={activeUser}
                  activeSection="REQUESTS"
                  onChangeSection={(sec: LandlordSection) => {
                    if (sec === 'TENANTS') {
                      setLandlordCreateMode(false);
                      navigate('/landlord/tenants');
                    } else if (sec !== 'REQUESTS') {
                      setLandlordCreateMode(sec === 'CREATE');
                      navigate('/landlord/properties');
                    }
                  }}
                  onSelectRoom={(id) => navigate(`/room/${id}`)}
                />
              </ProtectedRoute>
            }
          />

          {/* Vista 3 Exclusiva del Arrendador: Historial de Inquilinos (/landlord/tenants) */}
          <Route
            path="/landlord/tenants"
            element={
              <ProtectedRoute
                activeUser={activeUser}
                isLoading={authLoading}
                allowedRole="ARRENDADOR"
              >
                <LandlordDashboard
                  activeUser={activeUser}
                  activeSection="TENANTS"
                  onChangeSection={(sec: LandlordSection) => {
                    if (sec === 'REQUESTS') {
                      setLandlordCreateMode(false);
                      navigate('/landlord/requests');
                    } else if (sec !== 'TENANTS') {
                      setLandlordCreateMode(sec === 'CREATE');
                      navigate('/landlord/properties');
                    }
                  }}
                  onSelectRoom={(id) => navigate(`/room/${id}`)}
                />
              </ProtectedRoute>
            }
          />

          {/* Alias protegidos /landlord y /panel-arrendador */}
          <Route
            path="/landlord"
            element={
              <ProtectedRoute
                activeUser={activeUser}
                isLoading={authLoading}
                allowedRole="ARRENDADOR"
              >
                <Navigate to="/landlord/properties" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel-arrendador"
            element={
              <ProtectedRoute
                activeUser={activeUser}
                isLoading={authLoading}
                allowedRole="ARRENDADOR"
              >
                <Navigate to="/landlord/properties" replace />
              </ProtectedRoute>
            }
          />

          {/* Fallback declarativo */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer Corporativo de 4 Columnas */}
      <Footer
        onSelectDistrict={(zone) => {
          setExternalDistrict(zone);
          navigate('/');
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
