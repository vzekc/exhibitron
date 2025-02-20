import * as backend from '../api/index'
import { client as backendClient } from '../api/client.gen'
import type { ExhibitListItem } from '../types.ts'

backendClient.setConfig({
  baseURL: '/api',
})

class ExhibitListService {
  private cache: ExhibitListItem[] | null = null

  async fetchExhibits() {
    if (this.cache) {
      return this.cache
    }
    const res = await backend.getExhibit()
    this.cache = res.data?.items || []
    return this.cache
  }
}

const exhibitListService = new ExhibitListService()
export default exhibitListService
