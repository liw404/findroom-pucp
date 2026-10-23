import React from 'react';
import { CheckCircle2, HelpCircle, Lock, MapPin, Scale, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import BrandLogo from './BrandLogo';

interface FooterProps {
  onSelectDistrict?: (district: string) => void;
}

const COVERAGE_ZONES = [
  'San Miguel',
  'Pueblo Libre',
  'Jesús María',
  'Magdalena',
  'Cercado',
];

export const Footer: React.FC<FooterProps> = ({ onSelectDistrict }) => {
  const handleZoneClick = (zone: string) => {
    if (onSelectDistrict) {
      onSelectDistrict(zone);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-16 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Columna 1: FindRoom */}
          <div className="space-y-3">
            <BrandLogo size="sm" onClick={() => handleZoneClick('TODOS')} />
            <p className="text-xs leading-relaxed text-slate-500">
              Plataforma especializada en conectar a la comunidad estudiantil PUCP con
              alojamiento seguro, cercano al campus y con propietarios previamente validados.
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#059669] bg-emerald-50/80 border border-emerald-200/80 px-2.5 py-1 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Comunidad Universitaria Verificada</span>
            </div>
          </div>

          {/* Columna 2: Zonas de Cobertura */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F2042]">
              Zonas de Cobertura
            </h3>
            <ul className="space-y-2 text-xs">
              {COVERAGE_ZONES.map((zone) => (
                <li key={zone}>
                  <button
                    type="button"
                    onClick={() => handleZoneClick(zone)}
                    className="inline-flex items-center gap-1.5 text-slate-600 hover:text-[#1D4ED8] transition-colors"
                  >
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>Habitaciones en {zone}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3: Seguridad y Confianza */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F2042]">
              Seguridad y Confianza
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                <span>Validación de identidad de arrendadores y titularidad registral de predios.</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0 mt-0.5" />
                <span>
                  Deslinde de pagos directos: FindRoom no procesa cobros ni retiene garantías; toda transacción se acuerda directamente con el propietario.
                </span>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    toast.info('Centro de Ayuda PUCP', {
                      description:
                        'Para soporte o reporte de anuncios escribe a soporte@findroom.pe.',
                    })
                  }
                  className="inline-flex items-center gap-1.5 font-medium text-[#0F2042] hover:text-[#1D4ED8] transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Centro de ayuda y recomendaciones</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Columna 4: Marco Legal */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F2042]">
              Marco Legal
            </h3>
            <div className="space-y-2.5 text-xs text-slate-500 leading-relaxed">
              <p className="flex items-start gap-2">
                <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Cumplimiento estricto de la{' '}
                  <strong className="text-slate-700 font-semibold">
                    Ley N° 29733
                  </strong>{' '}
                  (Ley de Protección de Datos Personales - Perú). Los números de contacto permanecen protegidos hasta el consentimiento expreso del titular.
                </span>
              </p>
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() =>
                    toast.info('Términos de Servicio', {
                      description:
                        'Uso exclusivo para miembros de la comunidad universitaria y propietarios verificados.',
                    })
                  }
                  className="hover:text-[#1D4ED8] underline underline-offset-2"
                >
                  Términos de Servicio
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() =>
                    toast.info('Política de Privacidad — Ley N° 29733', {
                      description:
                        'Tus datos personales solo se comparten con autorización explícita.',
                    })
                  }
                  className="hover:text-[#1D4ED8] underline underline-offset-2"
                >
                  Política de Privacidad
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>© 2026 FindRoom PUCP. Todos los derechos reservados.</span>
          <span>Diseñado para San Miguel · Pueblo Libre · Jesús María · Magdalena</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
