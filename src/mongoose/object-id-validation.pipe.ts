import { ArgumentMetadata, BadRequestException, Injectable, Logger, PipeTransform } from '@nestjs/common'
import { Types } from 'mongoose'

@Injectable()
export class ObjectIdValidationPipe implements PipeTransform<string, Types.ObjectId> {
  public transform(value: string | Types.ObjectId, _metadata: ArgumentMetadata): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ObjectId <${value}>`)
    }
    return new Types.ObjectId(value)
  }
}
