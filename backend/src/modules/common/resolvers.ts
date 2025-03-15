import { GraphQLJSON } from 'graphql-type-json'
import GraphQLDate from './GraphQLDate.js'

export const commonResolvers = {
  JSON: GraphQLJSON,
  Date: GraphQLDate,
}
