import { getUserProfile } from '../api'

type GetUserProfileResponse = Awaited<ReturnType<typeof getUserProfile>>['data']

export const fetchUserProfile =
  async (): Promise<GetUserProfileResponse | null> => {
    const response = await getUserProfile({
      validateStatus: (status) => status == 200 || status == 401,
    })
    if (response.status === 200) {
      return response.data
    } else {
      return null
    }
  }
