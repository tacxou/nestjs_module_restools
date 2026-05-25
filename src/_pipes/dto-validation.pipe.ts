import { ArgumentMetadata, HttpStatus, Injectable, Logger, ValidationError, ValidationPipe, ValidationPipeOptions } from '@nestjs/common'

interface ValidationRecursive {
  [key: string]: string
}

@Injectable()
export class DtoValidationPipe extends ValidationPipe {
  public constructor(options?: ValidationPipeOptions) {
    super({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => this.exceptionHandler(errors),
      ...options,
    })
  }

  public async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    return (await super.transform(value, metadata)) || value;
  }

  public exceptionHandler(errors: ValidationError[]) {
    let validations: ValidationRecursive = {}
    for (const error of errors) {
      validations = { ...validations, ...this.validationRecursive(error) }
    }

    const message = `Erreur de validation : ${Object.keys(validations).join(', ')}`.trim()
    Logger.debug(`${message} (${JSON.stringify(validations)})`, DtoValidationPipe.name)

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      validations,
    }
  }

  protected validationRecursive(error: ValidationError, prefix = ''): ValidationRecursive {
    let validations: Record<string, string> = {}
    if (error.constraints) {
      validations[`${prefix + error.property}`] = Object.values(error.constraints)[0]
    }
    if (error.children && error.children.length > 0) {
      for (const errorChild of error.children) {
        if (errorChild.constraints) {
          validations[`${prefix + error.property}.${errorChild.property}`] = Object.values(errorChild.constraints)[0]
        }
        if (errorChild.children && errorChild.children.length > 0) {
          validations = { ...validations, ...this.validationRecursive(errorChild, `${prefix + error.property}.${errorChild.property}.`) }
        }
      }
    }
    return validations
  }
}
