export enum ServiceStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
  UNKNOWN = 'UNKNOWN',
}

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure?: Date;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
