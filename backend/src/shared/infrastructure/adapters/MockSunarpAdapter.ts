import { ISunarpPort, SunarpPropertyRecord } from '../../core/ports/ISunarpPort';

export class MockSunarpAdapter implements ISunarpPort {
  private static readonly NETWORK_DELAY_MS = 700;
  // Formato SUNARP según especificación: inicia con "PR-" seguido de 6-10 dígitos, o "11" seguido de 6-8 dígitos
  private static readonly PARTIDA_REGEX = /^(PR-\d{6,10}|11\d{6,8})$/i;
  private static readonly DNI_REGEX = /^\d{8}$/;

  private simulateNetworkLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, MockSunarpAdapter.NETWORK_DELAY_MS));
  }

  public async validatePartidaRegistral(
    partidaRegistral: string,
    ownerDni: string,
    ownerName?: string
  ): Promise<SunarpPropertyRecord> {
    await this.simulateNetworkLatency();

    const normalizedPartida = (partidaRegistral ?? '').trim().toUpperCase();
    const normalizedDni = (ownerDni ?? '').trim();

    if (!MockSunarpAdapter.DNI_REGEX.test(normalizedDni)) {
      return {
        partidaRegistral: normalizedPartida,
        ownerDni: normalizedDni,
        ownerName,
        registryZone: 'Zona Registral N° IX - Sede Lima',
        propertyStatus: 'NO_ENCONTRADA',
        isValid: false,
        verifiedAt: new Date().toISOString(),
        message:
          'Validación SUNARP rechazada: El DNI del titular proporcionado no tiene un formato válido de 8 dígitos.',
      };
    }

    if (!MockSunarpAdapter.PARTIDA_REGEX.test(normalizedPartida)) {
      return {
        partidaRegistral: normalizedPartida,
        ownerDni: normalizedDni,
        ownerName,
        registryZone: 'Zona Registral N° IX - Sede Lima',
        propertyStatus: 'NO_ENCONTRADA',
        isValid: false,
        verifiedAt: new Date().toISOString(),
        message:
          'Validación SUNARP rechazada: El número de Partida Registral debe iniciar con "PR-" o "11" seguido de al menos 6 dígitos (ej. PR-11048291 o 11294850).',
      };
    }

    return {
      partidaRegistral: normalizedPartida,
      ownerDni: normalizedDni,
      ownerName: ownerName?.trim() || 'Titular Registral Verificado',
      registryZone: 'Zona Registral N° IX - Sede Lima',
      propertyStatus: 'ACTIVA',
      isValid: true,
      verifiedAt: new Date().toISOString(),
      message:
        'Titularidad del inmueble validada satisfactoriamente en el Registro de Predios SUNARP.',
    };
  }
}
