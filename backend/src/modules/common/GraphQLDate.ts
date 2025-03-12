import { GraphQLScalarType, Kind } from 'graphql'

const GraphQLDate = new GraphQLScalarType({
  name: 'Date',
  description: 'Custom Date scalar type',
  parseValue(value) {
    if (typeof value !== 'string') {
      return null
    }
    return new Date(value as string)
  },
  serialize(value) {
    return value instanceof Date ? value.toISOString() : null
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value)
    }
    return null
  },
})

export default GraphQLDate
