import { NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { HydratedDocument, Model, Types } from 'mongoose'
import { AbstractServiceContext } from '../_abstracts/abstract.service'
import { AbstractServiceSchema } from './abstract.service.schema'
import { EventEmitterSeparator } from './constants/event-emitter.constant'

interface ITestEntity {
  _id?: Types.ObjectId
  name: string
}

type THydratedTestEntity = HydratedDocument<ITestEntity>

function mockQuery<T>(result: T) {
  return { exec: jest.fn().mockResolvedValue(result) }
}

class TestEntityService extends AbstractServiceSchema<ITestEntity, THydratedTestEntity> {
  protected readonly model: Model<ITestEntity, {}, {}, {}, THydratedTestEntity>

  public constructor(
    model: Model<ITestEntity, {}, {}, {}, THydratedTestEntity>,
    context?: AbstractServiceContext,
  ) {
    super(context)
    this.model = model
  }
}

describe('AbstractServiceSchema', () => {
  const entityId = new Types.ObjectId()
  const hydrated = { _id: entityId, name: 'test' } as THydratedTestEntity

  const createMockModel = () => ({
    find: jest.fn().mockReturnValue(mockQuery([hydrated])),
    countDocuments: jest.fn().mockReturnValue(mockQuery(1)),
    findById: jest.fn().mockReturnValue(mockQuery(hydrated)),
    findOne: jest.fn().mockReturnValue(mockQuery(hydrated)),
    insertOne: jest.fn().mockResolvedValue(hydrated),
    findByIdAndUpdate: jest.fn().mockReturnValue(mockQuery(hydrated)),
    findOneAndUpdate: jest.fn().mockReturnValue(mockQuery(hydrated)),
    findByIdAndDelete: jest.fn().mockReturnValue(mockQuery(hydrated)),
  })

  const createContext = (eventEmitter?: EventEmitter2): AbstractServiceContext => ({
    req: { path: '/users/list' } as AbstractServiceContext['req'],
    moduleName: 'Users',
    serviceName: 'Entity',
    eventEmitter,
  })

  it('find delegates to model.find().exec()', async () => {
    const model = createMockModel()
    const service = new TestEntityService(model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>, createContext())

    const result = await service.find({ name: 'test' })

    expect(model.find).toHaveBeenCalledWith({ name: 'test' }, undefined, undefined)
    expect(result).toEqual([hydrated])
  })

  it('count delegates to model.countDocuments().exec()', async () => {
    const model = createMockModel()
    const service = new TestEntityService(model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>, createContext())

    const result = await service.count({ name: 'test' })

    expect(model.countDocuments).toHaveBeenCalled()
    expect(result).toBe(1)
  })

  it('findAndCount returns data and count', async () => {
    const model = createMockModel()
    const service = new TestEntityService(model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>, createContext())

    const [data, count] = await service.findAndCount()

    expect(data).toEqual([hydrated])
    expect(count).toBe(1)
  })

  it('findById throws NotFoundException when null', async () => {
    const model = createMockModel()
    model.findById.mockReturnValue(mockQuery(null))
    const service = new TestEntityService(model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>, createContext())

    await expect(service.findById(entityId)).rejects.toThrow(NotFoundException)
  })

  it('findOne throws NotFoundException when null', async () => {
    const model = createMockModel()
    model.findOne.mockReturnValue(mockQuery(null))
    const service = new TestEntityService(model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>, createContext())

    await expect(service.findOne({ name: 'missing' })).rejects.toThrow(NotFoundException)
  })

  it('create delegates to model.insertOne()', async () => {
    const model = createMockModel()
    const service = new TestEntityService(model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>, createContext())

    const result = await service.create({ name: 'new' })

    expect(model.insertOne).toHaveBeenCalledWith({ name: 'new' }, undefined)
    expect(result).toEqual(hydrated)
  })

  it('update throws NotFoundException when null', async () => {
    const model = createMockModel()
    model.findByIdAndUpdate.mockReturnValue(mockQuery(null))
    const service = new TestEntityService(model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>, createContext())

    await expect(service.update(entityId, { $set: { name: 'x' } })).rejects.toThrow(NotFoundException)
  })

  it('delete throws NotFoundException when null', async () => {
    const model = createMockModel()
    model.findByIdAndDelete.mockReturnValue(mockQuery(null))
    const service = new TestEntityService(model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>, createContext())

    await expect(service.delete(entityId)).rejects.toThrow(NotFoundException)
  })

  it('beforeFind hook merges filter and emits correct event name', async () => {
    const model = createMockModel()
    const eventEmitter = { emitAsync: jest.fn().mockResolvedValue([{ filter: { active: true } }]) } as unknown as EventEmitter2
    const service = new TestEntityService(
      model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>,
      createContext(eventEmitter),
    )

    await service.find({ name: 'test' })

    const expectedEvent = ['users', 'entity', 'service', 'beforeFind'].join(EventEmitterSeparator)
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      expectedEvent,
      expect.objectContaining({ filter: { name: 'test' }, eventName: expectedEvent }),
    )
    expect(model.find).toHaveBeenCalledWith({ name: 'test', active: true }, undefined, undefined)
  })

  it('beforeFind hook stop throws', async () => {
    const model = createMockModel()
    const stopError = new Error('stopped')
    const eventEmitter = { emitAsync: jest.fn().mockResolvedValue([{ stop: stopError }]) } as unknown as EventEmitter2
    const service = new TestEntityService(
      model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>,
      createContext(eventEmitter),
    )

    await expect(service.find()).rejects.toThrow('stopped')
    expect(model.find).not.toHaveBeenCalled()
  })

  it('upsert delegates to findOneAndUpdate with upsert option', async () => {
    const model = createMockModel()
    const service = new TestEntityService(model as unknown as Model<ITestEntity, {}, {}, {}, THydratedTestEntity>, createContext())

    const result = await service.upsert({ name: 'test' }, { $set: { name: 'updated' } })

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { name: 'test' },
      { $set: { name: 'updated' } },
      expect.objectContaining({ upsert: true, new: true, runValidators: true }),
    )
    expect(result).toEqual(hydrated)
  })
})
