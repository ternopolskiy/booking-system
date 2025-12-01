import * as fc from 'fast-check';
import { db } from '../../src/database/connection';
import { BookingController } from '../../src/controllers/BookingController';
import { Request, Response } from 'express';

describe('Property Tests: Missing Field Validation', () => {
  let bookingController: BookingController;

  beforeAll(async () => {
    await db.connect();
    bookingController = new BookingController();
  });

  afterAll(async () => {
    await db.shutdown();
  });

  test('Feature: event-booking-system, Property 4: Missing field validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant({ event_id: undefined, user_id: 'user123' }),
          fc.constant({ event_id: 1, user_id: undefined }),
          fc.constant({ event_id: undefined, user_id: undefined }),
          fc.constant({})
        ),
        async (invalidBody) => {
          const mockReq = {
            body: invalidBody
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

          expect(statusCode).toBe(400);
          expect(responseData).toBeDefined();
          expect(responseData.success).toBe(false);
          expect(responseData.error).toBeDefined();
          expect(responseData.error.code).toBe('VALIDATION_ERROR');
          expect(responseData.error.message).toContain('required');
        }
      ),
      { numRuns: 100 }
    );
  });
});
