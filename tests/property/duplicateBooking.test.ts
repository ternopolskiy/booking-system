import * as fc from 'fast-check';
import { db } from '../../src/database/connection';
import { BookingService } from '../../src/services/BookingService';

describe('Property Tests: Duplicate Booking Prevention', () => {
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

  test('Feature: event-booking-system, Property 5: Duplicate booking prevention', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (totalSeats, userId) => {
          const eventResult = await db.query(
            'INSERT INTO events (name, total_seats) VALUES ($1, $2) RETURNING id',
            [`Event ${Date.now()}`, totalSeats]
          );
          const eventId = eventResult.rows[0].id;

          const firstResponse = await bookingService.reserveSeat({
            event_id: eventId,
            user_id: userId
          });

          expect(firstResponse.success).toBe(true);

          const secondResponse = await bookingService.reserveSeat({
            event_id: eventId,
            user_id: userId
          });

          expect(secondResponse.success).toBe(false);
          expect(secondResponse.error).toBeDefined();
          expect(secondResponse.error?.code).toBe('CONFLICT');
          expect(secondResponse.error?.message).toContain('already booked');

          const dbCheck = await db.query(
            'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1 AND user_id = $2',
            [eventId, userId]
          );
          expect(parseInt(dbCheck.rows[0].count)).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
