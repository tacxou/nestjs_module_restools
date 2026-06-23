import { Types } from 'mongoose'
import { DEFAULT_SCHEMA_OPTIONS, filterSchema } from './search-filter-schema.decorator'

describe('search-filter-schema', () => {
  it('should work', () => {
    expect(true).toBe(true)
  })

  it('test string filter', () => {
    expect(
      filterSchema({
        patterns: 'game',
      }),
    ).toStrictEqual({ patterns: 'game' })
  })

  it('test objectId filter', () => {
    expect(
      filterSchema({
        ':concernedTo': '65fab2d6946a5ede152f2689',
      }),
    ).toEqual({ concernedTo: new Types.ObjectId('65fab2d6946a5ede152f2689') })
  })

  it('test objectId ne filter', () => {
    expect(
      filterSchema({
        '!:concernedTo': '65fab2d6946a5ede152f2689',
      }),
    ).toEqual({
      concernedTo: {
        $ne: new Types.ObjectId('65fab2d6946a5ede152f2689'),
      }
    })
  })

  it('test equal filter', () => {
    expect(
      filterSchema({
        ':concernedTo': 'toto',
      }),
    ).toEqual({ concernedTo: 'toto' })
  })

  it('test equal ne filter', () => {
    expect(
      filterSchema({
        '!:concernedTo': 'toto',
      }),
    ).toEqual({
      concernedTo: {
        $ne: 'toto',
      }
    })
  })

  it('test boolean filter with boolean string', () => {
    expect(
      filterSchema({
        '?active': 'true',
      }),
    ).toStrictEqual({ active: true })
  })

  it('test false boolean filter with boolean string', () => {
    expect(
      filterSchema({
        '?active': 'false',
      }),
    ).toStrictEqual({ active: false })
  })

  it('test boolean filter with int string', () => {
    expect(
      filterSchema({
        '?active': '1',
      }),
    ).toStrictEqual({ active: true })
  })

  it('test not empty filter with true', () => {
    expect(
      filterSchema({
        '~primaryEmployeeNumber': 'true',
      }),
    ).toStrictEqual({ primaryEmployeeNumber: { $exists: true, $nin: [null, ''] } })
  })

  it('test not empty filter with false', () => {
    expect(
      filterSchema({
        '~primaryEmployeeNumber': 'false',
      }),
    ).toStrictEqual({ primaryEmployeeNumber: { $exists: true, $in: [null, ''] } })
  })

  it('test int filter', () => {
    expect(
      filterSchema({
        '#age': '18',
      }),
    ).toStrictEqual({ age: 18 })
  })

  it('test not equal string filter', () => {
    expect(
      filterSchema({
        '!patterns': 'car',
      }),
    ).toStrictEqual({ patterns: { $ne: 'car' } })
  })

  it('test not equal int filter', () => {
    expect(
      filterSchema({
        '!#age': '18',
      }),
    ).toStrictEqual({ age: { $ne: 18 } })
  })


  it('test not equal null filter', () => {
    expect(
      filterSchema({
        '!:sync': null,
      }),
    ).toStrictEqual({ sync: { $ne: 'null' } })
  })

  it('test not equal int filter', () => {
    expect(
      filterSchema({
        '!#age': '18',
      }),
    ).toStrictEqual({ age: { $ne: 18 } })
  })

  it('test in string filter', () => {
    expect(
      filterSchema({
        '@patterns': ['poulet', 'cotcot'],
      }),
    ).toStrictEqual({ patterns: { $in: ['poulet', 'cotcot'] } })
  })

  it('test in string filter with csv', () => {
    expect(
      filterSchema({
        '@patterns': 'rch,ext,sna,ass',
      }),
    ).toStrictEqual({ patterns: { $in: ['rch', 'ext', 'sna', 'ass'] } })
  })

  it('test in string filter with csv on nested key', () => {
    expect(
      filterSchema({
        '@additionalFields.attributes.supannPerson.supannTypeEntiteAffectation': 'rch,ext,sna,ass',
      }),
    ).toStrictEqual({
      'additionalFields.attributes.supannPerson.supannTypeEntiteAffectation': { $in: ['rch', 'ext', 'sna', 'ass'] },
    })
  })

  it('test in bad array number', () => {
    expect(
      filterSchema({
        '@#patterns': ['not a number'],
      }, { strict: false }),
    ).toStrictEqual({})
  })

  it('test in bad string filter', () => {
    expect(
      () => filterSchema({
        '@patterns': 'wrong array',
      }),
    ).toThrow(Error)
  })

  it('test in int filter', () => {
    expect(
      filterSchema({
        '@#age': ['18', '19'],
      }),
    ).toStrictEqual({ age: { $in: [18, 19] } })
  })

  it('test in bad string filter', () => {
    expect(
      () => filterSchema({
        '@#age': 'wrong array',
      }),
    ).toThrow(Error)
  })

  it('test not in string filter', () => {
    expect(
      filterSchema({
        '!@patterns': ['bike', 'velo'],
      }),
    ).toStrictEqual({ patterns: { $nin: ['bike', 'velo'] } })
  })

  it('test not in string bad filter', () => {
    expect(
      () => filterSchema({
        '!@patterns': 'bad array',
      }),
    ).toThrow(Error)
  })

  it('test in string bad filter without strict', () => {
    expect(
      filterSchema({
        '@patterns': 'bad array',
      }, { strict: false }),
    ).toStrictEqual({})
  })


  it('test in string sub key bad filter without strict', () => {
    expect(
      filterSchema({
        '@patterns': [],
      }, { strict: false }),
    ).toStrictEqual({})
  })


  it('test in string sub key bad filter with error', () => {
    expect(
      () => filterSchema({
        '@patterns': [],
      }, { strict: true }),
    ).toThrow(Error)
  })

  it('test not in string bad filter without strict', () => {
    expect(
      filterSchema({
        '!@patterns': 'bad array',
      }, { strict: false }),
    ).toStrictEqual({})
  })

  it('test not in int filter', () => {
    expect(
      filterSchema({
        '!@#age': ['21', '22'],
      }),
    ).toStrictEqual({ age: { $nin: [21, 22] } })
  })

  it('test invalid in', () => {
    expect(
      () => filterSchema({
        '@#age': ['not a number'],
      }),
    ).toThrow(Error)
  })

  it('test invalid not in', () => {
    expect(
      () => filterSchema({
        '!@#age': ['not a number'],
      }),
    ).toThrow(Error)
  })

  it('test invalid string', () => {
    expect(
      () => filterSchema({
        ':patterns': ['array in', 'string type'],
      }),
    ).toThrow(Error)
  })

  it('test invalid int', () => {
    expect(
      () => filterSchema({
        '#patterns': 'not a number',
      }),
    ).toThrow(Error)
  })

  it('test invalid regex', () => {
    expect(
      () => filterSchema({
        '^patterns': 'test|not-test',
      }),
    ).toThrow(Error)
  })

  it('test invalid regex without strict', () => {
    expect(
      filterSchema({
        '^patterns': 'test|not-test',
      }, { strict: false }),
    ).toStrictEqual({})
  })

  it('test valid regex', () => {
    expect(
      filterSchema({
        '^patterns': '/test|not-test/',
      }),
    ).toStrictEqual({ patterns: { $regex: 'test|not-test' } })
  })

  it('test valid regex with options', () => {
    expect(
      filterSchema({
        '^patterns': '/test|not-test/i',
      }),
    ).toStrictEqual({ patterns: { $regex: 'test|not-test', $options: 'i' } })
  })

  it('test negation string', () => {
    expect(
      filterSchema({
        '!patterns': 'game',
      }),
    ).toStrictEqual({ patterns: { $ne: 'game' } })
  })

  it('test negation number', () => {
    expect(
      filterSchema({
        '!#age': '18',
      }),
    ).toStrictEqual({ age: { $ne: 18 } })
  })

  it('test basic', () => {
    expect(
      filterSchema({
        patterns: 'test',
      }),
    ).toStrictEqual({ patterns: 'test' })
  })

  it('test date >', () => {
    expect(
      filterSchema({
        '>age': '2023-01-01T00:00',
      }),
    ).toStrictEqual({ age: { $gt: new Date('2023-01-01T00:00') } })
  })

  it('test date > with invalid date and not strict', () => {
    expect(
      filterSchema({
        '>age': 'not valid date',
      }, { strict: false }),
    ).toStrictEqual({})
  })

  it('test date > with invalid date and strict', () => {
    expect(
      () => filterSchema({
        '>age': 'not valid date',
      }),
    ).toThrow(Error)
  })

  it('test date >|', () => {
    expect(
      filterSchema({
        '>|age': '2023-01-01T00:00',
      }),
    ).toStrictEqual({ age: { $gte: new Date('2023-01-01T00:00') } })
  })

  it('test date <', () => {
    expect(
      filterSchema({
        '<age': '2023-01-01T00:00',
      }),
    ).toStrictEqual({ age: { $lt: new Date('2023-01-01T00:00') } })
  })

  it('test date <|', () => {
    expect(
      filterSchema({
        '<|age': '2023-01-01T00:00',
      }),
    ).toStrictEqual({ age: { $lte: new Date('2023-01-01T00:00') } })
  })

  it('test int >', () => {
    expect(
      filterSchema({
        '>#type': '18',
      }),
    ).toStrictEqual({ type: { $gt: 18 } })
  })

  it('test int >|', () => {
    expect(
      filterSchema({
        '>|#type': '18',
      }),
    ).toStrictEqual({ type: { $gte: 18 } })
  })

  it('test int <', () => {
    expect(
      filterSchema({
        '<#type': '18',
      }),
    ).toStrictEqual({ type: { $lt: 18 } })
  })

  it('test int <|', () => {
    expect(
      filterSchema({
        '<|#type': '18',
      }),
    ).toStrictEqual({ type: { $lte: 18 } })
  })

  it('bad key', () => {
    expect(
      filterSchema({
        '<|#': '18',
      }),
    ).toStrictEqual({})
  })

  it('unsafe filtered', () => {
    expect(
      () => filterSchema({
        patterns: ['test', 'test2'],
      }),
    ).toThrow(Error)
  })

  it('unsafe unfiltered', () => {
    expect(
      filterSchema(
        {
          patterns: ['test', 'test2'],
        },
        { unsafe: true },
      ),
    ).toStrictEqual({ patterns: ['test', 'test2'] })
  })

  it('change with default options', () => {
    expect(
      filterSchema(
        {
          patterns: ['test', 'test2'],
        },
        { ...DEFAULT_SCHEMA_OPTIONS, unsafe: true },
      ),
    ).toStrictEqual({ patterns: ['test', 'test2'] })
  })

  it('change with default options without strict', () => {
    expect(
      filterSchema(
        {
          '#patterns': 'not a number',
        },
        { strict: false },
      ),
    ).toStrictEqual({})
  })

  it('equal with array bad type', () => {
    expect(
      () => filterSchema({
        ':patterns': ['array in', 'string type'],
      }),
    ).toThrow(Error)
  })

  it('equal with array bad type without strict', () => {
    expect(
      filterSchema(
        {
          ':patterns': ['array in', 'string type'],
        },
        { strict: false },
      ),
    ).toStrictEqual({})
  })

  it('default sign with array and not unsafe options', () => {
    expect(
      () => filterSchema({
        'patterns': ['array in', 'string type'],
      }),
    ).toThrow(Error)
  })

  it('default sign with array and unsafe options', () => {
    expect(
      filterSchema({
        'patterns': ['array in', 'string type'],
      }, { unsafe: true }),
    ).toStrictEqual({
      'patterns': ['array in', 'string type'],
    })
  })

  it('default sign with array and not strict options', () => {
    expect(
      filterSchema({
        'patterns': ['array in', 'string type'],
      }, { strict: false }),
    ).toStrictEqual({})
  })
})
