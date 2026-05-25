import {
  HydratedDocument,
  MongooseBaseQueryOptions,
  ProjectionType,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose'
import type { QueryFilter } from 'mongoose'
import mongodb from 'mongodb'

export interface ServiceSchemaInterface<
  TRawDoc extends { _id?: Types.ObjectId },
  THydrated extends HydratedDocument<TRawDoc> = HydratedDocument<TRawDoc>,
> {
  find(
    filter?: QueryFilter<TRawDoc>,
    projection?: ProjectionType<TRawDoc> | null,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated[]>

  count(
    filter?: QueryFilter<TRawDoc>,
    options?: (mongodb.CountOptions & MongooseBaseQueryOptions<TRawDoc>) | null,
  ): Promise<number>

  findAndCount(
    filter?: QueryFilter<TRawDoc>,
    projection?: ProjectionType<TRawDoc> | null,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<[THydrated[], number]>

  findById(
    id: Types.ObjectId | string,
    projection?: ProjectionType<TRawDoc> | null,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated>

  findOne(
    filter?: QueryFilter<TRawDoc>,
    projection?: ProjectionType<TRawDoc> | null,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated>

  create(data?: Partial<TRawDoc>, options?: SaveOptions): Promise<THydrated>

  update(
    id: Types.ObjectId | string,
    update: UpdateQuery<TRawDoc>,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated>

  upsert(
    filter: QueryFilter<TRawDoc>,
    update: UpdateQuery<TRawDoc>,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated>

  delete(
    id: Types.ObjectId | string,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated>
}
