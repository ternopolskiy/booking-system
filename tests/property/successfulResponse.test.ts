import * as fc from 'fast-check';
import { db } from '../../src/database/connection';
import { BookingController } from '../../src/controllers/BookingController';
import { Request, Response } from 'express';

describe('Property Tests: Successful Booking Response', () => {
  let bookingController: BookingController;

  beforeAll(async () => {
    await db.connect();
    bookingController = new BookingController();
  });

  afterAll(async () => {
    await db.shutdown();
  });

  beforeEach(async () => {
    await db.query('TRUNCATE TABLE bookings, events RESTART IDENTITY CASCADE');
  });

  test('Feature: event-booking-system, Property 2: Successful booking returns 201 with booking details', async () => {
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

          const mockReq = {
            body: {
              event_id: eventId,
              user_id: userId
            }
          } as Request;

          let statusCode: number = 0;
          let responseData: any = null;

          const mockRes = {
            status: function(code: number) {
              statusCode = code;
              return this;
            },
            json: function(data: any) {
              responseData = data;
            }
          } as Response;

          await bookingController.reserve(mockReq, mockRes);

          expect(statusCode).toBe(201);
          expect(responseData).toBeDefined();
          expect(responseData.success).toBe(true);
          expect(responseData.booking).toBeDefined();
          expect(responseData.booking.id).toBeGreaterThan(0);
          expect(responseData.booking.event_id).toBe(eventId);
          expect(responseData.booking.user_id).toBe(userId);
          expect(responseData.booking.created_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
