import { Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'

export interface AbstractControllerContext {
  [key: string | number]: any

  moduleRef?: ModuleRef
  controllerName?: string
}

export abstract class AbstractController {
  protected logger: Logger
  protected moduleRef?: ModuleRef

  private _customControllerName?: string

  public constructor(context?: AbstractControllerContext) {
    this.logger = new Logger(this.controllerName)
    this.moduleRef = context?.moduleRef

    this._customControllerName = context?.controllerName
  }

  public get controllerName(): string {
    if (!this.constructor.name) throw new Error('Controller name is not defined in ' + this.constructor.name)
    return this._customControllerName || this.constructor.name.replace(/Controller$/, '')
  }
}
