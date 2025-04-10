import { expect, describe } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login, Session } from '../../test/server.js'
import { HostInput, Host } from '../../generated/graphql.js'

const createHost = async (
  graphqlRequest: ExecuteOperationFunction,
  input: { name: string } & HostInput,
  session: Session,
): Promise<Host> => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreateHost($name: String!, $input: HostInput!) {
        addHost(name: $name, input: $input) {
          id
          name
          ipAddress
          exhibitor {
            id
          }
          exhibit {
            id
          }
        }
      }
    `),
    {
      name: input.name,
      input: {
        ipAddress: input.ipAddress,
        exhibitorId: input.exhibitorId,
        exhibitId: input.exhibitId,
      },
    },
    session,
  )
  expect(result.errors).toBeUndefined()
  return result.data!.addHost as Host
}

describe('host', () => {
  graphqlTest('list all hosts', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        query GetHosts {
          getHosts {
            id
            name
            ipAddress
            exhibitor {
              id
            }
            exhibit {
              id
            }
          }
        }
      `),
    )
    expect(result.errors).toBeUndefined()
    expect(result.data!.getHosts).toBeDefined()
  })

  graphqlTest('try making updates without being logged in', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        mutation UpdateHost($name: String!, $input: HostInput!) {
          updateHost(name: $name, input: $input) {
            id
          }
        }
      `),
      { name: 'test-host', input: { ipAddress: '192.168.1.1' } },
    )
    expect(result.errors![0].message).toBe('Only administrators can set IP address or exhibitor')
  })

  graphqlTest('host CRUD operations', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const user = await login('daffy@example.com')

    // Create a host as admin
    const host = await createHost(
      graphqlRequest,
      {
        name: 'nu-host',
        ipAddress: '192.168.1.2',
      },
      admin,
    )

    // Verify host was created
    expect(host.name).toBe('nu-host')
    expect(host.ipAddress).toBe('192.168.1.2')

    // Try to update host as non-admin
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdateHost($name: String!, $input: HostInput!) {
            updateHost(name: $name, input: $input) {
              id
              name
              ipAddress
            }
          }
        `),
        { name: 'nu-host', input: { ipAddress: '192.168.1.3' } as HostInput },
        user,
      )
      expect(result.errors![0].message).toBe('Only administrators can set IP address or exhibitor')
    }

    // Update host as admin
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdateHost($name: String!, $input: HostInput!) {
            updateHost(name: $name, input: $input) {
              id
              name
              ipAddress
            }
          }
        `),
        { name: 'nu-host', input: { ipAddress: '192.168.1.3' } as HostInput },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updateHost!.ipAddress).toBe('192.168.1.3')
    }

    // Delete host
    {
      const result = await graphqlRequest(
        graphql(`
          mutation DeleteHost($name: String!) {
            deleteHost(name: $name)
          }
        `),
        { name: 'nu-host' },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.deleteHost).toBe(true)
    }

    // Verify host is deleted
    {
      const result = await graphqlRequest(
        graphql(`
          query GetHost($name: String!) {
            getHost(name: $name) {
              id
            }
          }
        `),
        { name: 'nu-host' },
      )
      expect(result.errors![0].message).toMatch(/^Host not found/)
    }
  })

  graphqlTest('nonexistent host', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        query GetHost($name: String!) {
          getHost(name: $name) {
            id
          }
        }
      `),
      { name: 'nonexistent-host' },
    )
    expect(result.errors![0].message).toMatch(/^Host not found/)
  })

  graphqlTest('create host with automatic IP allocation', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const host = await createHost(
      graphqlRequest,
      {
        name: 'auto-ip-host',
      },
      admin,
    )
    expect(host.name).toBe('auto-ip-host')
    expect(host.ipAddress).toBeDefined()
  })
})
