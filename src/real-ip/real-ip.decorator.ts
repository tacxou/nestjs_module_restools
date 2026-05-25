import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { getClientIp } from 'request-ip'

export const RealIp = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return getClientIp(request)
})
