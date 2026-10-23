export interface SsoStudentProfile {
  email: string;
  fullName: string;
  codigoPucp: string;
  facultad: string;
  isValid: boolean;
  authenticatedAt: string;
  message?: string;
}

export interface SsoStudentInputOverride {
  fullName?: string;
  codigoPucp?: string;
  facultad?: string;
}

/**
 * Puerto de salida para autenticación institucional SSO PUCP (RF-1, RF-5).
 * Ningún controlador HTTP debe invocar adaptadores directamente.
 */
export interface ISsoPort {
  authenticateStudent(
    email: string,
    overrideProfile?: SsoStudentInputOverride
  ): Promise<SsoStudentProfile>;
}
