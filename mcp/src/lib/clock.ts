export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  private readonly date: Date;

  constructor(iso: string | Date) {
    this.date = typeof iso === "string" ? new Date(iso) : iso;
  }

  now(): Date {
    return new Date(this.date);
  }
}

export const systemClock = new SystemClock();
