import { useParams } from 'react-router-dom'

const useMandatoryParams = <T extends Record<string, string>>() => {
  const params = useParams<T>()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      throw new Error(`Missing mandatory path parameter: ${key}`)
    }
  }
  return params as T
}

export default useMandatoryParams
