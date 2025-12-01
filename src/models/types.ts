export interface Event {
  id: number;
  name: string;
  total_seats: number;
}

export interface Booking {
  id: number;
  event_id: number;
  user_id: string;
  created_at: Date;
}

export interface ReservationRequest {
  event_id: number;
  user_id: string;
}

export interface ReservationResponse {
  success: boolean;
  booking?: Booking;
  error?: ErrorDetails;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
}

export class ValidationError extends Error {
  code: string = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  code: string = 'NOT_FOUND';
  
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  code: string = 'CONFLICT';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends Error {
  code: string = 'DATABASE_ERROR';
  
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}
