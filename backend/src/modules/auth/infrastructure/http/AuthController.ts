import { Request, Response } from 'express';
import { AuthService, DomainValidationError } from '../../application/AuthService';

/**
 * Controlador HTTP de Autenticación.
 * Cumple estrictamente la Arquitectura Hexagonal: no importa ni invoca adaptadores concretos,
 * delegando en AuthService que opera únicamente sobre los puertos IReniecPort, ISunarpPort e ISsoPort.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public registerLandlord = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, fullName, dni, partidaRegistral, whatsapp } = req.body;

      const result = await this.authService.registerLandlord({
        email,
        password,
        fullName,
        dni,
        partidaRegistral,
        whatsapp,
      });

      res.status(201).json({
        status: 'success',
        message: 'Arrendador verificado mediante RENIEC y SUNARP y registrado exitosamente.',
        user: result.user,
        validations: result.validations,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public ssoStudent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, fullName, codigoPucp, facultad } = req.body;

      const result = await this.authService.authenticateOrRegisterStudentSso({
        email,
        fullName,
        codigoPucp,
        facultad,
      });

      res.status(result.isNewUser ? 201 : 200).json({
        status: 'success',
        message: result.isNewUser
          ? 'Estudiante PUCP autenticado vía SSO y registrado exitosamente.'
          : 'Estudiante PUCP autenticado exitosamente vía SSO.',
        isNewUser: result.isNewUser,
        user: result.user,
        ssoProfile: result.ssoProfile,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public loginLandlord = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.loginLandlord({ email, password });

      res.status(200).json({
        status: 'success',
        message: 'Inicio de sesión de arrendador exitoso.',
        user: result.user,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public listUsers = async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.authService.listDemoUsers();
      res.status(200).json({
        status: 'success',
        users,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: unknown, res: Response): void {
    if (error instanceof DomainValidationError) {
      res.status(error.statusCode).json({
        status: 'error',
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return;
    }

    console.error('❌ [AuthController] Error inesperado:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno al procesar la solicitud de autenticación.',
    });
  }
}
