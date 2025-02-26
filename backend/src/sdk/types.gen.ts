// This file is auto-generated by @hey-api/openapi-ts

export type PostAuthLogoutData = {
  body?: never
  path?: never
  query?: never
  url: '/auth/logout'
}

export type PostAuthLogoutResponses = {
  /**
   * The user was logged out and the session was destroyed
   */
  204: void
}

export type PostAuthLogoutResponse =
  PostAuthLogoutResponses[keyof PostAuthLogoutResponses]

export type PostUserLoginData = {
  body: {
    email: string
    password: string
  }
  path?: never
  query?: never
  url: '/user/login'
}

export type PostUserLoginErrors = {
  /**
   * Invalid input parameter(s).
   */
  400: {
    error?: string
    [key: string]: unknown | string | undefined
  }
  /**
   * Invalid email address or password
   */
  401: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PostUserLoginError = PostUserLoginErrors[keyof PostUserLoginErrors]

export type PostUserLoginResponses = {
  /**
   * The user was logged in
   */
  200: {
    id: number
    nickname?: string
    fullName?: string
    email: string
    bio?: string
    contacts?: {
      phone?: string
      website?: string
      mastodon?: string
    }
    isAdministrator: boolean
    tables?: Array<number>
    exhibits?: Array<{
      title?: string
      text?: string
      table?: number
    }>
    token?: string
  }
}

export type PostUserLoginResponse =
  PostUserLoginResponses[keyof PostUserLoginResponses]

export type GetUserProfileData = {
  body?: never
  path?: never
  query?: never
  url: '/user/profile'
}

export type GetUserProfileErrors = {
  /**
   * Not logged in.
   */
  401: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type GetUserProfileError =
  GetUserProfileErrors[keyof GetUserProfileErrors]

export type GetUserProfileResponses = {
  /**
   * The profile of the currently logged in user is returned
   */
  200: {
    id: number
    nickname?: string
    fullName?: string
    email: string
    bio?: string
    contacts?: {
      phone?: string
      website?: string
      mastodon?: string
    }
    isAdministrator: boolean
    tables?: Array<number>
    exhibits?: Array<{
      title?: string
      text?: string
      table?: number
    }>
  }
}

export type GetUserProfileResponse =
  GetUserProfileResponses[keyof GetUserProfileResponses]

export type PatchUserProfileData = {
  body?: {
    fullName?: string
    email?: string
    bio?: string
    contacts?: {
      phone?: string
      website?: string
      mastodon?: string
    }
    password?: string
  }
  path?: never
  query?: never
  url: '/user/profile'
}

export type PatchUserProfileErrors = {
  /**
   * The user account could not be updated.
   */
  400: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PatchUserProfileError =
  PatchUserProfileErrors[keyof PatchUserProfileErrors]

export type PatchUserProfileResponses = {
  /**
   * The user account was updated
   */
  200: {
    id: number
    nickname?: string
    fullName?: string
    email: string
    bio?: string
    contacts?: {
      phone?: string
      website?: string
      mastodon?: string
    }
    isAdministrator: boolean
    tables?: Array<number>
    exhibits?: Array<{
      title?: string
      text?: string
      table?: number
    }>
  }
}

export type PatchUserProfileResponse =
  PatchUserProfileResponses[keyof PatchUserProfileResponses]

export type GetUserData = {
  body?: never
  path?: never
  query?: never
  url: '/user/'
}

export type GetUserResponses = {
  /**
   * The user list is returned
   */
  200: {
    items?: Array<{
      id: number
      nickname?: string
      fullName?: string
      email: string
      bio?: string
      contacts?: {
        phone?: string
        website?: string
        mastodon?: string
      }
      isAdministrator: boolean
      tables?: Array<number>
      exhibits?: Array<{
        title?: string
        text?: string
        table?: number
      }>
    }>
    total?: number
  }
}

export type GetUserResponse = GetUserResponses[keyof GetUserResponses]

export type GetUserByIdData = {
  body?: never
  path: {
    /**
     * Username, email address or ID of the user to look up
     */
    id: string
  }
  query?: never
  url: '/user/{id}'
}

export type GetUserByIdErrors = {
  /**
   * No user was found matching the given ID
   */
  404: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type GetUserByIdError = GetUserByIdErrors[keyof GetUserByIdErrors]

export type GetUserByIdResponses = {
  /**
   * The profile of the user is returned
   */
  200: {
    id: number
    nickname?: string
    fullName?: string
    email: string
    bio?: string
    contacts?: {
      phone?: string
      website?: string
      mastodon?: string
    }
    isAdministrator: boolean
    tables?: Array<number>
    exhibits?: Array<{
      title?: string
      text?: string
      table?: number
    }>
  }
}

export type GetUserByIdResponse =
  GetUserByIdResponses[keyof GetUserByIdResponses]

export type GetExhibitData = {
  body?: never
  path?: never
  query?: never
  url: '/exhibit/'
}

export type GetExhibitResponses = {
  /**
   * One page of exhibits
   */
  200: {
    items?: Array<{
      /**
       * Unique id of the exhibit
       */
      id: number
      /**
       * Title
       */
      title: string
      /**
       * Description
       */
      text?: string
      /**
       * User ID of the exhibitor
       */
      exhibitorId: number
      /**
       * Name of the exhibitor
       */
      exhibitorName: string
      /**
       * Table number, if assigned to a specific table
       */
      table?: number | null
    }>
    total?: number
  }
}

export type GetExhibitResponse = GetExhibitResponses[keyof GetExhibitResponses]

export type PostExhibitData = {
  body: {
    title: string
    text?: string
    table?: number
  }
  path?: never
  query?: never
  url: '/exhibit/'
}

export type PostExhibitErrors = {
  /**
   * Not logged in
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PostExhibitError = PostExhibitErrors[keyof PostExhibitErrors]

export type PostExhibitResponses = {
  /**
   * The exhibit was created
   */
  200: {
    id: number
    title: string
    text?: string
    table?: number
    exhibitor: {
      fullName?: string
      email?: string
      bio?: string
      contacts?: {
        phone?: string
        website?: string
        mastodon?: string
      }
      id?: number
      exhibitorId?: string
    }
  }
}

export type PostExhibitResponse =
  PostExhibitResponses[keyof PostExhibitResponses]

export type GetExhibitByIdData = {
  body?: never
  path: {
    id: number
  }
  query?: never
  url: '/exhibit/{id}'
}

export type GetExhibitByIdErrors = {
  /**
   * The exhibit does not exist
   */
  404: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type GetExhibitByIdError =
  GetExhibitByIdErrors[keyof GetExhibitByIdErrors]

export type GetExhibitByIdResponses = {
  /**
   * The exhibit was found
   */
  200: {
    id: number
    title: string
    text?: string
    table?: number
    exhibitor: {
      fullName?: string
      email?: string
      bio?: string
      contacts?: {
        phone?: string
        website?: string
        mastodon?: string
      }
      id?: number
      exhibitorId?: string
    }
  }
}

export type GetExhibitByIdResponse =
  GetExhibitByIdResponses[keyof GetExhibitByIdResponses]

export type PatchExhibitByIdData = {
  body?: {
    title?: string
    text?: string
    table?: number
  }
  path: {
    id: number
  }
  query?: never
  url: '/exhibit/{id}'
}

export type PatchExhibitByIdErrors = {
  /**
   * The current user does not own this exhibit
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PatchExhibitByIdError =
  PatchExhibitByIdErrors[keyof PatchExhibitByIdErrors]

export type PatchExhibitByIdResponses = {
  /**
   * The exhibit was updated
   */
  204: void
}

export type PatchExhibitByIdResponse =
  PatchExhibitByIdResponses[keyof PatchExhibitByIdResponses]

export type GetTableByNumberData = {
  body?: never
  path: {
    /**
     * Number of the table to inspect
     */
    number: number
  }
  query?: never
  url: '/table/{number}'
}

export type GetTableByNumberErrors = {
  /**
   * Default Response
   */
  404: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type GetTableByNumberError =
  GetTableByNumberErrors[keyof GetTableByNumberErrors]

export type GetTableByNumberResponses = {
  /**
   * Owner of the table
   */
  200: {
    exhibitor?:
      | {
          id: number
          nickname?: string
          fullName?: string
          email: string
          bio?: string
          contacts?: {
            phone?: string
            website?: string
            mastodon?: string
          }
          isAdministrator: boolean
        }
      | unknown
  }
}

export type GetTableByNumberResponse =
  GetTableByNumberResponses[keyof GetTableByNumberResponses]

export type PostTableByNumberClaimData = {
  body?: never
  path: {
    /**
     * Number of the table to claim
     */
    number: number
  }
  query?: never
  url: '/table/{number}/claim'
}

export type PostTableByNumberClaimErrors = {
  /**
   * The table is already claimed by another user
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PostTableByNumberClaimError =
  PostTableByNumberClaimErrors[keyof PostTableByNumberClaimErrors]

export type PostTableByNumberClaimResponses = {
  /**
   * The table was claimed
   */
  204: void
}

export type PostTableByNumberClaimResponse =
  PostTableByNumberClaimResponses[keyof PostTableByNumberClaimResponses]

export type PostTableByNumberReleaseData = {
  body?: never
  path: {
    /**
     * Number of the table to release
     */
    number: number
  }
  query?: never
  url: '/table/{number}/release'
}

export type PostTableByNumberReleaseErrors = {
  /**
   * The table is not claimed by the current user
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PostTableByNumberReleaseError =
  PostTableByNumberReleaseErrors[keyof PostTableByNumberReleaseErrors]

export type PostTableByNumberReleaseResponses = {
  /**
   * The table was released
   */
  204: void
}

export type PostTableByNumberReleaseResponse =
  PostTableByNumberReleaseResponses[keyof PostTableByNumberReleaseResponses]

export type PostTableByNumberAssignToByUserIdData = {
  body?: never
  path: {
    /**
     * Number of the table to assign
     */
    number: number
    /**
     * Username or id of the user
     */
    userId: string
  }
  query?: never
  url: '/table/{number}/assign-to/{userId}'
}

export type PostTableByNumberAssignToByUserIdErrors = {
  /**
   * Current user does not have administrative rights
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PostTableByNumberAssignToByUserIdError =
  PostTableByNumberAssignToByUserIdErrors[keyof PostTableByNumberAssignToByUserIdErrors]

export type PostTableByNumberAssignToByUserIdResponses = {
  /**
   * The table was claimed
   */
  204: void
}

export type PostTableByNumberAssignToByUserIdResponse =
  PostTableByNumberAssignToByUserIdResponses[keyof PostTableByNumberAssignToByUserIdResponses]

export type GetRegistrationByEventIdData = {
  body?: never
  path: {
    /**
     * ID of the event to register for
     */
    eventId: string
  }
  query?: never
  url: '/registration/{eventId}'
}

export type GetRegistrationByEventIdErrors = {
  /**
   * Current user does not have administrative rights
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type GetRegistrationByEventIdError =
  GetRegistrationByEventIdErrors[keyof GetRegistrationByEventIdErrors]

export type GetRegistrationByEventIdResponses = {
  /**
   * List of registrations
   */
  200: {
    /**
     * Total number of registrations
     */
    total?: number
    /**
     * List of registrations
     */
    items?: Array<{
      /**
       * Unique ID of the registration
       */
      id: number
      /**
       * Timestamp when the registration was created
       */
      createdAt: string
      updatedAt?: string | unknown
      status: 'new' | 'approved' | 'rejected'
      name: string
      email: string
      nickname?: string
      topic?: string
      message?: string
      notes?: string
      data: {
        [key: string]: unknown
      }
    }>
  }
}

export type GetRegistrationByEventIdResponse =
  GetRegistrationByEventIdResponses[keyof GetRegistrationByEventIdResponses]

export type PostRegistrationByEventIdData = {
  /**
   * Registration data, the data field contains event specific properties
   */
  body: {
    name: string
    email: string
    nickname: string
    topic?: string
    message?: string
    notes?: string
    data?: {
      [key: string]: unknown
    }
  }
  path: {
    /**
     * ID of the event to register for
     */
    eventId: string
  }
  query?: never
  url: '/registration/{eventId}'
}

export type PostRegistrationByEventIdErrors = {
  /**
   * The email address is already registered for the given event
   */
  409: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PostRegistrationByEventIdError =
  PostRegistrationByEventIdErrors[keyof PostRegistrationByEventIdErrors]

export type PostRegistrationByEventIdResponses = {
  /**
   * The registration was created
   */
  200: {
    /**
     * Unique ID of the registration
     */
    id: number
    /**
     * Timestamp when the registration was created
     */
    createdAt: string
    updatedAt?: string | unknown
    status: 'new' | 'approved' | 'rejected'
    name: string
    email: string
    nickname?: string
    topic?: string
    message?: string
    notes?: string
    data: {
      [key: string]: unknown
    }
  }
}

export type PostRegistrationByEventIdResponse =
  PostRegistrationByEventIdResponses[keyof PostRegistrationByEventIdResponses]

export type DeleteRegistrationByEventIdByRegistrationIdData = {
  body?: never
  path: {
    /**
     * ID of the event
     */
    eventId: string
    /**
     * ID of the registration to update
     */
    registrationId: number
  }
  query?: never
  url: '/registration/{eventId}/{registrationId}'
}

export type DeleteRegistrationByEventIdByRegistrationIdErrors = {
  /**
   * Current user does not have administrative rights
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
  /**
   * Registration not found
   */
  404: {
    error?: string
    [key: string]: unknown | string | undefined
  }
  /**
   * Cannot delete an approved registration
   */
  409: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type DeleteRegistrationByEventIdByRegistrationIdError =
  DeleteRegistrationByEventIdByRegistrationIdErrors[keyof DeleteRegistrationByEventIdByRegistrationIdErrors]

export type DeleteRegistrationByEventIdByRegistrationIdResponses = {
  /**
   * The registration was updated
   */
  204: void
}

export type DeleteRegistrationByEventIdByRegistrationIdResponse =
  DeleteRegistrationByEventIdByRegistrationIdResponses[keyof DeleteRegistrationByEventIdByRegistrationIdResponses]

export type GetRegistrationByEventIdByRegistrationIdData = {
  body?: never
  path: {
    /**
     * ID of the event
     */
    eventId: string
    /**
     * ID of the registration to update
     */
    registrationId: number
  }
  query?: never
  url: '/registration/{eventId}/{registrationId}'
}

export type GetRegistrationByEventIdByRegistrationIdErrors = {
  /**
   * Current user does not have administrative rights
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
  /**
   * Registration not found
   */
  404: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type GetRegistrationByEventIdByRegistrationIdError =
  GetRegistrationByEventIdByRegistrationIdErrors[keyof GetRegistrationByEventIdByRegistrationIdErrors]

export type GetRegistrationByEventIdByRegistrationIdResponses = {
  /**
   * Registration data
   */
  200: {
    /**
     * Unique ID of the registration
     */
    id: number
    /**
     * Timestamp when the registration was created
     */
    createdAt: string
    updatedAt?: string | unknown
    status: 'new' | 'approved' | 'rejected'
    name: string
    email: string
    nickname?: string
    topic?: string
    message?: string
    notes?: string
    data: {
      [key: string]: unknown
    }
  }
}

export type GetRegistrationByEventIdByRegistrationIdResponse =
  GetRegistrationByEventIdByRegistrationIdResponses[keyof GetRegistrationByEventIdByRegistrationIdResponses]

export type PatchRegistrationByEventIdByRegistrationIdData = {
  /**
   * Updated registration data
   */
  body?: {
    name?: string
    email?: string
    nickname?: string
    topic?: string
    message?: string
    notes?: string
    data?: {
      [key: string]: unknown
    }
  }
  path: {
    /**
     * ID of the event
     */
    eventId: string
    /**
     * ID of the registration to update
     */
    registrationId: number
  }
  query?: never
  url: '/registration/{eventId}/{registrationId}'
}

export type PatchRegistrationByEventIdByRegistrationIdErrors = {
  /**
   * Current user does not have administrative rights
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
  /**
   * Registration not found
   */
  404: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PatchRegistrationByEventIdByRegistrationIdError =
  PatchRegistrationByEventIdByRegistrationIdErrors[keyof PatchRegistrationByEventIdByRegistrationIdErrors]

export type PatchRegistrationByEventIdByRegistrationIdResponses = {
  /**
   * The registration was updated
   */
  204: void
}

export type PatchRegistrationByEventIdByRegistrationIdResponse =
  PatchRegistrationByEventIdByRegistrationIdResponses[keyof PatchRegistrationByEventIdByRegistrationIdResponses]

export type PutRegistrationByEventIdByRegistrationIdApproveData = {
  body?: never
  path: {
    /**
     * ID of the event
     */
    eventId: string
    /**
     * ID of the registration to update
     */
    registrationId: number
  }
  query?: never
  url: '/registration/{eventId}/{registrationId}/approve'
}

export type PutRegistrationByEventIdByRegistrationIdApproveErrors = {
  /**
   * Current user does not have administrative rights
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
  /**
   * Registration not found
   */
  404: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PutRegistrationByEventIdByRegistrationIdApproveError =
  PutRegistrationByEventIdByRegistrationIdApproveErrors[keyof PutRegistrationByEventIdByRegistrationIdApproveErrors]

export type PutRegistrationByEventIdByRegistrationIdApproveResponses = {
  /**
   * The registration was updated
   */
  204: void
}

export type PutRegistrationByEventIdByRegistrationIdApproveResponse =
  PutRegistrationByEventIdByRegistrationIdApproveResponses[keyof PutRegistrationByEventIdByRegistrationIdApproveResponses]

export type PutRegistrationByEventIdByRegistrationIdRejectData = {
  body?: never
  path: {
    /**
     * ID of the event
     */
    eventId: string
    /**
     * ID of the registration to update
     */
    registrationId: number
  }
  query?: never
  url: '/registration/{eventId}/{registrationId}/reject'
}

export type PutRegistrationByEventIdByRegistrationIdRejectErrors = {
  /**
   * Current user does not have administrative rights
   */
  403: {
    error?: string
    [key: string]: unknown | string | undefined
  }
  /**
   * Registration not found
   */
  404: {
    error?: string
    [key: string]: unknown | string | undefined
  }
}

export type PutRegistrationByEventIdByRegistrationIdRejectError =
  PutRegistrationByEventIdByRegistrationIdRejectErrors[keyof PutRegistrationByEventIdByRegistrationIdRejectErrors]

export type PutRegistrationByEventIdByRegistrationIdRejectResponses = {
  /**
   * The registration was updated
   */
  204: void
}

export type PutRegistrationByEventIdByRegistrationIdRejectResponse =
  PutRegistrationByEventIdByRegistrationIdRejectResponses[keyof PutRegistrationByEventIdByRegistrationIdRejectResponses]

export type ClientOptions = {
  baseURL: `${string}://${string}/api` | (string & {})
}
