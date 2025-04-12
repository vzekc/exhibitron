-- First drop the default value
alter table "host" alter column "ip_address" drop default;

-- Then alter the column type
alter table "host" alter column "ip_address" type inet using ("ip_address"::inet);

DROP FUNCTION IF EXISTS allocate_ip_address();

CREATE OR REPLACE FUNCTION allocate_ip_address()
    RETURNS inet AS $$
DECLARE
    last_ip inet;
    next_ip inet;
BEGIN
    -- Get the highest IP address in the range 10.2.x.y
    SELECT ip_address::inet INTO last_ip
    FROM public.host
    WHERE ip_address::inet << '10.2.0.0/16'
    ORDER BY ip_address::inet DESC
    LIMIT 1;

    -- If no IP is in use, return the default IP
    IF last_ip IS NULL THEN
        RETURN '10.2.0.0'::inet;
    END IF;

    -- Calculate the next IP by adding 1 to the host part
    next_ip := last_ip + 1;

    -- Return the next IP
    RETURN next_ip;
END;
$$ LANGUAGE plpgsql;

-- Finally set the default value again
alter table "host" alter column "ip_address" set default allocate_ip_address();
