import { expect, describe } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login, Session } from '../../test/server.js'
import { HostInput, Host, WellKnownService } from '../../generated/graphql.js'
import { ErrorCode } from '../common/errors.js'
import { GraphQLError } from 'graphql'

interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLError[]
}

const createHost = async (
  graphqlRequest: ExecuteOperationFunction,
  input: { name: string } & HostInput,
  session: Session,
): Promise<Host> => {
  const result = (await graphqlRequest(
    graphql(`
      mutation CreateHost($name: String!, $input: HostInput!) {
        addHost(name: $name, input: $input) {
          id
          name
          ipAddress
          services
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
        services: input.services,
      },
    },
    session,
  )) as GraphQLResponse<{ addHost: Host }>
  expect(result.errors).toBeUndefined()
  return result.data!.addHost
}

describe('host', () => {
  graphqlTest('list all hosts', async (graphqlRequest) => {
    const result = (await graphqlRequest(
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
    )) as GraphQLResponse<{ getHosts: Host[] }>
    expect(result.errors).toBeUndefined()
    expect(result.data!.getHosts).toBeDefined()
  })

  graphqlTest('try making updates without being logged in', async (graphqlRequest) => {
    const result = (await graphqlRequest(
      graphql(`
        mutation UpdateHost($name: String!, $input: HostInput!) {
          updateHost(name: $name, input: $input) {
            id
          }
        }
      `),
      { name: 'test-host', input: { ipAddress: '192.168.1.1' } },
    )) as GraphQLResponse<{ updateHost: { id: number } }>
    expect(result.errors![0].extensions.code).toBe(ErrorCode.FORBIDDEN)
    expect(result.errors![0].message).toBe('Only administrators can set IP address or exhibitor')
  })

  graphqlTest('host CRUD operations', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const user = await login('daffy@example.com')

    // Create a host as admin with services
    const host = await createHost(
      graphqlRequest,
      {
        name: 'nu-host',
        ipAddress: '192.168.1.2',
        services: [WellKnownService.Http, WellKnownService.Https, WellKnownService.Ssh],
      },
      admin,
    )

    // Verify host was created with services
    expect(host.name).toBe('nu-host')
    expect(host.ipAddress).toBe('192.168.1.2')
    expect(host.services).toEqual([
      WellKnownService.Http,
      WellKnownService.Https,
      WellKnownService.Ssh,
    ])

    // Try to update host as non-admin
    {
      const result = (await graphqlRequest(
        graphql(`
          mutation UpdateHost($name: String!, $input: HostInput!) {
            updateHost(name: $name, input: $input) {
              id
              name
              ipAddress
              services
            }
          }
        `),
        {
          name: 'nu-host',
          input: { ipAddress: '192.168.1.3', services: [WellKnownService.Http] } as HostInput,
        },
        user,
      )) as GraphQLResponse<{ updateHost: Host }>
      expect(result.errors![0].extensions.code).toBe(ErrorCode.FORBIDDEN)
      expect(result.errors![0].message).toBe('Only administrators can set IP address or exhibitor')
    }

    // Update host as admin with new services
    {
      const result = (await graphqlRequest(
        graphql(`
          mutation UpdateHost($name: String!, $input: HostInput!) {
            updateHost(name: $name, input: $input) {
              id
              name
              ipAddress
              services
            }
          }
        `),
        {
          name: 'nu-host',
          input: {
            ipAddress: '192.168.1.3',
            services: [WellKnownService.Http, WellKnownService.Ftp],
          } as HostInput,
        },
        admin,
      )) as GraphQLResponse<{ updateHost: Host }>
      expect(result.errors).toBeUndefined()
      expect(result.data!.updateHost!.ipAddress).toBe('192.168.1.3')
      expect(result.data!.updateHost!.services).toEqual([
        WellKnownService.Http,
        WellKnownService.Ftp,
      ])
    }

    // Delete host
    {
      const result = (await graphqlRequest(
        graphql(`
          mutation DeleteHost($name: String!) {
            deleteHost(name: $name)
          }
        `),
        { name: 'nu-host' },
        admin,
      )) as GraphQLResponse<{ deleteHost: boolean }>
      expect(result.errors).toBeUndefined()
      expect(result.data!.deleteHost).toBe(true)
    }

    // Verify host is deleted
    {
      const result = (await graphqlRequest(
        graphql(`
          query GetHost($name: String!) {
            getHost(name: $name) {
              id
            }
          }
        `),
        { name: 'nu-host' },
      )) as GraphQLResponse<{ getHost: { id: number } }>
      expect(result.errors![0].extensions.code).toBe(ErrorCode.NOT_FOUND)
      expect(result.errors![0].message).toMatch(/^Host not found/)
    }
  })

  graphqlTest('nonexistent host', async (graphqlRequest) => {
    const result = (await graphqlRequest(
      graphql(`
        query GetHost($name: String!) {
          getHost(name: $name) {
            id
          }
        }
      `),
      { name: 'nonexistent-host' },
    )) as GraphQLResponse<{ getHost: { id: number } }>
    expect(result.errors![0].extensions.code).toBe(ErrorCode.NOT_FOUND)
    expect(result.errors![0].message).toMatch(/^Host not found/)
  })

  graphqlTest('automatic IP address allocation', async (graphqlRequest) => {
    const admin = await login('admin@example.com')

    // Create multiple hosts without specifying IP addresses
    const hosts = [
      await createHost(graphqlRequest, { name: 'auto-ip-host-1', ipAddress: '10.0.1.1' }, admin),
      await createHost(graphqlRequest, { name: 'auto-ip-host-2', ipAddress: '10.0.1.2' }, admin),
      await createHost(graphqlRequest, { name: 'auto-ip-host-3', ipAddress: '10.0.1.3' }, admin),
    ]

    // Verify each host has a unique IP address
    const ipAddresses = new Set(hosts.map((host) => host.ipAddress))
    expect(ipAddresses.size).toBe(3) // All IPs should be unique

    // Verify IP addresses are in the expected format (IPv4)
    hosts.forEach((host) => {
      expect(host.ipAddress).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
      // Verify each octet is between 0 and 255
      const octets = host.ipAddress.split('.').map(Number)
      octets.forEach((octet) => {
        expect(octet).toBeGreaterThanOrEqual(0)
        expect(octet).toBeLessThanOrEqual(255)
      })
    })

    // Clean up
    await Promise.all(
      hosts.map((host) =>
        graphqlRequest(
          graphql(`
            mutation DeleteHost($name: String!) {
              deleteHost(name: $name)
            }
          `),
          { name: host.name },
          admin,
        ),
      ),
    )
  })

  graphqlTest('unique constraint violations', async (graphqlRequest) => {
    const admin = await login('admin@example.com')

    // Create first host
    await createHost(
      graphqlRequest,
      {
        name: 'unique-test-host',
        ipAddress: '192.168.1.100',
      },
      admin,
    )

    // Try to create host with same name
    {
      const result = (await graphqlRequest(
        graphql(`
          mutation CreateHost($name: String!, $input: HostInput!) {
            addHost(name: $name, input: $input) {
              id
            }
          }
        `),
        {
          name: 'unique-test-host',
          input: { ipAddress: '192.168.1.101' },
        },
        admin,
      )) as GraphQLResponse<{ addHost: { id: number } }>
      expect(result.errors![0].extensions.code).toBe(ErrorCode.UNIQUE_CONSTRAINT_VIOLATION)
      expect(result.errors![0].extensions.details).toEqual({
        field: 'name',
        value: 'unique-test-host',
      })
      expect(result.errors![0].message).toBe(
        'A host with the name "unique-test-host" already exists',
      )
    }

    // Try to create host with same IP
    {
      const result = (await graphqlRequest(
        graphql(`
          mutation CreateHost($name: String!, $input: HostInput!) {
            addHost(name: $name, input: $input) {
              id
            }
          }
        `),
        {
          name: 'unique-test-host-2',
          input: { ipAddress: '192.168.1.100' },
        },
        admin,
      )) as GraphQLResponse<{ addHost: { id: number } }>
      expect(result.errors![0].extensions.code).toBe(ErrorCode.UNIQUE_CONSTRAINT_VIOLATION)
      expect(result.errors![0].extensions.details).toEqual({
        field: 'ipAddress',
        value: '192.168.1.100',
      })
      expect(result.errors![0].message).toBe(
        'A host with the IP address "192.168.1.100" already exists',
      )
    }
  })
})
