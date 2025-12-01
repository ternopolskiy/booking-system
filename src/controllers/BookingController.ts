import { Request, Response } from 'express';
import { BookingService, IBookingService } from '../services/BookingService';
import { ValidationError, NotFoundError, ConflictError, DatabaseError } from '../models/types';

export interface IBookingController {
  reserve(req: Request, res: Response): Promise<void>;
}

export class BookingController implements IBookingController {
  constructor(private bookingService: IBookingService = new BookingService()) {}

  async reserve(req: Request, res: Response): Promise<void> {
    try {
      const { event_id, user_id } = req.body;

      if (!event_id || !user_id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'event_id and user_id are required'
          }
        });
        return;
      }

      const response = await this.bookingService.reserveSeat({
        event_id,
        user_id
      });

      if (response.success) {
        res.status(201).json(response);
      } else {
        const statusCode = this.getStatusCode(response.error?.code);
        res.status(statusCode).json(response);
      }
    } catch (error) {
      console.error('Controller error:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Internal server error'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred'
          }
        });
      }
    }
  }

  private getStatusCode(errorCode?: string): number {
    switch (errorCode) {
      case 'VALIDATION_ERROR':
        return 400;
      case 'NOT_FOUND':
        return 404;
      case 'CONFLICT':
        return 409;
      case 'DATABASE_ERROR':
        return 500;
      default:
        return 500;
    }
  }
}
