CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

CREATE TABLE public."user"
(
    id                            uuid PRIMARY KEY DEFAULT public.uuid_generate_v1(),
    name                          VARCHAR UNIQUE NOT NULL,
    password_hash                 TEXT,
    password_reset_key            VARCHAR,
    password_reset_key_expires_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE OR REPLACE FUNCTION set_password(username VARCHAR, password TEXT) RETURNS VOID AS
$$
DECLARE
    salt TEXT := gen_salt('bf');
BEGIN
    PERFORM 1 FROM "user" WHERE name = username;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % does not exist', username;
    END IF;

    UPDATE public."user"
    SET password_hash                 = crypt(password, salt),
        password_reset_key_expires_at = NULL,
        password_reset_key            = NULL
    WHERE name = username;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_password_with_key(reset_key VARCHAR, new_password TEXT)
    RETURNS VOID AS
$$
DECLARE
    user_name VARCHAR;
    expired   BOOLEAN;
BEGIN
    -- Try to find a user with the given reset key
    SELECT name,
           password_reset_key_expires_at < NOW()
    INTO user_name, expired
    FROM "user"
    WHERE password_reset_key = reset_key;

    -- Check if user was found
    IF user_name IS NULL THEN
        RAISE EXCEPTION 'Invalid password reset key: "%"', reset_key;
    ELSEIF expired THEN
        RAISE EXCEPTION 'Password reset key "%" has expired', reset_key;
    END IF;

    -- Call the set_password function to reset the user's password
    PERFORM set_password(user_name, new_password);
END;
$$
    LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION request_password_reset(user_name VARCHAR)
    RETURNS VARCHAR AS
$$
DECLARE
    new_key VARCHAR;
BEGIN
    -- Generate a random string of 16 alphanumeric characters
    SELECT ENCODE(GEN_RANDOM_BYTES(8), 'hex') INTO new_key;

    -- Set the password_reset_key and password_reset_key_expires_at fields for the given user
    UPDATE "user"
    SET password_reset_key            = new_key,
        password_reset_key_expires_at = NOW() + INTERVAL '30 minutes'
    WHERE name = user_name;
    RETURN new_key;
END;
$$
    LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION check_password(username VARCHAR, password TEXT) RETURNS BOOLEAN AS
$$
DECLARE
    hashed_password TEXT;
BEGIN
    SELECT password_hash
    INTO hashed_password
    FROM public."user"
    WHERE name = username;

    RETURN hashed_password = crypt(password, hashed_password);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION random_alphanumeric_char()
    RETURNS CHAR AS
$$
DECLARE
    random_index INT;
    charset      CHAR[] := ARRAY(SELECT CHR(i)
                                 FROM GENERATE_SERIES(48, 57) AS g(i)
                                 UNION ALL
                                 SELECT CHR(i)
                                 FROM GENERATE_SERIES(65, 90) AS g(i));
BEGIN
    random_index := FLOOR(RANDOM() * ARRAY_LENGTH(charset, 1)) + 1;
    RETURN charset[random_index];
END;
$$
    LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_install_key()
    RETURNS VARCHAR AS
$$
DECLARE
    random_string VARCHAR := '';
    i             INT;
BEGIN
    FOR i IN 1..4
        LOOP
            random_string := random_string || random_alphanumeric_char();
        END LOOP;

    random_string := random_string || '-';

    FOR i IN 1..4
        LOOP
            random_string := random_string || random_alphanumeric_char();
        END LOOP;

    RETURN random_string;
END;
$$
    LANGUAGE plpgsql;
