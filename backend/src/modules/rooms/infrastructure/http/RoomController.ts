import { Request, Response } from 'express';
import { BathroomType, RoomStatus, RoomType } from '@prisma/client';
import { RoomService } from '../../application/RoomService';
import { DomainValidationError } from '../../../auth/application/AuthService';

export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  private extractRequesterUserId(req: Request): string | undefined {
    const fromQuery =
      (req.query.studentId as string | undefined) ||
      (req.query.userId as string | undefined);
    if (fromQuery && fromQuery.trim() !== '') {
      return fromQuery.trim();
    }

    const fromHeader =
      (req.headers['x-student-id'] as string | undefined) ||
      (req.headers['x-user-id'] as string | undefined);
    if (fromHeader && fromHeader.trim() !== '') {
      return fromHeader.trim();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length).trim();
    }

    return undefined;
  }

  public listRooms = async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId = this.extractRequesterUserId(req);
      const minPrice =
        req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
      const maxPrice =
        req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
      const maxDistanceKm =
        req.query.maxDistanceKm !== undefined
          ? Number(req.query.maxDistanceKm)
          : undefined;

      let isFurnished: boolean | undefined = undefined;
      if (req.query.isFurnished === 'true') isFurnished = true;
      if (req.query.isFurnished === 'false') isFurnished = false;

      const rooms = await this.roomService.searchAvailableRooms({
        district: req.query.district as string | undefined,
        minPrice,
        maxPrice,
        bathroomType: (req.query.bathroomType as BathroomType | undefined) || undefined,
        isFurnished,
        maxDistanceKm,
        type: (req.query.type as RoomType | undefined) || undefined,
        search: req.query.search as string | undefined,
        sortBy: req.query.sortBy as
          | 'price_asc'
          | 'price_desc'
          | 'rating_desc'
          | 'date_desc'
          | 'distance_asc'
          | undefined,
        studentId,
      });

      res.status(200).json({
        status: 'success',
        count: rooms.length,
        rooms,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public getRoomById = async (req: Request, res: Response): Promise<void> => {
    try {
      const roomId = String(req.params.id);
      const requesterUserId = this.extractRequesterUserId(req);

      const room = await this.roomService.getRoomById(roomId, requesterUserId);

      res.status(200).json({
        status: 'success',
        room,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public getLandlordRooms = async (req: Request, res: Response): Promise<void> => {
    try {
      const landlordId = String(req.params.landlordId);
      const rooms = await this.roomService.getLandlordRooms(landlordId);

      res.status(200).json({
        status: 'success',
        count: rooms.length,
        rooms,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public createRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const room = await this.roomService.createRoom(req.body);
      res.status(201).json({
        status: 'success',
        message: 'Habitación publicada exitosamente (RF-7).',
        room,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public updateRoomStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const roomId = String(req.params.id);
      const { status, landlordId } = req.body as {
        status: RoomStatus;
        landlordId?: string;
      };

      if (!Object.values(RoomStatus).includes(status)) {
        res.status(400).json({
          status: 'error',
          code: 'INVALID_ROOM_STATUS',
          message: 'El estado debe ser DISPONIBLE, ALQUILADO o PAUSADO.',
        });
        return;
      }

      const updatedRoom = await this.roomService.updateRoomStatus(
        roomId,
        status,
        landlordId
      );

      res.status(200).json({
        status: 'success',
        message: `Estado de habitación actualizado a ${status}.`,
        room: updatedRoom,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public deleteRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const roomId = String(req.params.id);
      const landlordId =
        (req.body?.landlordId as string | undefined) ||
        (req.query.landlordId as string | undefined);

      await this.roomService.deleteRoom(roomId, landlordId);

      res.status(200).json({
        status: 'success',
        message: 'Habitación eliminada correctamente.',
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

    console.error('❌ [RoomController] Error inesperado:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno al procesar la operación de habitaciones.',
    });
  }
}
