-- Delete NS records for the forward zone
DELETE FROM dns.records
WHERE name = '2025.classic-computing.de' AND type = 'NS' AND content = 'ns1.2025.classic-computing.de';

-- Delete NS records for the reverse zone
DELETE FROM dns.records
WHERE name = '10.in-addr.arpa' AND type = 'NS' AND content = 'ns1.2025.classic-computing.de';

-- Delete SOA records for the forward zone
DELETE FROM dns.records
WHERE name = '2025.classic-computing.de' AND type = 'SOA' AND content = 'ns1.2025.classic-computing.de hostmaster.2025.classic-computing.de 2025041201 3600 600 604800 60';

-- Delete SOA records for the reverse zone
DELETE FROM dns.records
WHERE name = '10.in-addr.arpa' AND type = 'SOA' AND content = 'ns1.2025.classic-computing.de hostmaster.2025.classic-computing.de 2025041201 3600 600 604800 60';

-- Delete the forward zone
DELETE FROM dns.domains
WHERE name = '2025.classic-computing.de' AND type = 'NATIVE';

-- Delete the reverse zone
DELETE FROM dns.domains
WHERE name = '10.in-addr.arpa' AND type = 'NATIVE';
