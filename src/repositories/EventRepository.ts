import { PoolClient } from 'pg';
import { Event } from '../models/Event';
import { DatabaseError } from '../models/types';

export interface IEventRepository {
  findById(eventId: number, client?: PoolClient): Promise<Event | null>;
  getAvailableSeats(eventId: number, client?: PoolClient): Promise<number>;
}

export class EventRepository implements IEventRepository {
  async findById(eventId: number, client?: PoolClient): Promise<Event | null> {
    const query = 'SELECT id, name, total_seats FROM events WHERE id = $1';
    
    try {
      const result = client 
        ? await client.query(query, [eventId])
        : await (await import('../database/connection')).db.query(query, [eventId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return Event.fromRow(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to find event', error);
    }
  }

  async getAvailableSeats(eventId: number, client?: PoolClient): Promise<number> {
    const query = `
      SELECT 
        e.total_seats - COUNT(b.id) as available_seats
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      WHERE e.id = $1
      GROUP BY e.id, e.total_seats
    `;
    
    try {
      const result = client
        ? await client.query(query, [eventId])
        : await (await import('../database/connection')).db.query(query, [eventId]);
      
      if (result.rows.length === 0) {
        return 0;
      }
      
      return parseInt(result.rows[0].available_seats, 10);
    } catch (error) {
      throw new DatabaseError('Failed to get available seats', error);
    }
  }
}
