import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

// The global throttler must read the request from the GraphQL context too, not just HTTP.
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    if (context.getType<'http' | 'graphql'>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getContext<{
        req: Record<string, any>;
      }>();
      return { req: ctx.req, res: ctx.req.res as Record<string, any> };
    }
    return super.getRequestResponse(context);
  }
}
