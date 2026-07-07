import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

// Works for both REST (HTTP) and GraphQL execution contexts.
export function requestOf(ctx: ExecutionContext): { user?: AuthUser } {
  if (ctx.getType<'http' | 'graphql'>() === 'graphql') {
    return GqlExecutionContext.create(ctx).getContext<{
      req: { user?: AuthUser };
    }>().req;
  }
  return ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return requestOf(ctx).user as AuthUser;
  },
);
