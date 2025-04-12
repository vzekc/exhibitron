-- Insert the forward zone
INSERT INTO dns.domains (name, type) VALUES ('2025.classic-computing.de', 'NATIVE');

-- Insert the reverse zone
INSERT INTO dns.domains (name, type) VALUES ('10.in-addr.arpa', 'NATIVE');

-- Add SOA for the forward zone
INSERT INTO dns.records (domain_id, name, type, content, ttl, prio)
SELECT id, '2025.classic-computing.de', 'SOA',
       'ns1.2025.classic-computing.de hostmaster.2025.classic-computing.de 2025041201 3600 600 604800 60',
       3600, NULL
FROM dns.domains WHERE name = '2025.classic-computing.de';

-- Add SOA for the reverse zone
INSERT INTO dns.records (domain_id, name, type, content, ttl, prio)
SELECT id, '10.in-addr.arpa', 'SOA',
       'ns1.2025.classic-computing.de hostmaster.2025.classic-computing.de 2025041201 3600 600 604800 60',
       3600, NULL
FROM dns.domains WHERE name = '10.in-addr.arpa';

-- Optionally add NS records for both zones

-- Forward zone NS
INSERT INTO dns.records (domain_id, name, type, content, ttl, prio)
SELECT id, '2025.classic-computing.de', 'NS', 'ns1.2025.classic-computing.de', 3600, NULL
FROM dns.domains WHERE name = '2025.classic-computing.de';

-- Reverse zone NS
INSERT INTO dns.records (domain_id, name, type, content, ttl, prio)
SELECT id, '10.in-addr.arpa', 'NS', 'ns1.2025.classic-computing.de', 3600, NULL
FROM dns.domains WHERE name = '10.in-addr.arpa';
