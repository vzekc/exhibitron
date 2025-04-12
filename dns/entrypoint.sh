#!/bin/sh
envsubst < /etc/powerdns/pdns.conf.template > /etc/powerdns/pdns.conf
exec pdns_server --config-dir=/etc/powerdns
