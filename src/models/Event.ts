import { Event as EventInterface } from './types';

export class Event implements EventInterface {
  constructor(
    public id: number,
    public name: string,
    public total_seats: number
  ) {}

  static fromRow(row: any): Event {
    return new Event(
      row.id,
      row.name,
      row.total_seats
    );
  }
}
