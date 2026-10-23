import crypto from 'crypto';
import { PrismaClient, Role, User } from '@prisma/client';
import {
  IReniecPort,
  ISunarpPort,
  ISsoPort,
  INotificationPort,
  ReniecCitizenProfile,
  SunarpPropertyRecord,
  SsoStudentProfile,
} from '../../../shared/core/ports';

export interface RegisterLandlordCommand {
  email: string;
  password?: string;
  fullName?: string;
  dni: string;
  partidaRegistral: string;
  whatsapp?: string;
}

export interface SsoStudentCommand {
  email: string;
  fullName?: string;
  codigoPucp?: string;
  facultad?: string;
}

export interface LoginLandlordCommand {
  email: string;
  password: string;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export class DomainValidationError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

export class AuthService {
  // RF-31: Bloqueo progresivo tras 5 intentos fallidos de login (5, 15 y 30 min)
  private static readonly LOCKOUT_DURATIONS_MINUTES = [5, 15, 30];

  constructor(
    private readonly prisma: PrismaClient,
    private readonly reniecPort: IReniecPort,
    private readonly sunarpPort: ISunarpPort,
    private readonly ssoPort: ISsoPort,
    private readonly notificationPort?: INotificationPort
  ) {}

  private sanitizeUser(user: User): PublicUser {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }

  private hashPassword(rawPassword: string): string {
    return crypto.createHash('sha256').update(`findroom_salt_${rawPassword}`).digest('hex');
  }

  /**
   * Registro de arrendador con validación obligatoria en RENIEC y SUNARP (RF-1, RF-2, RF-5).
   */
  public async registerLandlord(command: RegisterLandlordCommand): Promise<{
    user: PublicUser;
    validations: {
      reniec: ReniecCitizenProfile;
      sunarp: SunarpPropertyRecord;
    };
  }> {
    const normalizedEmail = (command.email ?? '').trim().toLowerCase();
    const normalizedDni = (command.dni ?? '').trim();
    const normalizedPartida = (command.partidaRegistral ?? '').trim().toUpperCase();
    const normalizedWhatsapp = (command.whatsapp ?? '+51 980 000 000').trim();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new DomainValidationError(
        400,
        'INVALID_EMAIL',
        'Debe proporcionar un correo electrónico válido para el registro del arrendador.'
      );
    }

    if (normalizedEmail.endsWith('@pucp.edu.pe')) {
      throw new DomainValidationError(
        400,
        'ROLE_EMAIL_MISMATCH',
        'Los correos institucionales @pucp.edu.pe están reservados para autenticación de estudiantes vía SSO PUCP (RF-1).'
      );
    }

    // 1. Validar DNI de 8 dígitos mediante el puerto IReniecPort (700 ms latencia simulada)
    const reniecResult = await this.reniecPort.validateDni(normalizedDni, command.fullName);
    if (!reniecResult.isValid) {
      throw new DomainValidationError(
        400,
        'RENIEC_VALIDATION_FAILED',
        reniecResult.message || 'Validación de DNI rechazada por RENIEC (RF-2).',
        reniecResult
      );
    }

    // 2. Validar Partida Registral mediante el puerto ISunarpPort (700 ms latencia simulada)
    const sunarpResult = await this.sunarpPort.validatePartidaRegistral(
      normalizedPartida,
      normalizedDni,
      reniecResult.fullName
    );
    if (!sunarpResult.isValid) {
      throw new DomainValidationError(
        400,
        'SUNARP_VALIDATION_FAILED',
        sunarpResult.message || 'Validación de Partida Registral rechazada por SUNARP (RF-2).',
        sunarpResult
      );
    }

    // 3. Verificar unicidad e inmutabilidad (RF-5: DNI y Partida Registral no pueden alterarse ni duplicarse)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { dni: reniecResult.dni },
          { partidaRegistral: sunarpResult.partidaRegistral },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.dni === reniecResult.dni) {
        throw new DomainValidationError(
          409,
          'DNI_ALREADY_REGISTERED',
          'El DNI ingresado ya se encuentra registrado. Por seguridad (RF-5), un arrendador no puede alterar ni reutilizar su DNI.'
        );
      }
      if (existingUser.partidaRegistral === sunarpResult.partidaRegistral) {
        throw new DomainValidationError(
          409,
          'PARTIDA_ALREADY_REGISTERED',
          'La Partida Registral ingresada ya se encuentra registrada en el sistema (RF-5).'
        );
      }
      throw new DomainValidationError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'El correo electrónico ingresado ya pertenece a una cuenta registrada.'
      );
    }

    const rawPassword = command.password?.trim() || 'FindRoom2026!';
    const createdLandlord = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: this.hashPassword(rawPassword),
        fullName: reniecResult.fullName,
        role: Role.ARRENDADOR,
        dni: reniecResult.dni,
        partidaRegistral: sunarpResult.partidaRegistral,
        whatsapp: normalizedWhatsapp,
        isReniecVerified: true,
        isSunarpVerified: true,
        isVerified: true,
      },
    });

    if (this.notificationPort) {
      await this.notificationPort.sendNotification({
        recipientEmail: createdLandlord.email,
        subject: 'Bienvenido a FindRoom - Identidad RENIEC y SUNARP Verificada',
        message: `Estimado(a) ${createdLandlord.fullName}, su DNI (${createdLandlord.dni}) y Partida Registral (${createdLandlord.partidaRegistral}) fueron validados satisfactoriamente.`,
        eventType: 'LANDLORD_REGISTERED',
      });
    }

    return {
      user: this.sanitizeUser(createdLandlord),
      validations: {
        reniec: reniecResult,
        sunarp: sunarpResult,
      },
    };
  }

  /**
   * Autenticación y registro de estudiantes mediante SSO PUCP (RF-1, RF-5).
   */
  public async authenticateOrRegisterStudentSso(command: SsoStudentCommand): Promise<{
    user: PublicUser;
    ssoProfile: SsoStudentProfile;
    isNewUser: boolean;
  }> {
    // 1. Validar correo institucional @pucp.edu.pe mediante el puerto ISsoPort (700 ms latencia simulada)
    const ssoProfile = await this.ssoPort.authenticateStudent(command.email, {
      fullName: command.fullName,
      codigoPucp: command.codigoPucp,
      facultad: command.facultad,
    });

    if (!ssoProfile.isValid) {
      throw new DomainValidationError(
        400,
        'SSO_PUCP_VALIDATION_FAILED',
        ssoProfile.message ||
          'Solo se permite el acceso con correo institucional @pucp.edu.pe (RF-1).',
        ssoProfile
      );
    }

    // 2. Buscar si el estudiante ya existe en PostgreSQL
    const existingUser = await this.prisma.user.findUnique({
      where: { email: ssoProfile.email },
    });

    if (existingUser) {
      if (existingUser.role !== Role.ESTUDIANTE) {
        throw new DomainValidationError(
          409,
          'INVALID_ACCOUNT_ROLE',
          'El correo ingresado no corresponde a una cuenta de estudiante.'
        );
      }

      // RF-5: Los estudiantes no pueden alterar su correo institucional una vez registrados
      return {
        user: this.sanitizeUser(existingUser),
        ssoProfile,
        isNewUser: false,
      };
    }

    // Verificar que el código PUCP no colisione con otro estudiante existente
    let finalCodigoPucp = ssoProfile.codigoPucp;
    const codeCollision = await this.prisma.user.findUnique({
      where: { codigoPucp: finalCodigoPucp },
    });
    if (codeCollision) {
      finalCodigoPucp = `202${Math.floor(10000 + Math.random() * 89999)}`;
    }

    const createdStudent = await this.prisma.user.create({
      data: {
        email: ssoProfile.email,
        fullName: ssoProfile.fullName,
        role: Role.ESTUDIANTE,
        codigoPucp: finalCodigoPucp,
        facultad: ssoProfile.facultad,
        isVerified: true,
      },
    });

    if (this.notificationPort) {
      await this.notificationPort.sendNotification({
        recipientEmail: createdStudent.email,
        subject: 'Acceso Institucional SSO PUCP - FindRoom',
        message: `Hola ${createdStudent.fullName} (Código PUCP: ${createdStudent.codigoPucp}), tu cuenta estudiantil ha sido vinculada en FindRoom.`,
        eventType: 'STUDENT_SSO_REGISTERED',
      });
    }

    return {
      user: this.sanitizeUser(createdStudent),
      ssoProfile: {
        ...ssoProfile,
        codigoPucp: finalCodigoPucp,
      },
      isNewUser: true,
    };
  }

  /**
   * Login para arrendadores/administradores con bloqueo progresivo (RF-31: 5 intentos -> 5, 15 y 30 min).
   */
  public async loginLandlord(command: LoginLandlordCommand): Promise<{ user: PublicUser }> {
    const normalizedEmail = (command.email ?? '').trim().toLowerCase();
    const rawPassword = command.password ?? '';

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.role === Role.ESTUDIANTE) {
      throw new DomainValidationError(
        401,
        'INVALID_CREDENTIALS',
        'Credenciales inválidas o cuenta no registrada como arrendador.'
      );
    }

    // RF-31: Verificar si la cuenta está temporalmente bloqueada
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
      );
      throw new DomainValidationError(
        423,
        'ACCOUNT_LOCKED',
        `Cuenta bloqueada temporalmente por seguridad tras 5 intentos fallidos (RF-31). Intente nuevamente en ${remainingMinutes} minuto(s).`,
        {
          lockedUntil: user.lockedUntil.toISOString(),
          lockoutLevel: user.lockoutLevel,
          remainingMinutes,
        }
      );
    }

    const hashedInput = this.hashPassword(rawPassword);
    // Permitir también contraseña de demostración para los arrendadores del seed
    const isSeedPasswordMatch =
      user.passwordHash?.startsWith('$2b$10$MockHashedPassword') &&
      rawPassword.length >= 4;
    const isPasswordValid = user.passwordHash === hashedInput || isSeedPasswordMatch;

    if (!isPasswordValid) {
      const nextAttempts = user.failedLoginAttempts + 1;

      if (nextAttempts >= 5) {
        const nextLevel = Math.min(
          user.lockoutLevel + 1,
          AuthService.LOCKOUT_DURATIONS_MINUTES.length
        );
        const lockMinutes = AuthService.LOCKOUT_DURATIONS_MINUTES[nextLevel - 1];
        const lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockoutLevel: nextLevel,
            lockedUntil,
          },
        });

        throw new DomainValidationError(
          423,
          'ACCOUNT_LOCKED',
          `Se alcanzaron 5 intentos fallidos de inicio de sesión. Su cuenta ha sido bloqueada por ${lockMinutes} minutos (RF-31).`,
          {
            lockedUntil: lockedUntil.toISOString(),
            lockoutLevel: nextLevel,
            lockMinutes,
          }
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextAttempts,
        },
      });

      throw new DomainValidationError(
        401,
        'INVALID_CREDENTIALS',
        `Contraseña incorrecta. Intento ${nextAttempts} de 5 antes del bloqueo temporal (RF-31).`,
        {
          failedLoginAttempts: nextAttempts,
          remainingAttempts: 5 - nextAttempts,
        }
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return {
      user: this.sanitizeUser(updatedUser),
    };
  }

  public async listDemoUsers(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
    return users.map((u) => this.sanitizeUser(u));
  }
}
