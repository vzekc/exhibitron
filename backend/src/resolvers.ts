import { commonResolvers } from './modules/common/resolvers.js'
import { userResolvers } from './modules/user/resolvers.js'
import { exhibitionResolvers } from './modules/exhibition/resolvers.js'
import { exhibitorResolvers } from './modules/exhibitor/resolvers.js'
import { exhibitResolvers } from './modules/exhibit/resolvers.js'
import { tableResolvers } from './modules/table/resolvers.js'
import { registrationResolvers } from './modules/registration/resolvers.js'
import { pageResolvers } from './modules/page/resolvers.js'
import { attributeResolvers } from './modules/attribute/resolvers.js'
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
  attributeResolvers,
])

export default resolvers
