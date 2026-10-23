export interface ReniecCitizenProfile {
  dni: string;
  fullName: string;
  firstName: string;
  lastNames: string;
  isValid: boolean;
  verifiedAt: string;
  message?: string;
}

/**
 * Puerto de salida para validación de identidad con RENIEC (RF-2, RF-5).
 * Ningún controlador HTTP debe invocar adaptadores directamente.
 */
export interface IReniecPort {
  validateDni(dni: string, providedFullName?: string): Promise<ReniecCitizenProfile>;
}
