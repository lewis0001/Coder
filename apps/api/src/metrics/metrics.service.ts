import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequests: Counter<string>;
  private readonly upGauge: Gauge<string>;

  constructor() {
    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      registers: [this.registry],
      labelNames: ['method', 'path', 'status'],
    });

    this.upGauge = new Gauge({
      name: 'service_up',
      help: 'Service availability gauge (1 = up)',
      registers: [this.registry],
    });
    this.upGauge.set(1);
  }

  recordHttpRequest(method: string, path: string, status: number) {
    this.httpRequests.inc({ method: method.toUpperCase(), path, status: status.toString() });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
