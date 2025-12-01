import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/database/connection';

describe('Integration Tests: Full Booking Flow', () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterAll(async () => {
    await db.shutdown();
  });

  beforeEach(async () => {
    await db.query('TRUNCATE TABLE bookings, events RESTART IDENTITY CASCADE');
  });

  test('should complete full booking flow from HTTP to database', async () => {
    const eventResult = await db.query(
      'INSERT INTO events (name, total_seats) VALUES ($1, $2) RETURNING id',
      ['Test Event', 10]
    );
    const eventId = eventResult.rows[0].id;

    const response = await request(app)
      .post('/api/bookings/reserve')
      .send({
        event_id: eventId,
        user_id: 'test_user_123'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.booking).toBeDefined();
    expect(response.body.booking.event_id).toBe(eventId);
    expect(response.body.booking.user_id).toBe('test_user_123');

    const dbCheck = await db.query(
      'SELECT * FROM bookings WHERE event_id = $1 AND user_id = $2',
      [eventId, 'test_user_123']
    );
    expect(dbCheck.rows.length).toBe(1);
  });

  test('should handle validation errors correctly', async () => {
    const response = await request(app)
      .post('/api/bookings/reserve')
      .send({
        event_id: 1
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should handle non-existent event correctly', async () => {
    const response = await request(app)
      .post('/api/bookings/reserve')
      .send({
        event_id: 999999,
        user_id: 'test_user'
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  test('should handle duplicate booking correctly', async () => {
    const eventResult = await db.query(
      'INSERT INTO events (name, total_seats) VALUES ($1, $2) RETURNING id',
      ['Test Event', 10]
    );
    const eventId = eventResult.rows[0].id;

    await request(app)
      .post('/api/bookings/reserve')
      .send({
        event_id: eventId,
        user_id: 'test_user'
      });

    const response = await request(app)
      .post('/api/bookings/reserve')
      .send({
        event_id: eventId,
        user_id: 'test_user'
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  test('should handle capacity exceeded correctly', async () => {
    const eventResult = await db.query(
      'INSERT INTO events (name, total_seats) VALUES ($1, $2) RETURNING id',
      ['Test Event', 1]
    );
    const eventId = eventResult.rows[0].id;

    await request(app)
      .post('/api/bookings/reserve')
      .send({
        event_id: eventId,
        user_id: 'user1'
      });

    const response = await request(app)
      .post('/api/bookings/reserve')
      .send({
        event_id: eventId,
        user_id: 'user2'
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('CONFLICT');
    expect(response.body.error.message).toContain('No available seats');
  });
});
