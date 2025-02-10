CREATE TABLE exhibition
(
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner       uuid    NOT NULL REFERENCES "user" (id),
    title       VARCHAR NOT NULL,
    description TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE tables
(
    number     INTEGER PRIMARY KEY,
    exhibition uuid NULL REFERENCES exhibition (id)
);

ALTER TABLE "user"
    ADD is_administrator BOOLEAN NOT NULL DEFAULT FALSE;
