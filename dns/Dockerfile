FROM powerdns/pdns-auth-master:latest

# Install PostgreSQL client tools
USER root
RUN apt-get update && \
    apt-get install -y postgresql-client && \
    rm -rf /var/lib/apt/lists/*
USER pdns 