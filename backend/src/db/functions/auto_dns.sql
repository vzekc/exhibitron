CREATE schema IF NOT EXISTS dns;

-- Create the SOA maintenance function
CREATE OR REPLACE FUNCTION dns.increment_soa_serial(domain_name text)
RETURNS void AS $$
DECLARE
    current_serial bigint;
    new_serial bigint;
    soa_content text;
    soa_parts text[];
BEGIN
    -- Get current SOA record
    SELECT content INTO soa_content
    FROM dns.records r
    JOIN dns.domains d ON r.domain_id = d.id
    WHERE d.name = domain_name AND r.type = 'SOA';

    -- Split SOA content into parts
    soa_parts := string_to_array(soa_content, ' ');

    -- Extract and increment serial
    current_serial := soa_parts[3]::bigint;
    new_serial := current_serial + 1;

    -- Update SOA record with new serial
    UPDATE dns.records
    SET content =
        soa_parts[1] || ' ' ||
        soa_parts[2] || ' ' ||
        new_serial || ' ' ||
        soa_parts[4] || ' ' ||
        soa_parts[5] || ' ' ||
        soa_parts[6] || ' ' ||
        soa_parts[7]
    FROM dns.domains d
    WHERE dns.records.domain_id = d.id
    AND d.name = domain_name
    AND dns.records.type = 'SOA';
END;
$$ LANGUAGE plpgsql;

-- Function to get reverse DNS zone name from IP address
CREATE OR REPLACE FUNCTION dns.get_reverse_zone(ip_address INET)
    RETURNS TEXT AS $$
DECLARE
    ip_parts TEXT[];
    reverse_zone TEXT;
BEGIN
    -- Split IP into octets
    ip_parts := string_to_array(text(ip_address), '.');

    -- For IPv4, create reverse zone (e.g., 1.168.192.in-addr.arpa)
    IF family(ip_address) = 4 THEN
        reverse_zone := ip_parts[3] || '.' || ip_parts[2] || '.' || ip_parts[1] || '.in-addr.arpa';
    ELSE
        -- For IPv6, we'd need to implement reverse zone calculation
        -- This is simplified for now
        reverse_zone := NULL;
    END IF;

    RETURN reverse_zone;
END;
$$ LANGUAGE plpgsql;


-- Function to get exhibition's DNS zone
CREATE OR REPLACE FUNCTION dns.get_exhibition_zone(exhibition_id INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT dns_zone FROM public.exhibition WHERE id = exhibition_id);
END;
$$ LANGUAGE plpgsql;

-- Function to create or update DNS records for a host
CREATE OR REPLACE FUNCTION dns.sync_host_dns()
    RETURNS TRIGGER AS $$
DECLARE
    v_domain_id INTEGER;
    reverse_zone TEXT;
    reverse_domain_id INTEGER;
    ptr_name TEXT;
    v_zone TEXT;
BEGIN
    -- Get the exhibition's DNS zone
    v_zone := dns.get_exhibition_zone(NEW.exhibition_id);

    -- Get the forward zone domain_id
    SELECT id INTO v_domain_id FROM dns.domains WHERE name = v_zone;

    -- Handle INSERT or UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Delete existing records for this host
        DELETE FROM dns.records r
        WHERE r.domain_id = v_domain_id
          AND r.name = NEW.name || '.' || v_zone;

        -- Insert A record
        INSERT INTO dns.records (domain_id, name, type, content, ttl)
        VALUES (v_domain_id, NEW.name || '.' || v_zone, 'A', text(NEW.ip_address), 3600);

        -- Handle reverse DNS
        reverse_zone := dns.get_reverse_zone(NEW.ip_address);
        IF reverse_zone IS NOT NULL THEN
            -- Get or create reverse zone domain_id
            SELECT id INTO reverse_domain_id FROM dns.domains WHERE name = reverse_zone;
            IF reverse_domain_id IS NULL THEN
                INSERT INTO dns.domains (name, type) VALUES (reverse_zone, 'NATIVE')
                RETURNING id INTO reverse_domain_id;

                -- Create SOA record for reverse zone
                INSERT INTO dns.records (domain_id, name, type, content, ttl)
                VALUES (reverse_domain_id, reverse_zone, 'SOA',
                        'ns1.' || v_zone || '. hostmaster.' || v_zone || '. 1 10800 3600 604800 3600', 3600);

                -- Create NS record for reverse zone
                INSERT INTO dns.records (domain_id, name, type, content, ttl)
                VALUES (reverse_domain_id, reverse_zone, 'NS', 'ns1.' || v_zone, 3600);
            END IF;

            -- Create PTR record
            IF family(NEW.ip_address) = 4 THEN
                ptr_name := split_part(text(NEW.ip_address), '.', 4) || '.' || reverse_zone;
            ELSE
                -- IPv6 PTR record name would be calculated here
                ptr_name := NULL;
            END IF;

            IF ptr_name IS NOT NULL THEN
                -- Delete existing PTR record
                DELETE FROM dns.records r
                WHERE r.domain_id = reverse_domain_id
                  AND r.name = ptr_name;

                -- Insert new PTR record
                INSERT INTO dns.records (domain_id, name, type, content, ttl)
                VALUES (reverse_domain_id, ptr_name, 'PTR', NEW.name || '.' || v_zone, 3600);
            END IF;
        END IF;

        -- Increment SOA serial for both forward and reverse zones
        PERFORM dns.increment_soa_serial(v_zone);
        IF reverse_zone IS NOT NULL THEN
            PERFORM dns.increment_soa_serial(reverse_zone);
        END IF;
    END IF;

    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        -- Get the exhibition's DNS zone for the deleted host
        v_zone := dns.get_exhibition_zone(OLD.exhibition_id);

        -- Get the forward zone domain_id
        SELECT id INTO v_domain_id FROM dns.domains WHERE name = v_zone;

        -- Delete forward records
        DELETE FROM dns.records r
        WHERE r.domain_id = v_domain_id
          AND r.name = OLD.name || '.' || v_zone;

        -- Delete reverse records
        reverse_zone := dns.get_reverse_zone(OLD.ip_address);
        IF reverse_zone IS NOT NULL THEN
            SELECT id INTO reverse_domain_id FROM dns.domains WHERE name = reverse_zone;
            IF reverse_domain_id IS NOT NULL THEN
                IF family(OLD.ip_address) = 4 THEN
                    ptr_name := split_part(text(OLD.ip_address), '.', 4) || '.' || reverse_zone;
                    DELETE FROM dns.records r
                    WHERE r.domain_id = reverse_domain_id
                      AND r.name = ptr_name;
                END IF;

                -- Increment SOA serial for reverse zone
                PERFORM dns.increment_soa_serial(reverse_zone);
            END IF;
        END IF;

        -- Increment SOA serial for forward zone
        PERFORM dns.increment_soa_serial(v_zone);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

