export interface SunarpPropertyRecord {
  partidaRegistral: string;
  ownerDni: string;
  ownerName?: string;
  registryZone: string;
  propertyStatus: 'ACTIVA' | 'OBSERVADA' | 'NO_ENCONTRADA';
  isValid: boolean;
  verifiedAt: string;
  message?: string;
}

/**
 * Puerto de salida para validación de titularidad de inmueble en SUNARP (RF-2, RF-5).
 * Ningún controlador HTTP debe invocar adaptadores directamente.
 */
export interface ISunarpPort {
  validatePartidaRegistral(
    partidaRegistral: string,
    ownerDni: string,
    ownerName?: string
  ): Promise<SunarpPropertyRecord>;
}
