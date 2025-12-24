import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('records http requests and exposes metrics', async () => {
    const service = new MetricsService();
    service.recordHttpRequest('get', '/health', 200);
    const output = await service.getMetrics();
    expect(output).toContain('http_requests_total');
    expect(output).toContain('service_up 1');
  });
});
