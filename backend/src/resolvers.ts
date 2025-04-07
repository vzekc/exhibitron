import { commonResolvers } from './modules/common/resolvers.js'
import { userResolvers } from './modules/user/resolvers.js'
import { exhibitionResolvers } from './modules/exhibition/resolvers.js'
import { exhibitorResolvers } from './modules/exhibitor/resolvers.js'
import { exhibitResolvers } from './modules/exhibit/resolvers.js'
import { tableResolvers } from './modules/table/resolvers.js'
import { registrationResolvers } from './modules/registration/resolvers.js'
import { pageResolvers } from './modules/page/resolvers.js'
import { exhibitAttributeResolvers } from './modules/exhibitAttribute/resolvers.js'
import { youtubeResolvers } from './modules/youtube/resolver.js'
import { roomResolvers } from './modules/room/resolvers.js'
import { conferenceSessionResolvers } from './modules/conferenceSession/resolvers.js'
import { mergeResolvers } from '@graphql-tools/merge'
import { Resolvers } from './generated/graphql.js'

const resolvers: Resolvers = mergeResolvers([
  commonResolvers,
  userResolvers,
  exhibitionResolvers,
  exhibitorResolvers,
  exhibitResolvers,
  tableResolvers,
  registrationResolvers,
  pageResolvers,
  exhibitAttributeResolvers,
  youtubeResolvers,
  roomResolvers,
  conferenceSessionResolvers,
])

export default resolvers
