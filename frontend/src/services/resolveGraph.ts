type Entity = { id: number };

const resolveGraph = <T extends Entity>(entities: T[]): T[] => {
  // Create a map of all entities by ID
  const entityMap = new Map<string, T>(entities.map((e) => [`${e.constructor.name}:${e.id}`, e]))

  // Recursive reference resolver
  const resolveReferences = (obj: unknown): unknown =>
    Array.isArray(obj)
      ? obj.map(resolveReferences)
      : obj && typeof obj === 'object'
        ? 'id' in (obj as Entity) && Object.keys(obj).length === 1
          ? entityMap.get(`${(obj as Entity).constructor.name}:${(obj as Entity).id}`) || obj
          : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, resolveReferences(v)]))
        : obj

  // Process all entities
  entities.forEach(entity => {
    Object.entries(entity).forEach(([key, value]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entity as any)[key] = resolveReferences(value)
    })
  })

  return entities
}

// Example Usage:
interface User extends Entity {
  name: string;
  bestFriend?: User;
  friends?: User[];
}

const response = {
  data: {
    users: [
      { id: 1, name: 'Alice', bestFriend: { id: 2 } },
      { id: 2, name: 'Bob', bestFriend: { id: 1 } },
      { id: 3, name: 'Charlie', friends: [{ id: 1 }, { id: 2 }] }
    ]
  }
}

const users = response.data.users as User[]
const resolvedUsers = resolveGraph(users)

console.log(resolvedUsers)
