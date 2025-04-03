import { Context } from '../../app/context.js'
import { QueryResolvers } from '../../generated/graphql.js'
import { YouTubeService } from './service.js'

export const youtubeQueries: QueryResolvers<Context> = {
  lookupYouTubeChannels: async (_, { query }) => {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY environment variable is not set')
    }
    const youtubeService = new YouTubeService(apiKey)
    return youtubeService.searchChannels(query)
  },
}

export const youtubeResolvers = {
  Query: youtubeQueries,
}
