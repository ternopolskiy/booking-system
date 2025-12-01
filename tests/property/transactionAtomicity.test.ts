import * as fc from 'fast-check';
import { db } from '../../src/database/connection';
import { BookingService } from '../../src/services/BookingService';

describe('Property Tests: Transaction Atomicity', () => {
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

  test('Feature: event-booking-system, Property 8: Transaction atomicity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 999999, max: 9999999 }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (nonExistentEventId, userId) => {
          const initialBookingCount = await db.query('SELECT COUNT(*) as count FROM bookings');
          const initialCount = parseInt(initialBookingCount.rows[0].count);

          const response = await bookingService.reserveSeat({
            event_id: nonExistentEventId,
            user_id: userId
          });

          expect(response.success).toBe(false);

          const finalBookingCount = await db.query('SELECT COUNT(*) as count FROM bookings');
          const finalCount = parseInt(finalBookingCount.rows[0].count);

          expect(finalCount).toBe(initialCount);

          const specificCheck = await db.query(
            'SELECT * FROM bookings WHERE event_id = $1 AND user_id = $2',
            [nonExistentEventId, userId]
          );
          expect(specificCheck.rows.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
