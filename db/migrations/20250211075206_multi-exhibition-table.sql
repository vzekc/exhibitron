ALTER TABLE exhibition
    ADD table_number INTEGER REFERENCES tables (number);

UPDATE exhibition
SET table_number = number
FROM tables
WHERE exhibition.id = tables.exhibition;

ALTER TABLE tables
    ADD owner uuid REFERENCES "user" (id);

UPDATE tables t
SET owner = e.exhibitor
FROM exhibition e
WHERE e.id = t.exhibition;

ALTER TABLE tables
    DROP exhibition;
