import * as fc from 'fast-check';
import { db } from '../../src/database/connection';
import { BookingService } from '../../src/services/BookingService';

describe('Property Tests: Valid Booking Creation', () => {
  let bookingService: BookingService;

  beforeAll(async () => {
    await db.connect();
    bookingService = new BookingService();
  });

  afterAll(async () => {
    await db.shutdown();
  });

  beforeEach(async () => {
    await db.query('TRUNCATE TABLE bookings, events RESTART IDENTITY CASCADE');
  });

  test('Feature: event-booking-system, Property 1: Valid booking creates database record with all fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (totalSeats, userId) => {
          const eventResult = await db.query(
            'INSERT INTO events (name, total_seats) VALUES ($1, $2) RETURNING id',
            [`Event ${Date.now()}`, totalSeats]
          );
          const eventId = eventResult.rows[0].id;

          const response = await bookingService.reserveSeat({
            event_id: eventId,
            user_id: userId
          });

          expect(response.success).toBe(true);
          expect(response.booking).toBeDefined();
          expect(response.booking?.event_id).toBe(eventId);
          expect(response.booking?.user_id).toBe(userId);
          expect(response.booking?.created_at).toBeInstanceOf(Date);
          expect(response.booking?.id).toBeGreaterThan(0);

          const dbCheck = await db.query(
            'SELECT * FROM bookings WHERE event_id = $1 AND user_id = $2',
            [eventId, userId]
          );
          expect(dbCheck.rows.length).toBe(1);
          expect(dbCheck.rows[0].event_id).toBe(eventId);
          expect(dbCheck.rows[0].user_id).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
