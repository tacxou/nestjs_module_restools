import { HydratedDocument, Model, Types } from 'mongoose'
import { AbstractServiceSchema } from './abstract.service.schema'
import { ServiceSchemaInterface } from './interfaces/service-schema.interface'

// --- Type utilities ---

type Expect<T extends true> = T

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false

// --- Test document types ---

interface IUser {
  _id?: Types.ObjectId
  email: string
  name: string
}

type HydratedUser = HydratedDocument<IUser>

class UserService
  extends AbstractServiceSchema<IUser, HydratedUser>
  implements ServiceSchemaInterface<IUser, HydratedUser>
{
  protected readonly model = {} as Model<IUser, {}, {}, {}, HydratedUser>
}

declare const userService: UserService

// --- Return type assertions ---

type _findReturnsHydratedArray = Expect<
  Equal<Awaited<ReturnType<UserService['find']>>, HydratedUser[]>
>

type _findOneReturnsHydrated = Expect<Equal<Awaited<ReturnType<UserService['findOne']>>, HydratedUser>>

type _findByIdReturnsHydrated = Expect<Equal<Awaited<ReturnType<UserService['findById']>>, HydratedUser>>

type _createReturnsHydrated = Expect<Equal<Awaited<ReturnType<UserService['create']>>, HydratedUser>>

type _updateReturnsHydrated = Expect<Equal<Awaited<ReturnType<UserService['update']>>, HydratedUser>>

type _deleteReturnsHydrated = Expect<Equal<Awaited<ReturnType<UserService['delete']>>, HydratedUser>>

type _upsertReturnsHydrated = Expect<Equal<Awaited<ReturnType<UserService['upsert']>>, HydratedUser>>

type _countReturnsNumber = Expect<Equal<Awaited<ReturnType<UserService['count']>>, number>>

type _findAndCountReturnsTuple = Expect<
  Equal<Awaited<ReturnType<UserService['findAndCount']>>, [HydratedUser[], number]>
>

// --- Inference from concrete service instance ---

async function typeInferenceChecks() {
  const users: HydratedUser[] = await userService.find({ email: 'a@b.c' })
  const user: HydratedUser = await userService.findOne({ email: 'a@b.c' })
  const byId: HydratedUser = await userService.findById(new Types.ObjectId())
  const created: HydratedUser = await userService.create({ email: 'x@y.z', name: 'X' })
  const updated: HydratedUser = await userService.update(new Types.ObjectId(), { $set: { name: 'Y' } })
  const removed: HydratedUser = await userService.delete(new Types.ObjectId())
  const upserted: HydratedUser = await userService.upsert({ email: 'x@y.z' }, { $set: { name: 'Z' } })
  const n: number = await userService.count()
  const [list, total]: [HydratedUser[], number] = await userService.findAndCount()

  void users
  void user
  void byId
  void created
  void updated
  void removed
  void upserted
  void n
  void list
  void total
}

void typeInferenceChecks

// --- Negative tests: invalid assignments must fail compilation ---

// @ts-expect-error — find must return HydratedUser[], not raw IUser[]
const _wrongFindReturn: IUser[] = userService.find()

// @ts-expect-error — create returns Promise<HydratedUser>, not string
const _wrongCreateReturn: string = userService.create({ email: 'a', name: 'A' })

// @ts-expect-error — id must be ObjectId or string
userService.findById(123)

void _wrongFindReturn
void _wrongCreateReturn
