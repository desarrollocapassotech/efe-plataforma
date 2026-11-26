import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { serializarDecimales } from './serializar-decimales';

/** Interceptor global: los montos salen siempre como string ("1234.50"), nunca como number. */
@Injectable()
export class DecimalInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(serializarDecimales));
  }
}
