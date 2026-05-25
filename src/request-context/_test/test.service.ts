import { Injectable } from '@nestjs/common'
import { TestContext } from './test-context'

@Injectable()
export class TestService {
  public static initializationCount = 0

  public constructor() {
    TestService.initializationCount++
  }

  public getRequestId() {
    return TestContext.get()!.req.requestId
  }
}
