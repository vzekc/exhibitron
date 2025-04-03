export interface YouTubeThumbnail {
  url: string
}

export interface YouTubeThumbnails {
  default: YouTubeThumbnail
  medium: YouTubeThumbnail
  high: YouTubeThumbnail
}

export interface YouTubeChannel {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnailUrl: string
  customUrl?: string
  handleUrl?: string
}

export interface YouTubeSearchResponse {
  items: Array<{
    id: {
      kind: string
      channelId: string
    }
    snippet: {
      publishedAt: string
      channelId: string
      title: string
      description: string
      thumbnails: {
        default: { url: string }
        medium: { url: string }
        high: { url: string }
      }
      channelTitle: string
      liveBroadcastContent: string
      publishTime: string
    }
  }>
}

export interface YouTubeChannelDetailsResponse {
  items: Array<{
    id: string
    snippet: {
      customUrl?: string
    }
    brandingSettings?: {
      channel?: {
        handle?: string
      }
    }
  }>
}
