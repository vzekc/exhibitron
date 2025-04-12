FROM powerdns/pdns-auth-master:latest

# Install PostgreSQL client tools
USER root
RUN apt-get update && \
    apt-get install -y postgresql-client gettext && \
    rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN touch /etc/powerdns/pdns.conf && chown pdns /etc/powerdns/pdns.conf
USER pdns
ENTRYPOINT ["/entrypoint.sh"]
