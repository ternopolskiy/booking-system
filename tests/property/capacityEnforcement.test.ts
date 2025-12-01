import * as fc from 'fast-check';
import { db } from '../../src/database/connection';
import { BookingService } from '../../src/services/BookingService';

describe('Property Tests: Capacity Enforcement', () => {
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

  test('Feature: event-booking-system, Property 7: Capacity enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (totalSeats) => {
          const eventResult = await db.query(
            'INSERT INTO events (name, total_seats) VALUES ($1, $2) RETURNING id',
            [`Event ${Date.now()}`, totalSeats]
          );
          const eventId = eventResult.rows[0].id;

          for (let i = 0; i < totalSeats; i++) {
            const response = await bookingService.reserveSeat({
              event_id: eventId,
              user_id: `user_${i}_${Date.now()}`
            });
            expect(response.success).toBe(true);
          }

          const overBookResponse = await bookingService.reserveSeat({
            event_id: eventId,
            user_id: `overflow_user_${Date.now()}`
          });

          expect(overBookResponse.success).toBe(false);
          expect(overBookResponse.error).toBeDefined();
          expect(overBookResponse.error?.code).toBe('CONFLICT');
          expect(overBookResponse.error?.message).toContain('No available seats');

          const dbCheck = await db.query(
            'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1',
            [eventId]
          );
          expect(parseInt(dbCheck.rows[0].count)).toBe(totalSeats);
        }
      ),
      { numRuns: 100 }
    );
  });
});
