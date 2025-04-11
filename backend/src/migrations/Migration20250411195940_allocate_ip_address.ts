import { Migration } from '@mikro-orm/migrations';

export class Migration20250411195940_allocate_ip_address extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "exhibit" drop constraint "exhibit_hostname_id_foreign";`);

    this.addSql(`alter table "exhibit" drop constraint "exhibit_hostname_id_unique";`);
    this.addSql(`alter table "exhibit" drop column "hostname_id";`);
    this.addSql(`CREATE OR REPLACE FUNCTION allocate_ip_address()
RETURNS VARCHAR AS $$
DECLARE
    last_ip TEXT;
    next_ip TEXT;
    last_octets INT[];
BEGIN
    -- Get the highest IP address in the range 10.2.x.y
    SELECT ip_address INTO last_ip
    FROM public.host
    WHERE ip_address LIKE '10.2.%'
    ORDER BY string_to_array(ip_address, '.')::INT[] DESC
    LIMIT 1;

    -- If no IP is in use, return the default IP
    IF last_ip IS NULL THEN
        RETURN '10.2.0.0';
    END IF;

    -- Parse the last IP into octets and calculate the next IP
    last_octets := string_to_array(last_ip, '.')::INT[];
    IF last_octets[4] < 255 THEN
        next_ip := format('10.2.%s.%s', last_octets[3], last_octets[4] + 1);
    ELSE
        next_ip := format('10.2.%s.0', last_octets[3] + 1);
    END IF;

    -- Return the next IP
    RETURN next_ip;
END;
$$ LANGUAGE plpgsql;
`);

    this.addSql(`alter table "host" alter column "ip_address" type varchar(255) using ("ip_address"::varchar(255));`);
    this.addSql(`alter table "host" alter column "ip_address" set default allocate_ip_address();`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibit" add column "hostname_id" int null;`);
    this.addSql(`alter table "exhibit" add constraint "exhibit_hostname_id_foreign" foreign key ("hostname_id") references "host" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "exhibit" add constraint "exhibit_hostname_id_unique" unique ("hostname_id");`);

    this.addSql(`alter table "host" alter column "ip_address" drop default;`);
    this.addSql(`alter table "host" alter column "ip_address" type varchar(255) using ("ip_address"::varchar(255));`);
  }

}
