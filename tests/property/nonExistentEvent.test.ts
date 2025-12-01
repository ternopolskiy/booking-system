import * as fc from 'fast-check';
import { db } from '../../src/database/connection';
import { BookingService } from '../../src/services/BookingService';

describe('Property Tests: Non-existent Event Rejection', () => {
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

  test('Feature: event-booking-system, Property 3: Non-existent event rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 999999, max: 9999999 }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (nonExistentEventId, userId) => {
          const response = await bookingService.reserveSeat({
            event_id: nonExistentEventId,
            user_id: userId
          });

          expect(response.success).toBe(false);
          expect(response.error).toBeDefined();
          expect(response.error?.code).toBe('NOT_FOUND');
          expect(response.error?.message).toContain('does not exist');

          const dbCheck = await db.query(
            'SELECT * FROM bookings WHERE event_id = $1',
            [nonExistentEventId]
          );
          expect(dbCheck.rows.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
