import { Injectable, Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Request } from 'express'
import { RequestContextStorage } from 'src/request-context'

export interface AbstractServiceContext {
  [key: string | number]: any

  moduleRef?: ModuleRef
  req?: Request & { user?: any }
  eventEmitter?: EventEmitter2
  serviceName?: string
  moduleName?: string
}

@Injectable()
export abstract class AbstractService {
  protected logger: Logger
  protected moduleRef?: ModuleRef
  private readonly _req?: Request & { user?: any }
  protected eventEmitter?: EventEmitter2

  private _customServiceName?: string
  private _customModuleName?: string

  protected constructor(context?: AbstractServiceContext) {
    this.logger = new Logger(this.serviceName)
    this.moduleRef = context?.moduleRef
    this._req = context?.req
    this.eventEmitter = context?.eventEmitter

    this._customModuleName = context?.moduleName
    this._customServiceName = context?.serviceName
  }

  protected get request():
    | (Request & {
      user?: any
    })
    | null {
    return this._req || RequestContextStorage.currentContext?.req || null
  }

  public get moduleName(): string {
    if (!this.request) throw new Error('Request is not defined in ' + this.constructor.name);
    const segment = this.request.path.split('/').slice(1).shift()
    if (!segment) {
      throw new Error('Module name could not be resolved from request path in ' + this.constructor.name)
    }
    return this._customModuleName || segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  public get serviceName(): string {
    if (!this.constructor.name) throw new Error('Service name is not defined in ' + this.constructor.name)
    return this._customServiceName || this.constructor.name.replace(/Service$/, '')
  }
}
