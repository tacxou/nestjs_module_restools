import { AsyncLocalStorage } from 'node:async_hooks'

export class RequestContextStorage<TReq = any, TRes = any> {
  public static storage = new AsyncLocalStorage<RequestContextStorage>()

  public constructor(public readonly req: TReq, public readonly res: TRes) { }

  public static get currentContext(): RequestContextStorage | undefined {
    return this.storage.getStore()
  }
}
