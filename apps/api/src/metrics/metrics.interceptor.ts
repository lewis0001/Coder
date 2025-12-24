import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request & { route?: { path?: string } }>();
    const res = context.switchToHttp().getResponse<{ statusCode: number }>();
    const path = req.route?.path || req.url || 'unknown';
    const method = (req as any).method || 'GET';

    return next.handle().pipe(
      tap(() => this.metrics.recordHttpRequest(method, path, res.statusCode ?? 200)),
    );
  }
}
