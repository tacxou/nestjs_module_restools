import { Test } from '@nestjs/testing'
import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { TestModule } from './_test/test.module'

describe('request-context', () => {
  let app: INestApplication

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication()
    await app.init()
  })

  it('should work', () => {
    expect(true).toBe(true)
  })

  it('test with multiples requests same as different requestId count', async () => {
    await request(app.getHttpServer()).get('/').expect(200, {
      initializationCount: 2,
      requestId: 0,
    })
    await request(app.getHttpServer()).get('/').expect(200, {
      initializationCount: 2,
      requestId: 1,
    })
    await request(app.getHttpServer()).get('/').expect(200, {
      initializationCount: 2,
      requestId: 2,
    })
  })
})
