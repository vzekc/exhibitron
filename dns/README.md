# PowerDNS Setup

This directory contains the configuration for running PowerDNS with PostgreSQL backend.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL running on the host machine
- The `exhibitron` database must exist
- `httpie` installed for API examples (install with `brew install httpie` on macOS)

## Setup

1. Create a `.env` file in this directory with your PostgreSQL password and API key:
```
PDNS_PASSWORD=your_password
PDNS_API_KEY=your_api_key
```

2. Run the setup script to download the schema and set up the database:
```bash
./setup.sh
```

3. Start the PowerDNS container:
```bash
docker compose up -d
```

## Configuration

- The PowerDNS server listens on port 5300 (both TCP and UDP)
- The configuration file is mounted from `pdns.conf`
- The server uses the PostgreSQL database on the host machine
- All tables are created in the `dns` schema
- The HTTP API is available on port 8081

## Database Schema

PowerDNS will use the following tables in the `dns` schema:
- domains
- records
- comments
- domainmetadata
- cryptokeys
- tsigkeys

## Testing

After starting the server, you can test it with:

```bash
# Create a test zone
docker compose exec powerdns pdnsutil create-zone example.com

# Add some test records
docker compose exec powerdns pdnsutil add-record example.com @ SOA "ns1.example.com. hostmaster.example.com. 1 10800 3600 604800 3600"
docker compose exec powerdns pdnsutil add-record example.com @ NS "ns1.example.com."
docker compose exec powerdns pdnsutil add-record example.com ns1 A 192.168.1.1

# Test DNS resolution
dig @localhost -p 5300 example.com A
```

## Using the HTTP API

The PowerDNS HTTP API allows you to manage zones and records programmatically. Here are some common operations:

### List all zones
```bash
http GET http://localhost:8081/api/v1/servers/localhost/zones X-API-Key:${PDNS_API_KEY}
```

### Create a new zone
```bash
http POST http://localhost:8081/api/v1/servers/localhost/zones \
  X-API-Key:${PDNS_API_KEY} \
  name=example.com \
  kind=Native \
  nameservers:='["ns1.example.com"]' \
  soa_edit_api=INCEPTION-INCREMENT \
  soa_edit=INCEPTION-INCREMENT
```

### Add a record to a zone
```bash
http PATCH http://localhost:8081/api/v1/servers/localhost/zones/example.com \
  X-API-Key:${PDNS_API_KEY} \
  rrsets:='[{
    "name": "www.example.com",
    "type": "A",
    "ttl": 3600,
    "changetype": "REPLACE",
    "records": [{
      "content": "192.168.1.1",
      "disabled": false
    }]
  }]'
```

### Delete a zone
```bash
http DELETE http://localhost:8081/api/v1/servers/localhost/zones/example.com \
  X-API-Key:${PDNS_API_KEY}
```

### Get zone details
```bash
http GET http://localhost:8081/api/v1/servers/localhost/zones/example.com \
  X-API-Key:${PDNS_API_KEY}
```

For more API operations, refer to the [PowerDNS API documentation](https://doc.powerdns.com/authoritative/http-api/index.html).

## Direct Database Operations

For bulk operations or complex changes, you can work directly with the database. Here are some examples:

### Add a new zone
```sql
-- First, add the domain
INSERT INTO dns.domains (name, type) VALUES ('example.com', 'NATIVE');

-- Then add the SOA record
INSERT INTO dns.records (domain_id, name, type, content, ttl, prio)
SELECT id, 'example.com', 'SOA', 'ns1.example.com. hostmaster.example.com. 1 10800 3600 604800 3600', 3600, 0
FROM dns.domains WHERE name = 'example.com';

-- Add NS record
INSERT INTO dns.records (domain_id, name, type, content, ttl, prio)
SELECT id, 'example.com', 'NS', 'ns1.example.com', 3600, 0
FROM dns.domains WHERE name = 'example.com';

-- Add A record for ns1
INSERT INTO dns.records (domain_id, name, type, content, ttl, prio)
SELECT id, 'ns1.example.com', 'A', '192.168.1.1', 3600, 0
FROM dns.domains WHERE name = 'example.com';
```

### Update multiple records
```sql
-- Update TTL for all A records in a zone
UPDATE dns.records
SET ttl = 7200
WHERE domain_id IN (SELECT id FROM dns.domains WHERE name = 'example.com')
AND type = 'A';

-- Update IP address for a specific A record
UPDATE dns.records
SET content = '192.168.1.2'
WHERE domain_id IN (SELECT id FROM dns.domains WHERE name = 'example.com')
AND name = 'www.example.com'
AND type = 'A';
```

### Delete a zone
```sql
-- Delete all records for the zone
DELETE FROM dns.records
WHERE domain_id IN (SELECT id FROM dns.domains WHERE name = 'example.com');

-- Delete the domain
DELETE FROM dns.domains WHERE name = 'example.com';
```

### List all records in a zone
```sql
SELECT r.name, r.type, r.content, r.ttl, r.prio
FROM dns.records r
JOIN dns.domains d ON r.domain_id = d.id
WHERE d.name = 'example.com'
ORDER BY r.name, r.type;
```

### Automatic Zone Reloads

PowerDNS automatically detects zone changes when the SOA serial number is updated. The database initialization script includes a function `dns.increment_soa_serial(domain_name)` that handles this automatically.

Example usage:
```sql
-- 1. Make your changes to the zone
UPDATE dns.records
SET content = '192.168.1.3'
WHERE domain_id IN (SELECT id FROM dns.domains WHERE name = 'example.com')
AND name = 'www.example.com'
AND type = 'A';

-- 2. Increment the SOA serial to trigger a reload
SELECT dns.increment_soa_serial('example.com');
```

This approach is more efficient than manually reloading zones because:
1. PowerDNS automatically detects the SOA serial change
2. Only the changed zone is reloaded
3. No manual intervention is required
4. Changes are picked up within seconds

Note: The SOA serial should follow the format YYYYMMDDnn where:
- YYYYMMDD is the current date
- nn is a two-digit sequence number for multiple changes on the same day

## Security Notes

- AXFR (zone transfers) are disabled by default
- Only localhost is allowed to perform AXFR
- Make sure to set a strong PostgreSQL password
- The `pdns` user has limited permissions only to the `dns` schema
- The API is protected by an API key - keep it secure 