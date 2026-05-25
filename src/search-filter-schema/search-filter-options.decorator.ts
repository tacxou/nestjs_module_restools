import { BadRequestException, ExecutionContext, Logger, createParamDecorator } from '@nestjs/common'
import { Request } from 'express'
import { ParsedQs } from 'qs'

export const DEFAULT_SEARCH_OPTIONS = {
  loggerType: 'FilterOptionsControl',
  defaultLimit: 10,
  limitKey: 'limit',
  skipKey: 'skip',
  pageKey: 'page',
  sortKey: 'sort',
  allowUnlimited: false,
}

export interface FilterSearchOptions {
  loggerType?: string
  defaultLimit?: number
  limitKey?: string
  skipKey?: string
  pageKey?: string
  sortKey?: string
  allowUnlimited?: boolean,
}

type ResolvedFilterSearchOptions = Required<typeof DEFAULT_SEARCH_OPTIONS>

export interface SortOptions {
  [key: string]: 'asc' | 'desc' | 1 | -1
}

export const DEFAULT_FILTER_OPTIONS = {
  limit: DEFAULT_SEARCH_OPTIONS.defaultLimit,
  skip: 0,
  sort: {},
}

export interface FilterOptions {
  limit?: number
  skip: number
  sort: SortOptions
}

/* istanbul ignore next */
export const SearchFilterOptions = createParamDecorator((options: FilterSearchOptions, ctx: ExecutionContext): FilterOptions => {
  options = { ...DEFAULT_SEARCH_OPTIONS, ...options }
  const req = ctx.switchToHttp().getRequest<Request>()

  try {
    return filterOptions(req.query, options)
  } catch (error) {
    throw new BadRequestException(error instanceof Error ? error.message : String(error))
  }
})

export function filterOptions(
  queries: ParsedQs,
  options?: FilterSearchOptions,
): FilterOptions {
  const resolved = { ...DEFAULT_SEARCH_OPTIONS, ...options } as ResolvedFilterSearchOptions
  let limit: number | undefined = parseInt(`${queries[resolved.limitKey]}`) || resolved.defaultLimit
  if (limit === -1 && resolved.allowUnlimited) limit = undefined
  let skip = parseInt(`${queries[resolved.skipKey]}`) || 0

  if (queries[resolved.pageKey]) {
    if (skip > 0) Logger.debug(`Both ${resolved.skipKey} and ${resolved.pageKey} are set. ${resolved.skipKey} will be ignored`, resolved.loggerType)
    skip = (parseInt(`${queries[resolved.pageKey]}`) - 1) * (limit ?? resolved.defaultLimit)
  }

  const sort: SortOptions = {}
  const sortQuery = queries[resolved.sortKey]
  if (sortQuery && typeof sortQuery === 'object' && !Array.isArray(sortQuery)) {
    for (const key in sortQuery as ParsedQs) {
      switch (`${sortQuery[key]}`.toLowerCase()) {
        case '1':
        case 'asc':
          sort[key] = 1
          break

        case '-1':
        case 'desc':
          sort[key] = -1
          break
      }
    }
  }

  return {
    limit,
    skip,
    sort,
  }
}
