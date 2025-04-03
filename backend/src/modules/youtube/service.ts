import axios from 'axios'
import { YouTubeChannel, YouTubeChannelDetailsResponse, YouTubeSearchResponse } from './types.js'

export class YouTubeService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async searchChannels(query: string): Promise<YouTubeChannel[]> {
    const response = await axios.get<YouTubeSearchResponse>(`${this.baseUrl}/search`, {
      params: {
        part: 'snippet',
        q: query,
        type: 'channel',
        key: this.apiKey,
      },
    })

    const channelIds = response.data.items.map((item) => item.id.channelId)
    const channelDetails = await this.getChannelDetails(channelIds)

    return response.data.items.map((item) => {
      const channelDetail = channelDetails.find((detail) => detail.id === item.id.channelId)
      const customUrl = channelDetail?.snippet.customUrl
      const handle = channelDetail?.brandingSettings?.channel?.handle
      let channelUrl = `https://youtube.com/channel/${item.id.channelId}`
      if (handle) {
        channelUrl = `https://youtube.com/@${handle}`
      } else if (customUrl?.startsWith('@')) {
        channelUrl = `https://youtube.com/${customUrl}`
      } else if (customUrl) {
        channelUrl = `https://youtube.com/c/${customUrl}`
      }
      return {
        id: item.id.channelId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.default.url,
        channelUrl,
      }
    })
  }

  private async getChannelDetails(
    channelIds: string[],
  ): Promise<YouTubeChannelDetailsResponse['items']> {
    const response = await axios.get<YouTubeChannelDetailsResponse>(`${this.baseUrl}/channels`, {
      params: {
        part: 'snippet,brandingSettings',
        id: channelIds.join(','),
        key: this.apiKey,
      },
    })
    return response.data.items
  }
}
