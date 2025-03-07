import { getExhibit } from '../api'

export const fetchExhibitionData = async () => {
  const response = await getExhibit({
    validateStatus: (status) => status == 200,
  })
  if (response.status === 200 && response.data && response.data.items) {
    const { freeTables, items: exhibits } = response.data
    return {
      exhibits,
      freeTables,
    }
  }
}
