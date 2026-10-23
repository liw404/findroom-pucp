import React, { useEffect, useState } from 'react';
import { Building2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEMO_PROFILES,
  DemoUserProfile,
  getActiveDemoUser,
  setActiveDemoRole,
  subscribeDemoUser,
} from '../services/api';

interface DemoRoleSwitcherProps {
  onRoleChange?: (profile: DemoUserProfile) => void;
}

export const DemoRoleSwitcher: React.FC<DemoRoleSwitcherProps> = ({ onRoleChange }) => {
  const [activeUser, setActiveUser] = useState<DemoUserProfile>(() => getActiveDemoUser());

  useEffect(() => {
    return subscribeDemoUser((updated) => {
      setActiveUser(updated);
      onRoleChange?.(updated);
    });
  }, [onRoleChange]);

  const handleSelectRole = (role: 'ESTUDIANTE' | 'ARRENDADOR') => {
    if (activeUser.role === role) return;
    const nextProfile = setActiveDemoRole(role);

    toast.success(`Sesión activa: ${nextProfile.label}`);
  };

  return (
    <div className="w-full bg-[#0F2042] text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-xs text-slate-300 font-medium">
          Vista de prueba rápida — Selecciona un perfil:
        </span>

        <div
          role="group"
          aria-label="Selector rápido de rol"
          className="inline-flex rounded-md bg-slate-900/90 p-1 border border-slate-700"
        >
          <button
            type="button"
            onClick={() => handleSelectRole('ESTUDIANTE')}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition-colors ${
              activeUser.role === 'ESTUDIANTE'
                ? 'bg-[#1D4ED8] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>{DEMO_PROFILES.ESTUDIANTE.label}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRole('ARRENDADOR')}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition-colors ${
              activeUser.role === 'ARRENDADOR'
                ? 'bg-[#1D4ED8] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>{DEMO_PROFILES.ARRENDADOR.label}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoRoleSwitcher;
