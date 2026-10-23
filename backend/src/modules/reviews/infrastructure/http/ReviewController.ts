import { Request, Response } from 'express';
import { ReviewService } from '../../application/ReviewService';
import { DomainValidationError } from '../../../auth/application/AuthService';

export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  public createReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId =
        (req.body.studentId as string | undefined) ||
        (req.headers['x-student-id'] as string | undefined) ||
        (req.headers['x-user-id'] as string | undefined) ||
        '';

      const { contractId, roomId, rating, comment } = req.body;

      const result = await this.reviewService.createReview({
        contractId,
        roomId,
        studentId,
        rating: Number(rating),
        comment,
      });

      res.status(201).json({
        status: 'success',
        message:
          'Calificación registrada exitosamente y promedio del arrendador recalculado (RF-23, RF-24).',
        review: result.review,
        landlordRating: result.landlordRating,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public listReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const reviews = await this.reviewService.listReviews({
        roomId: req.query.roomId as string | undefined,
        landlordId: req.query.landlordId as string | undefined,
        studentId: req.query.studentId as string | undefined,
      });

      res.status(200).json({
        status: 'success',
        count: reviews.length,
        reviews,
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

    console.error('❌ [ReviewController] Error inesperado:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno al procesar la calificación.',
    });
  }
}
