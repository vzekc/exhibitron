-- Create the pdns user with a password if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pdns'
    ) THEN
        CREATE ROLE pdns WITH LOGIN PASSWORD '${PDNS_PASSWORD}';
    END IF;
END
$$;

-- Create the dns schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS dns;

-- Grant usage and privileges on the schema to pdns
GRANT USAGE ON SCHEMA dns TO pdns;
GRANT ALL PRIVILEGES ON SCHEMA dns TO pdns;

-- Grant privileges on all tables and sequences (repeatable, no harm)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dns TO pdns;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dns TO pdns;

-- Set the search path for pdns user
ALTER ROLE pdns SET search_path TO dns;

-- Grant connect privilege on the exhibitron database to pdns
GRANT CONNECT ON DATABASE exhibitron TO pdns;
