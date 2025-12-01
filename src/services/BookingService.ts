import { PoolClient } from 'pg';
import { db } from '../database/connection';
import { EventRepository, IEventRepository } from '../repositories/EventRepository';
import { BookingRepository, IBookingRepository } from '../repositories/BookingRepository';
import {
  ReservationRequest,
  ReservationResponse,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError
} from '../models/types';

export interface IBookingService {
  reserveSeat(request: ReservationRequest): Promise<ReservationResponse>;
}

export class BookingService implements IBookingService {
  constructor(
    private eventRepository: IEventRepository = new EventRepository(),
    private bookingRepository: IBookingRepository = new BookingRepository()
  ) {}

  async reserveSeat(request: ReservationRequest): Promise<ReservationResponse> {
    this.validateRequest(request);

    let client: PoolClient | null = null;

    try {
      client = await db.getClient();
      await client.query('BEGIN');

      const event = await this.eventRepository.findById(request.event_id, client);
      if (!event) {
        throw new NotFoundError(`Event with id ${request.event_id} does not exist`);
      }

      await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [request.event_id]);

      const alreadyBooked = await this.bookingRepository.existsByEventAndUser(
        request.event_id,
        request.user_id,
        client
      );

      if (alreadyBooked) {
        throw new ConflictError('User has already booked this event');
      }

      const bookingCount = await this.bookingRepository.countByEvent(request.event_id, client);
      const availableSeats = event.total_seats - bookingCount;

      if (availableSeats <= 0) {
        throw new ConflictError('No available seats for this event');
      }

      const booking = await this.bookingRepository.create(
        request.event_id,
        request.user_id,
        client
      );

      await client.query('COMMIT');

      return {
        success: true,
        booking
      };
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }

      if (error instanceof ValidationError || 
          error instanceof NotFoundError || 
          error instanceof ConflictError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: (error as any).details
          }
        };
      }

      throw new DatabaseError('Transaction failed', error);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private validateRequest(request: ReservationRequest): void {
    if (!request.event_id) {
      throw new ValidationError('event_id is required');
    }

    if (!request.user_id || typeof request.user_id !== 'string' || request.user_id.trim() === '') {
      throw new ValidationError('user_id is required');
    }

    if (typeof request.event_id !== 'number') {
      throw new ValidationError('event_id must be a number');
    }
  }
}
