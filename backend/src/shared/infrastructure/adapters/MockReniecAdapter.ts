import { IReniecPort, ReniecCitizenProfile } from '../../core/ports/IReniecPort';

interface FictionalCitizen {
  firstName: string;
  lastNames: string;
  fullName: string;
}

const KNOWN_FICTIONAL_CITIZENS: Record<string, FictionalCitizen> = {
  '41829304': {
    firstName: 'Carlos',
    lastNames: 'Mendoza Salazar',
    fullName: 'Ing. Carlos Mendoza',
  },
  '43910285': {
    firstName: 'Elena',
    lastNames: 'Vargas de Paredes',
    fullName: 'Dra. Elena Vargas',
  },
  '40592817': {
    firstName: 'Jorge Luis',
    lastNames: 'Huamán Quispe',
    fullName: 'Dr. Jorge Luis Huamán',
  },
  '45819203': {
    firstName: 'Roberto',
    lastNames: 'Castillo Paredes',
    fullName: 'Ing. Roberto Castillo Paredes',
  },
  '42718394': {
    firstName: 'Carmen Rosa',
    lastNames: 'Zevallos Alarcón',
    fullName: 'Lic. Carmen Rosa Zevallos',
  },
};

const FICTIONAL_FIRST_NAMES = [
  'Alejandro',
  'Patricia',
  'Fernando',
  'Lucía',
  'Ricardo',
  'Gabriela',
  'Mauricio',
  'Rocío',
];

const FICTIONAL_LAST_NAMES = [
  'Salazar Quispe',
  'Mendoza Huamán',
  'Paredes Villavicencio',
  'Zevallos Cáceres',
  'Valdivia Rojas',
  'Alarcón Benavides',
  'Chávez Del Carpio',
  'Lozano Seminario',
];

export class MockReniecAdapter implements IReniecPort {
  private static readonly NETWORK_DELAY_MS = 700;
  private static readonly DNI_REGEX = /^\d{8}$/;
  private static readonly INVALID_SEQUENCES = new Set(['00000000', '11111111', '99999999']);

  private simulateNetworkLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, MockReniecAdapter.NETWORK_DELAY_MS));
  }

  public async validateDni(dni: string, providedFullName?: string): Promise<ReniecCitizenProfile> {
    await this.simulateNetworkLatency();

    const normalizedDni = (dni ?? '').trim();

    if (
      !MockReniecAdapter.DNI_REGEX.test(normalizedDni) ||
      MockReniecAdapter.INVALID_SEQUENCES.has(normalizedDni)
    ) {
      return {
        dni: normalizedDni,
        fullName: '',
        firstName: '',
        lastNames: '',
        isValid: false,
        verifiedAt: new Date().toISOString(),
        message:
          'Validación RENIEC rechazada: El DNI debe contener exactamente 8 dígitos numéricos válidos.',
      };
    }

    const known = KNOWN_FICTIONAL_CITIZENS[normalizedDni];
    if (known) {
      const resolvedFullName = providedFullName?.trim() || known.fullName;
      return {
        dni: normalizedDni,
        fullName: resolvedFullName,
        firstName: known.firstName,
        lastNames: known.lastNames,
        isValid: true,
        verifiedAt: new Date().toISOString(),
        message: 'Identidad verificada satisfactoriamente en el padrón simulado RENIEC.',
      };
    }

    // Generación determinística de ciudadano peruano ficticio a partir de los dígitos del DNI
    const seed = parseInt(normalizedDni.slice(-2), 10) || 0;
    const defaultFirstName = FICTIONAL_FIRST_NAMES[seed % FICTIONAL_FIRST_NAMES.length];
    const defaultLastNames = FICTIONAL_LAST_NAMES[seed % FICTIONAL_LAST_NAMES.length];
    const resolvedFullName =
      providedFullName?.trim() || `${defaultFirstName} ${defaultLastNames}`;

    return {
      dni: normalizedDni,
      fullName: resolvedFullName,
      firstName: defaultFirstName,
      lastNames: defaultLastNames,
      isValid: true,
      verifiedAt: new Date().toISOString(),
      message: 'Identidad verificada satisfactoriamente en el padrón simulado RENIEC.',
    };
  }
}
