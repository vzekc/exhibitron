import * as backend from './api/index'

export type Exhibit = NonNullable<
  Awaited<ReturnType<typeof backend.getExhibitById>>['data']
>

export type ExhibitListItem = NonNullable<
  NonNullable<Awaited<ReturnType<typeof backend.getExhibit>>['data']>['items']
>[number]

export type User = NonNullable<
  Awaited<ReturnType<typeof backend.getUserProfile>>['data']
>
