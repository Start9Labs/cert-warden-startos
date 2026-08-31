# Cert Warden

## Documentation

- [Cert Warden documentation](https://github.com/gregtwallace/certwarden.com/tree/main/docs) — the upstream guide: getting started, every screen of the web interface, the challenge providers, and how to fetch certificates from your devices.

## What you get on StartOS

Cert Warden runs as a single service with its own web interface, where you add
your ACME provider, create private keys, and order certificates. Everything it
issues is kept in a database on your server.

Your other devices — a router, a NAS, a printer, a reverse proxy — fetch their
own certificate and key from the **Download API** interface. Each one uses its own
API key, so a device only ever gets the certificate you gave it.

StartOS holds the administrator password for you and provides its own certificate
for the web interface, so the address you open is already encrypted.

## Getting set up

1. Run the **Set Admin Password** action. It gives you a username and a password;
   save the password somewhere safe, because it is only shown once. This is
   required before the service will start.
2. Start the service and open the **Web UI** interface. Sign in with the
   credentials from step 1.
3. In the web interface, go to **ACME Accounts** and create an account with your
   ACME provider. Let's Encrypt is configured out of the box, and its staging
   environment is there too — use staging while you are finding your feet, because
   the production environment has rate limits you can exhaust.
4. Choose how your domains will be validated, under **Providers**. This is the
   step that decides everything after it:
   - **DNS-01** works with no incoming connection at all, and is the right choice
     on almost every home server. Cert Warden can update your DNS records through
     Cloudflare, acme-dns, go-acme/lego, or a script you supply.
   - **HTTP-01** requires the domain you are issuing a certificate for to point at
     this server, and its port 80 to reach the **HTTP-01 Challenge Server**
     interface — add that domain to that interface. This only works for domains
     that resolve to this server; if the certificate is for another device on your
     network, use DNS-01 instead.
5. Create a **Private Key**, then a **Certificate** that uses it, and order the
   certificate.

## Using Cert Warden

### Web interface

The web interface is where you do everything: ACME accounts, private keys,
certificates, challenge providers, the order queue, and the application's log.
Signing in with the credentials from **Set Admin Password** takes you to a
dashboard listing your certificates and when each one expires.

### Getting certificates onto your devices

Each private key and certificate has its own API key, shown on its page in the web
interface. A device fetches the current certificate by requesting it from the
**Download API** address with that key in an `X-API-Key` header:

```
curl -H "X-API-Key: <the certificate's API key>" \
  <Download API address>certificates/<certificate name>
```

Cert Warden always returns the newest valid certificate, so a device that fetches
on a schedule picks up each renewal without anything changing on your side.
Upstream publishes example scripts and a small client for doing this — see the
documentation link above.

### Actions

- **Set Admin Password** — replaces your password with a newly generated one and
  shows it once. Run it whenever you want a new password, and run it if you have
  forgotten the one you had — it never asks for your old password. The service
  needs to be stopped for it, so stop it first, run the action, then start it
  again.
- **Server Settings** — changes how much detail Cert Warden writes to its log.
  Raise it to debug when a certificate order will not complete, then read the log
  on the Dashboard tab. Changes take effect the next time the service starts.
