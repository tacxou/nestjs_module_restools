import { Abstract, ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpExceptionBodyMessage, HttpStatus, Logger, Type } from '@nestjs/common'
import { Request, Response } from 'express'
import { Error } from 'mongoose'

type MongooseError = {
  message: string
  errors?: Record<string, { message: string; constraints?: Record<string, string>; property?: string }>
  path?: string
}

export function MongooseValidationFilter<T = Type<any> | Abstract<any>>(exceptions?: Array<Type<any> | Abstract<any>>) {
  @Catch(...(exceptions ?? [Error.ValidationError, Error.CastError]))
  class MongooseValidationFilter implements ExceptionFilter {
    public catch(exception: T & MongooseError, host: ArgumentsHost) {
      Logger.debug(exception['message'], MongooseValidationFilter.name)

      const ctx = host.switchToHttp()
      const request = ctx.getRequest<Request>()
      const response = ctx.getResponse<Response>()

      const debug: Record<string, unknown> = {}
      if (process.env.NODE_ENV !== 'production' && request.query['debug']) {
        debug['_exception'] = exception
      }

      response.status(HttpStatus.NOT_ACCEPTABLE).json(
        HttpException.createBody(
          {
            statusCode: HttpStatus.NOT_ACCEPTABLE,
            message: exception['message'],
            validations: this.getValidationErrors(exception),
            ...debug,
          } as unknown as HttpExceptionBodyMessage,
          exception.constructor.name,
          HttpStatus.NOT_ACCEPTABLE,
        ),
      )
    }

    public getValidationErrors(err: MongooseError): Record<string, any> {
      const validations: Record<string, any> = {}

      if (err instanceof Error.ValidationError) {
        for (const key in err.errors) {
          const subError = err.errors[key] as {
            message: string
            constraints?: Record<string, string>
            property?: string
          }
          if (subError.constraints) {
            Object.keys(subError.constraints).forEach((ckey) => {
              const property = subError.property
              validations[`${key}.${property}`] = subError.constraints![ckey]
            })

            continue
          }

          validations[key] = subError.message
        }
      } else if (err instanceof Error.CastError) {
        validations[err.path ?? 'unknown'] = err.message
      }

      return validations
    }
  }

  return MongooseValidationFilter
}
