CREATE SCHEMA IF NOT EXISTS dns;

CREATE TABLE dns.domains
(
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    master          VARCHAR(128) DEFAULT NULL,
    last_check      INT          DEFAULT NULL,
    type            TEXT         NOT NULL,
    notified_serial BIGINT       DEFAULT NULL,
    account         VARCHAR(40)  DEFAULT NULL,
    options         TEXT         DEFAULT NULL,
    catalog         TEXT         DEFAULT NULL,
    CONSTRAINT c_lowercase_name CHECK (((name)::TEXT = LOWER((name)::TEXT)))
);

CREATE UNIQUE INDEX name_index ON dns.domains (name);
CREATE INDEX catalog_idx ON dns.domains (catalog);


CREATE TABLE dns.records
(
    id        BIGSERIAL PRIMARY KEY,
    domain_id INT            DEFAULT NULL,
    name      VARCHAR(255)   DEFAULT NULL,
    type      VARCHAR(10)    DEFAULT NULL,
    content   VARCHAR(65535) DEFAULT NULL,
    ttl       INT            DEFAULT NULL,
    prio      INT            DEFAULT NULL,
    disabled  BOOL           DEFAULT 'f',
    ordername VARCHAR(255),
    auth      BOOL           DEFAULT 't',
    CONSTRAINT domain_exists
        FOREIGN KEY (domain_id) REFERENCES dns.domains (id)
            ON DELETE CASCADE,
    CONSTRAINT c_lowercase_name CHECK (((name)::TEXT = LOWER((name)::TEXT)))
);

CREATE INDEX rec_name_index ON dns.records (name);
CREATE INDEX nametype_index ON dns.records (name, type);
CREATE INDEX domain_id ON dns.records (domain_id);
CREATE INDEX recordorder ON dns.records (domain_id, ordername text_pattern_ops);


CREATE TABLE dns.supermasters
(
    ip         INET         NOT NULL,
    nameserver VARCHAR(255) NOT NULL,
    account    VARCHAR(40)  NOT NULL,
    PRIMARY KEY (ip, nameserver)
);


CREATE TABLE dns.comments
(
    id          SERIAL PRIMARY KEY,
    domain_id   INT            NOT NULL,
    name        VARCHAR(255)   NOT NULL,
    type        VARCHAR(10)    NOT NULL,
    modified_at INT            NOT NULL,
    account     VARCHAR(40) DEFAULT NULL,
    comment     VARCHAR(65535) NOT NULL,
    CONSTRAINT domain_exists
        FOREIGN KEY (domain_id) REFERENCES dns.domains (id)
            ON DELETE CASCADE,
    CONSTRAINT c_lowercase_name CHECK (((name)::TEXT = LOWER((name)::TEXT)))
);

CREATE INDEX comments_domain_id_idx ON dns.comments (domain_id);
CREATE INDEX comments_name_type_idx ON dns.comments (name, type);
CREATE INDEX comments_order_idx ON dns.comments (domain_id, modified_at);


CREATE TABLE dns.domainmetadata
(
    id        SERIAL PRIMARY KEY,
    domain_id INT REFERENCES dns.domains (id) ON DELETE CASCADE,
    kind      VARCHAR(32),
    content   TEXT
);

CREATE INDEX domainidmetaindex ON dns.domainmetadata (domain_id);


CREATE TABLE dns.cryptokeys
(
    id        SERIAL PRIMARY KEY,
    domain_id INT REFERENCES dns.domains (id) ON DELETE CASCADE,
    flags     INT NOT NULL,
    active    BOOL,
    published BOOL DEFAULT TRUE,
    content   TEXT
);

CREATE INDEX domainidindex ON dns.cryptokeys (domain_id);


CREATE TABLE dns.tsigkeys
(
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(255),
    algorithm VARCHAR(50),
    secret    VARCHAR(255),
    CONSTRAINT c_lowercase_name CHECK (((name)::TEXT = LOWER((name)::TEXT)))
);

CREATE UNIQUE INDEX namealgoindex ON dns.tsigkeys (name, algorithm);
