import * as fc from 'fast-check';
import { db } from '../../src/database/connection';
import { BookingService } from '../../src/services/BookingService';

describe('Integration Tests: Concurrent Booking', () => {
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

  test('Feature: event-booking-system, Property 9: Concurrent last seat booking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (concurrentUsers) => {
          const eventResult = await db.query(
            'INSERT INTO events (name, total_seats) VALUES ($1, $2) RETURNING id',
            [`Event ${Date.now()}`, 1]
          );
          const eventId = eventResult.rows[0].id;

          const bookingPromises: Promise<any>[] = [];
          for (let i = 0; i < concurrentUsers; i++) {
            bookingPromises.push(
              bookingService.reserveSeat({
                event_id: eventId,
                user_id: `user_${i}_${Date.now()}`
              })
            );
          }

          const results = await Promise.all(bookingPromises);

          const successfulBookings = results.filter(r => r.success);
          const failedBookings = results.filter(r => !r.success);

          expect(successfulBookings.length).toBe(1);
          expect(failedBookings.length).toBe(concurrentUsers - 1);

          failedBookings.forEach(result => {
            expect(result.error?.code).toBe('CONFLICT');
          });

          const dbCheck = await db.query(
            'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1',
            [eventId]
          );
          expect(parseInt(dbCheck.rows[0].count)).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });
});
