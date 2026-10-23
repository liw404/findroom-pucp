import React from 'react';
import {
  BadgeCheck,
  Building2,
  FileCheck2,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { DemoUserProfile } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: DemoUserProfile;
  favoritesCount: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  favoritesCount,
}) => {
  if (!isOpen) return null;

  const isStudent = user.role === 'ESTUDIANTE';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]"
    >
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 bg-[#0F2042] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              {isStudent ? (
                <GraduationCap className="w-5 h-5 text-sky-300" />
              ) : (
                <Building2 className="w-5 h-5 text-emerald-300" />
              )}
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-sm font-bold">
                {user.fullName}
              </h2>
              <span className="text-[11px] text-slate-300">
                {isStudent ? 'Estudiante Pregrado PUCP' : 'Propietario Verificado'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-md bg-[#F8F9FA] border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Correo electrónico
              </span>
              <span className="font-mono font-medium text-[#0F2042]">{user.email}</span>
            </div>

            {isStudent ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Código PUCP</span>
                  <span className="font-mono font-bold text-[#1D4ED8] tabular-nums">
                    {user.codigoPucp ?? '20210842'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Facultad</span>
                  <span className="font-semibold text-[#0F2042]">
                    {user.facultad ?? 'Ciencias e Ingeniería'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ciclo actual</span>
                  <span className="font-semibold text-[#0F2042]">
                    {user.ciclo ?? '7.° ciclo'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Habitaciones favoritas</span>
                  <span className="font-bold text-[#0F2042] tabular-nums">
                    {favoritesCount}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Documento de identidad</span>
                  <span className="font-mono font-bold text-[#0F2042] tabular-nums">
                    DNI {user.dni}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-[#059669]" />
                    Partida Registral
                  </span>
                  <span className="font-mono font-bold text-[#059669] tabular-nums">
                    {user.partidaRegistral}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    WhatsApp registrado
                  </span>
                  <span className="font-mono font-semibold text-[#0F2042] tabular-nums">
                    {user.whatsapp}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-[#059669] bg-emerald-50/70 border border-emerald-200 px-3 py-2 rounded-md">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              {isStudent
                ? 'Cuenta institucional autenticada mediante SSO PUCP.'
                : 'Identidad y titularidad del inmueble verificadas.'}
            </span>
            <BadgeCheck className="w-4 h-4 ml-auto shrink-0" />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-[#0F2042] text-white font-semibold hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
