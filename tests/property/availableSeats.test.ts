import * as fc from 'fast-check';
import { db } from '../../src/database/connection';
import { EventRepository } from '../../src/repositories/EventRepository';
import { BookingRepository } from '../../src/repositories/BookingRepository';

describe('Property Tests: Available Seats Calculation', () => {
  let eventRepo: EventRepository;
  let bookingRepo: BookingRepository;

  beforeAll(async () => {
    await db.connect();
    eventRepo = new EventRepository();
    bookingRepo = new BookingRepository();
  });

  afterAll(async () => {
    await db.shutdown();
  });

  beforeEach(async () => {
    await db.query('TRUNCATE TABLE bookings, events RESTART IDENTITY CASCADE');
  });

  test('Feature: event-booking-system, Property 6: Available seats calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        async (totalSeats, bookingsCount) => {
          await db.query('TRUNCATE TABLE bookings, events RESTART IDENTITY CASCADE');
          
          const actualBookings = Math.min(bookingsCount, totalSeats);
          
          const eventResult = await db.query(
            'INSERT INTO events (name, total_seats) VALUES ($1, $2) RETURNING id',
            [`Test Event ${Date.now()}`, totalSeats]
          );
          const eventId = eventResult.rows[0].id;

          for (let i = 0; i < actualBookings; i++) {
            await db.query(
              'INSERT INTO bookings (event_id, user_id) VALUES ($1, $2)',
              [eventId, `user_${i}_${Date.now()}`]
            );
          }

          const availableSeats = await eventRepo.getAvailableSeats(eventId);
          const bookingCount = await bookingRepo.countByEvent(eventId);
          
          expect(availableSeats).toBe(totalSeats - bookingCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
