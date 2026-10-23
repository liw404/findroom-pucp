import {
  ISsoPort,
  SsoStudentInputOverride,
  SsoStudentProfile,
} from '../../core/ports/ISsoPort';

interface KnownStudentDirectoryEntry {
  fullName: string;
  codigoPucp: string;
  facultad: string;
}

const KNOWN_PUCP_STUDENTS: Record<string, KnownStudentDirectoryEntry> = {
  'mateo.salazar@pucp.edu.pe': {
    fullName: 'Mateo H. Salazar',
    codigoPucp: '20210842',
    facultad: 'Ciencias e Ingeniería',
  },
  'valeria.quispe@pucp.edu.pe': {
    fullName: 'Valeria Quispe',
    codigoPucp: '20230891',
    facultad: 'Arquitectura y Urbanismo',
  },
  'sebastian.rojas@pucp.edu.pe': {
    fullName: 'Sebastián Rojas',
    codigoPucp: '20214512',
    facultad: 'Gestión y Alta Dirección',
  },
};

const PUCP_FACULTIES = [
  'Ciencias e Ingeniería',
  'Arquitectura y Urbanismo',
  'Gestión y Alta Dirección',
  'Derecho',
  'Ciencias Sociales',
  'Ciencias y Artes de la Comunicación',
  'Letras y Ciencias Humanas',
];

export class MockSsoAdapter implements ISsoPort {
  private static readonly NETWORK_DELAY_MS = 700;
  private static readonly PUCP_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@pucp\.edu\.pe$/i;
  private static readonly PUCP_CODE_REGEX = /^\d{8}$/;

  private simulateNetworkLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, MockSsoAdapter.NETWORK_DELAY_MS));
  }

  private formatNameFromEmail(email: string): string {
    const localPart = email.split('@')[0] ?? 'estudiante.pucp';
    const tokens = localPart
      .replace(/[0-9]+/g, '')
      .split(/[._-]+/)
      .filter(Boolean);

    if (tokens.length === 0) {
      return 'Estudiante PUCP Verificado';
    }

    return tokens
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(' ');
  }

  private generateDeterministicPucpCode(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = (hash * 31 + email.charCodeAt(i)) % 100000;
    }
    const suffix = String(Math.abs(hash)).padStart(5, '0').slice(0, 5);
    return `202${suffix}`;
  }

  public async authenticateStudent(
    email: string,
    overrideProfile?: SsoStudentInputOverride
  ): Promise<SsoStudentProfile> {
    await this.simulateNetworkLatency();

    const normalizedEmail = (email ?? '').trim().toLowerCase();

    if (!MockSsoAdapter.PUCP_EMAIL_REGEX.test(normalizedEmail)) {
      return {
        email: normalizedEmail,
        fullName: '',
        codigoPucp: '',
        facultad: '',
        isValid: false,
        authenticatedAt: new Date().toISOString(),
        message:
          'Autenticación SSO PUCP denegada: Debe utilizar exclusivamente su correo institucional con dominio @pucp.edu.pe (RF-1).',
      };
    }

    const knownStudent = KNOWN_PUCP_STUDENTS[normalizedEmail];
    if (knownStudent) {
      return {
        email: normalizedEmail,
        fullName: knownStudent.fullName,
        codigoPucp: knownStudent.codigoPucp,
        facultad: knownStudent.facultad,
        isValid: true,
        authenticatedAt: new Date().toISOString(),
        message: 'Autenticación institucional SSO PUCP exitosa.',
      };
    }

    const derivedCode =
      overrideProfile?.codigoPucp && MockSsoAdapter.PUCP_CODE_REGEX.test(overrideProfile.codigoPucp)
        ? overrideProfile.codigoPucp
        : this.generateDeterministicPucpCode(normalizedEmail);

    const facultyIndex = normalizedEmail.length % PUCP_FACULTIES.length;
    const derivedFaculty = overrideProfile?.facultad?.trim() || PUCP_FACULTIES[facultyIndex];
    const derivedFullName =
      overrideProfile?.fullName?.trim() || this.formatNameFromEmail(normalizedEmail);

    return {
      email: normalizedEmail,
      fullName: derivedFullName,
      codigoPucp: derivedCode,
      facultad: derivedFaculty,
      isValid: true,
      authenticatedAt: new Date().toISOString(),
      message: 'Autenticación institucional SSO PUCP exitosa.',
    };
  }
}
