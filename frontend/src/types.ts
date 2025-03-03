import * as backend from './api/index'

export type Exhibit = NonNullable<
  Awaited<ReturnType<typeof backend.getExhibitById>>['data']
>

export type ExhibitListItem = NonNullable<
  NonNullable<Awaited<ReturnType<typeof backend.getExhibit>>['data']>['items']
>[number]

export type User = NonNullable<
  Awaited<ReturnType<typeof backend.getUserCurrent>>['data']
>

type TableData = {
  exhibits: Exhibit[]
  exhibitor?: User
}

export type ExhibitionData = {
  tables: Record<number, TableData>
  freeTables: number[]
  exhibitors: User[]
  exhibits: Exhibit[]
}
