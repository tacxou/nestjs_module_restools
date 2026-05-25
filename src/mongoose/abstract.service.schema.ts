import { Injectable, NotFoundException } from '@nestjs/common'
import {
  HydratedDocument,
  Model,
  MongooseBaseQueryOptions,
  ProjectionType,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose'
import type { QueryFilter } from 'mongoose'
import mongodb from 'mongodb'
import { AbstractService } from '../_abstracts/abstract.service'
import type { AbstractServiceContext } from '../_abstracts/abstract.service'
import { EventEmitterSeparator } from './constants/event-emitter.constant'
import { ServiceSchemaInterface } from './interfaces/service-schema.interface'

export type AbstractServiceSchemaModel<
  TRawDoc extends { _id?: Types.ObjectId },
  THydrated extends HydratedDocument<TRawDoc> = HydratedDocument<TRawDoc>,
> = Model<TRawDoc, {}, {}, {}, THydrated>

type BeforeHookResult = {
  stop?: unknown
  filter?: QueryFilter<unknown>
  projection?: ProjectionType<unknown> | null
  options?: QueryOptions<unknown> | null
  data?: unknown
  update?: UpdateQuery<unknown>
  _id?: Types.ObjectId | string
}

@Injectable()
export abstract class AbstractServiceSchema<
  TRawDoc extends { _id?: Types.ObjectId },
  THydrated extends HydratedDocument<TRawDoc> = HydratedDocument<TRawDoc>,
>
  extends AbstractService
  implements ServiceSchemaInterface<TRawDoc, THydrated>
{
  protected abstract readonly model: AbstractServiceSchemaModel<TRawDoc, THydrated>

  protected constructor(context?: AbstractServiceContext) {
    super(context)
  }

  protected buildEventName(phase: 'before' | 'after', operation: string): string {
    return [
      this.moduleName.toLowerCase(),
      this.serviceName.toLowerCase(),
      'service',
      `${phase}${operation}`,
    ].join(EventEmitterSeparator)
  }

  protected serializeArgs(args: IArguments): unknown[] {
    return Array.from(args).map((arg, index) => {
      if (typeof arg === 'object' && arg !== null && 'session' in arg) {
        return { ...arg, session: 'session' }
      }
      if (index === 1 && typeof arg === 'object' && arg !== null) {
        return arg
      }
      return arg
    })
  }

  protected async runBeforeHooks(
    eventName: string,
    payload: Record<string, unknown>,
  ): Promise<BeforeHookResult> {
    const merged: BeforeHookResult = {}
    if (!this.eventEmitter) return merged

    const beforeEvents = await this.eventEmitter.emitAsync(eventName, {
      ...payload,
      eventName,
    })

    for (const beforeEvent of beforeEvents) {
      if (!beforeEvent || typeof beforeEvent !== 'object') continue
      const hook = beforeEvent as BeforeHookResult
      if (hook.stop !== undefined) throw hook.stop
      if (hook.filter) merged.filter = { ...(merged.filter ?? {}), ...hook.filter }
      if (hook.projection !== undefined) {
        const canMergeProjections =
          typeof hook.projection === 'object' &&
          hook.projection !== null &&
          !Array.isArray(hook.projection) &&
          typeof merged.projection === 'object' &&
          merged.projection !== null &&
          !Array.isArray(merged.projection)
        merged.projection = canMergeProjections
          ? {
              ...(merged.projection as Record<string, unknown>),
              ...(hook.projection as Record<string, unknown>),
            }
          : hook.projection
      }
      if (hook.options) merged.options = { ...(merged.options ?? {}), ...hook.options }
      if (hook.data !== undefined && typeof hook.data === 'object' && hook.data !== null) {
        merged.data = { ...(merged.data as Record<string, unknown>), ...(hook.data as Record<string, unknown>) }
      }
      if (hook.update) merged.update = { ...(merged.update ?? {}), ...hook.update }
      if (hook._id !== undefined) merged._id = hook._id
    }

    return merged
  }

  protected mergeFilter(
    base: QueryFilter<TRawDoc>,
    extra?: QueryFilter<unknown>,
  ): QueryFilter<TRawDoc> {
    if (!extra) return base
    return { ...base, ...extra } as QueryFilter<TRawDoc>
  }

  public async find(
    filter: QueryFilter<TRawDoc> = {},
    projection?: ProjectionType<TRawDoc> | null,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated[]> {
    const before = await this.runBeforeHooks(this.buildEventName('before', 'Find'), {
      filter,
      projection,
      options,
    })
    filter = this.mergeFilter(filter, before.filter)
    if (before.projection !== undefined) projection = before.projection as ProjectionType<TRawDoc> | null
    if (before.options) options = { ...options, ...before.options } as QueryOptions<TRawDoc>

    this.logger.debug(['find', JSON.stringify(this.serializeArgs(arguments))].join(' '))
    let data = (await this.model.find(filter, projection ?? undefined, options ?? undefined).exec()) as THydrated[]

    if (this.eventEmitter) {
      const afterEventName = this.buildEventName('after', 'Find')
      const afterEvents = await this.eventEmitter.emitAsync(afterEventName, {
        data,
        filter,
        projection,
        options,
        eventName: afterEventName,
      })
      for (const afterEvent of afterEvents) {
        if (!afterEvent || typeof afterEvent !== 'object') continue
        const hook = afterEvent as { data?: THydrated[] }
        if (hook.data) data = hook.data
      }
    }

    return data
  }

  public async count(
    filter: QueryFilter<TRawDoc> = {},
    options?: (mongodb.CountOptions & MongooseBaseQueryOptions<TRawDoc>) | null,
  ): Promise<number> {
    const before = await this.runBeforeHooks(this.buildEventName('before', 'Count'), { filter, options })
    filter = this.mergeFilter(filter, before.filter)
    if (before.options) options = { ...options, ...before.options } as typeof options

    this.logger.debug(['count', JSON.stringify(this.serializeArgs(arguments))].join(' '))
    return this.model.countDocuments(filter, options as mongodb.CountOptions & MongooseBaseQueryOptions<TRawDoc>).exec()
  }

  public async findAndCount(
    filter: QueryFilter<TRawDoc> = {},
    projection?: ProjectionType<TRawDoc> | null,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<[THydrated[], number]> {
    const beforeEventName = this.buildEventName('before', 'FindAndCount')
    const before = await this.runBeforeHooks(beforeEventName, { filter, projection, options })
    filter = this.mergeFilter(filter, before.filter)
    if (before.projection !== undefined) projection = before.projection as ProjectionType<TRawDoc> | null
    if (before.options) options = { ...options, ...before.options } as QueryOptions<TRawDoc>

    this.logger.debug(['findAndCount', JSON.stringify(this.serializeArgs(arguments))].join(' '))

    let count = await this.model.countDocuments(filter).exec()
    let data = (await this.model.find(filter, projection ?? undefined, options ?? undefined).exec()) as THydrated[]

    if (this.eventEmitter) {
      const afterEventName = this.buildEventName('after', 'FindAndCount')
      const afterEvents = await this.eventEmitter.emitAsync(afterEventName, {
        data,
        count,
        eventName: afterEventName,
      })
      for (const afterEvent of afterEvents) {
        if (!afterEvent || typeof afterEvent !== 'object') continue
        const hook = afterEvent as { data?: THydrated[]; count?: number }
        if (hook.data) data = hook.data
        if (hook.count !== undefined) count += hook.count
      }
    }

    return [data, count]
  }

  public async findById(
    id: Types.ObjectId | string,
    projection?: ProjectionType<TRawDoc> | null,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated> {
    const beforeEventName = this.buildEventName('before', 'FindById')
    const before = await this.runBeforeHooks(beforeEventName, { _id: id, projection, options })
    if (before._id !== undefined) id = before._id
    if (before.projection !== undefined) projection = before.projection as ProjectionType<TRawDoc> | null
    if (before.options) options = { ...options, ...before.options } as QueryOptions<TRawDoc>

    this.logger.debug(['findById', JSON.stringify(this.serializeArgs(arguments))].join(' '))

    let data = await this.model.findById(id, projection, options).exec()

    if (this.eventEmitter) {
      const afterEventName = this.buildEventName('after', 'FindById')
      const afterEvents = await this.eventEmitter.emitAsync(afterEventName, { data, eventName: afterEventName })
      for (const afterEvent of afterEvents) {
        if (!afterEvent || typeof afterEvent !== 'object') continue
        const hook = afterEvent as { data?: THydrated }
        if (hook.data) data = { ...data, ...hook.data } as THydrated
      }
    }

    if (!data) {
      throw new NotFoundException()
    }

    return data
  }

  public async findOne(
    filter: QueryFilter<TRawDoc> = {},
    projection?: ProjectionType<TRawDoc> | null,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated> {
    const beforeEventName = this.buildEventName('before', 'FindOne')
    const before = await this.runBeforeHooks(beforeEventName, { filter, projection, options })
    filter = this.mergeFilter(filter, before.filter)
    if (before.projection !== undefined) projection = before.projection as ProjectionType<TRawDoc> | null
    if (before.options) options = { ...options, ...before.options } as QueryOptions<TRawDoc>

    this.logger.debug(['findOne', JSON.stringify(this.serializeArgs(arguments))].join(' '))

    let data = await this.model.findOne(filter, projection, options).exec()

    if (!data) {
      throw new NotFoundException()
    }

    if (this.eventEmitter) {
      const afterEventName = this.buildEventName('after', 'FindOne')
      const afterEvents = await this.eventEmitter.emitAsync(afterEventName, { data, eventName: afterEventName })
      for (const afterEvent of afterEvents) {
        if (!afterEvent || typeof afterEvent !== 'object') continue
        const hook = afterEvent as { data?: THydrated }
        if (hook.data) data = { ...data, ...hook.data } as THydrated
      }
    }

    return data
  }

  public async create(data: Partial<TRawDoc> = {}, options?: SaveOptions): Promise<THydrated> {
    const beforeEventName = this.buildEventName('before', 'Create')
    const before = await this.runBeforeHooks(beforeEventName, { data, options })
    if (before.data) data = { ...data, ...before.data } as Partial<TRawDoc>
    if (before.options) options = { ...options, ...before.options } as SaveOptions

    this.logger.debug(['create', JSON.stringify(this.serializeArgs(arguments))].join(' '))

    const created = await this.model.insertOne(
      data as Parameters<AbstractServiceSchemaModel<TRawDoc, THydrated>['insertOne']>[0],
      options,
    )

    if (this.eventEmitter) {
      const afterEventName = this.buildEventName('after', 'Create')
      const afterEvents = await this.eventEmitter.emitAsync(afterEventName, {
        created,
        eventName: afterEventName,
      })
      for (const afterEvent of afterEvents) {
        if (!afterEvent || typeof afterEvent !== 'object') continue
        const hook = afterEvent as { created?: THydrated }
        if (hook.created && typeof hook.created === 'object') {
          return { ...created, ...hook.created } as THydrated
        }
      }
    }

    return created
  }

  public async update(
    id: Types.ObjectId | string,
    update: UpdateQuery<TRawDoc>,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated> {
    const beforeEventName = this.buildEventName('before', 'Update')
    const before = await this.runBeforeHooks(beforeEventName, { _id: id, update, options })
    if (before._id !== undefined) id = before._id
    if (before.update) update = { ...update, ...before.update } as UpdateQuery<TRawDoc>
    if (before.options) options = { ...options, ...before.options } as QueryOptions<TRawDoc>

    this.logger.debug(['update', JSON.stringify(this.serializeArgs(arguments))].join(' '))

    const updated = await this.model
      .findByIdAndUpdate(id, update, { new: true, runValidators: true, ...options })
      .exec()

    if (!updated) {
      throw new NotFoundException()
    }

    if (this.eventEmitter) {
      const afterEventName = this.buildEventName('after', 'Update')
      const afterEvents = await this.eventEmitter.emitAsync(afterEventName, {
        updated,
        eventName: afterEventName,
      })
      for (const afterEvent of afterEvents) {
        if (!afterEvent || typeof afterEvent !== 'object') continue
        const hook = afterEvent as { updated?: THydrated }
        if (hook.updated) return { ...updated, ...hook.updated } as THydrated
      }
    }

    return updated
  }

  public async upsert(
    filter: QueryFilter<TRawDoc>,
    update: UpdateQuery<TRawDoc>,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated> {
    const beforeEventName = this.buildEventName('before', 'Upsert')
    const before = await this.runBeforeHooks(beforeEventName, { filter, update, options })
    filter = this.mergeFilter(filter, before.filter)
    if (before.update) update = { ...update, ...before.update } as UpdateQuery<TRawDoc>
    if (before.options) options = { ...options, ...before.options } as QueryOptions<TRawDoc>

    this.logger.debug(['upsert', JSON.stringify(this.serializeArgs(arguments))].join(' '))

    const result = await this.model
      .findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        runValidators: true,
        ...options,
      })
      .exec()

    if (!result) {
      throw new NotFoundException()
    }

    if (this.eventEmitter) {
      const afterEventName = this.buildEventName('after', 'Upsert')
      const afterEvents = await this.eventEmitter.emitAsync(afterEventName, {
        result,
        eventName: afterEventName,
      })
      for (const afterEvent of afterEvents) {
        if (!afterEvent || typeof afterEvent !== 'object') continue
        const hook = afterEvent as { result?: THydrated }
        if (hook.result) return { ...result, ...hook.result } as THydrated
      }
    }

    return result
  }

  public async delete(
    id: Types.ObjectId | string,
    options?: QueryOptions<TRawDoc> | null,
  ): Promise<THydrated> {
    const beforeEventName = this.buildEventName('before', 'Delete')
    const before = await this.runBeforeHooks(beforeEventName, { _id: id, options })
    if (before._id !== undefined) id = before._id
    if (before.options) options = { ...options, ...before.options } as QueryOptions<TRawDoc>

    this.logger.debug(['delete', JSON.stringify(this.serializeArgs(arguments))].join(' '))

    const deleted = await this.model.findByIdAndDelete(id, options).exec()

    if (!deleted) {
      throw new NotFoundException()
    }

    if (this.eventEmitter) {
      const afterEventName = this.buildEventName('after', 'Delete')
      const afterEvents = await this.eventEmitter.emitAsync(afterEventName, {
        deleted,
        eventName: afterEventName,
      })
      for (const afterEvent of afterEvents) {
        if (!afterEvent || typeof afterEvent !== 'object') continue
        const hook = afterEvent as { deleted?: THydrated }
        if (hook.deleted) return { ...deleted, ...hook.deleted } as THydrated
      }
    }

    return deleted
  }
}
