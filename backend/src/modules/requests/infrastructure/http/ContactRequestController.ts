import { Request, Response } from 'express';
import { ContactRequestService } from '../../application/ContactRequestService';
import { DomainValidationError } from '../../../auth/application/AuthService';

export class ContactRequestController {
  constructor(private readonly contactRequestService: ContactRequestService) {}

  public createRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId =
        (req.body.studentId as string | undefined) ||
        (req.headers['x-student-id'] as string | undefined) ||
        (req.headers['x-user-id'] as string | undefined) ||
        '';

      const { roomId, message } = req.body;

      const createdRequest = await this.contactRequestService.createRequest({
        studentId,
        roomId,
        message,
      });

      res.status(201).json({
        status: 'success',
        message:
          'Solicitud de contacto enviada al arrendador. El número de WhatsApp se desbloqueará cuando el arrendador acepte la solicitud (RF-15).',
        request: createdRequest,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public updateRequestStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const requestId = String(req.params.id);
      const { status, landlordId } = req.body as {
        status: 'ACEPTADA' | 'RECHAZADA';
        landlordId?: string;
      };

      const updatedRequest = await this.contactRequestService.updateRequestStatus({
        requestId,
        status,
        landlordId,
      });

      res.status(200).json({
        status: 'success',
        message:
          status === 'ACEPTADA'
            ? 'Solicitud aceptada. El estudiante ahora puede visualizar el número de WhatsApp.'
            : 'Solicitud de contacto rechazada.',
        request: updatedRequest,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public cancelRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const requestId = String(req.params.id);
      const studentId =
        (req.body?.studentId as string | undefined) ||
        (req.headers['x-student-id'] as string | undefined) ||
        (req.headers['x-user-id'] as string | undefined);

      const canceled = await this.contactRequestService.cancelRequest(
        requestId,
        studentId
      );

      res.status(200).json({
        status: 'success',
        message: 'Solicitud cancelada. El envío de nuevas solicitudes permanece pausado temporalmente.',
        request: canceled,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public listRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId = req.query.studentId as string | undefined;
      const landlordId = req.query.landlordId as string | undefined;
      const roomId = req.query.roomId as string | undefined;

      const requests = await this.contactRequestService.listRequests({
        studentId,
        landlordId,
        roomId,
      });

      res.status(200).json({
        status: 'success',
        count: requests.length,
        requests,
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

    console.error('❌ [ContactRequestController] Error inesperado:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno al procesar la solicitud de contacto.',
    });
  }
}
