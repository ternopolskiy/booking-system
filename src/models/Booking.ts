import { Booking as BookingInterface } from './types';

export class Booking implements BookingInterface {
  constructor(
    public id: number,
    public event_id: number,
    public user_id: string,
    public created_at: Date
  ) {}

  static fromRow(row: any): Booking {
    return new Booking(
      row.id,
      row.event_id,
      row.user_id,
      row.created_at
    );
  }
}
