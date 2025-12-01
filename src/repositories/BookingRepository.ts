import { PoolClient } from 'pg';
import { Booking } from '../models/Booking';
import { DatabaseError } from '../models/types';

export interface IBookingRepository {
  create(eventId: number, userId: string, client?: PoolClient): Promise<Booking>;
  existsByEventAndUser(eventId: number, userId: string, client?: PoolClient): Promise<boolean>;
  countByEvent(eventId: number, client?: PoolClient): Promise<number>;
}

export class BookingRepository implements IBookingRepository {
  async create(eventId: number, userId: string, client?: PoolClient): Promise<Booking> {
    const query = `
      INSERT INTO bookings (event_id, user_id)
      VALUES ($1, $2)
      RETURNING id, event_id, user_id, created_at
    `;
    
    try {
      const result = client
        ? await client.query(query, [eventId, userId])
        : await (await import('../database/connection')).db.query(query, [eventId, userId]);
      
      return Booking.fromRow(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to create booking', error);
    }
  }

  async existsByEventAndUser(eventId: number, userId: string, client?: PoolClient): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM bookings 
        WHERE event_id = $1 AND user_id = $2
      ) as exists
    `;
    
    try {
      const result = client
        ? await client.query(query, [eventId, userId])
        : await (await import('../database/connection')).db.query(query, [eventId, userId]);
      
      return result.rows[0].exists;
    } catch (error) {
      throw new DatabaseError('Failed to check booking existence', error);
    }
  }

  async countByEvent(eventId: number, client?: PoolClient): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1';
    
    try {
      const result = client
        ? await client.query(query, [eventId])
        : await (await import('../database/connection')).db.query(query, [eventId]);
      
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw new DatabaseError('Failed to count bookings', error);
    }
  }
}
