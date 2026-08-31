<p align="center">
  <img src="icon.png" alt="Cert Warden Logo" width="21%">
</p>

# Cert Warden on StartOS

> Everything not listed in this document should behave the same as upstream Cert
> Warden. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section
> of `instructions.md` for links.

Cert Warden is a centralized ACME client. It orders and renews TLS certificates
from Let's Encrypt or any other ACME provider, and serves each certificate and
private key to the device that needs it over an authenticated download API.
Upstream: [gregtwallace/certwarden](https://github.com/gregtwallace/certwarden).

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The service runs upstream's own image unmodified, using the image's built-in
entrypoint. A second, tiny image carries the tools the password reset needs,
which upstream's image does not ship.

| Image         | Source                                                  | Purpose                          |
| ------------- | ------------------------------------------------------- | -------------------------------- |
| `cert-warden` | `ghcr.io/gregtwallace/certwarden`, unmodified           | The service.                     |
| `sqlite`      | Built from `Dockerfile.sqlite` (Alpine + `sqlite`, `apache2-utils`) | Resetting the admin password. |

Both are built for `x86_64` and `aarch64`. The service daemon runs the image's
own entrypoint (`sdk.useEntrypoint()`).

The image is Alpine with a single Go binary and no init system, so it runs
without `runAsInit`. The application's working directory is `/app`, and it
resolves its data directory relative to that — a container started with a
different working directory writes its database somewhere else.

Two subcontainers exist:

| Subcontainer                | Image         | Purpose                                                                    |
| --------------------------- | ------------- | -------------------------------------------------------------------------- |
| `cert-warden-sub`           | `cert-warden` | The long-running daemon.                                                   |
| `cert-warden-db-probe`      | `sqlite`      | Temporary; checks whether the database exists yet.                         |
| `cert-warden-db-init`       | `cert-warden` | Temporary; runs the service once on a fresh install so it creates its database. |
| `cert-warden-set-password`  | `sqlite`      | Temporary; writes the new password hash.                                   |

The three temporary subcontainers exist only while Set Admin Password runs.

## Volume and Data Layout

One volume holds everything the application writes, and a second holds the
package's own state where the application cannot read it.

| Volume    | Mount point | Contents                                             |
| --------- | ----------- | ---------------------------------------------------- |
| `main`    | `/app/data` | The application's entire data directory.             |
| `startos` | not mounted | `store.json` — the admin password the package holds. |

Within `main`, the application creates three directories itself:

| Path      | Contents                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------- |
| `app/`    | `config.yaml` and `appdata.db`, the SQLite database holding accounts, keys, certificates and orders. |
| `backup/` | The application's own snapshots of `app/`, which it lists and restores from its web interface. It writes one before migrating its own configuration schema, and periodically on upstream's default schedule. |
| `log/`    | The application's log file.                                                                     |

There is no external database; everything is in that one SQLite file.

## File Models

The package owns two files. One is the application's configuration; the other is
package state the application never sees.

| Model         | File                    | Format |
| ------------- | ----------------------- | ------ |
| `configYaml`  | `main:app/config.yaml`  | YAML   |
| `storeJson`   | `startos:store.json`    | JSON   |

`config.yaml` is seeded on install and re-merged on every init. **Four keys are
re-asserted on every init and will revert if edited:** `bind_address`,
`http_port`, `serve_frontend` and `enable_pprof` keep the container reachable at
the port the interfaces are bound to, and `updater.auto_check` stays off because
StartOS owns updates. `log_level` is seeded once and then belongs to the
user through the Server Settings action. `config_version`
is seeded but never pinned — the application rewrites this file when it migrates
its own configuration schema, and pinning it would fight that migration. Keys the
package does not name are preserved, so anything the application adds to the file
survives.

A hand edit to a re-asserted key does not survive the next init. A hand edit to
any other key does, but there is no supported way to make one: the file lives
inside a volume, and the Server Settings action is the intended route.

`store.json` holds the admin password the package last generated, so it can be
shown to the user and so the install task knows whether one has been set. It sits
on a volume no subcontainer mounts, so the application cannot read it.

## Dependencies

None.

## Network Access and Interfaces

The application serves its web interface and its entire API from one port, and
answers ACME http-01 challenges on another.

| Interface   | Type  | Container port | Purpose                                                                     |
| ----------- | ----- | -------------- | --------------------------------------------------------------------------- |
| `ui`        | `ui`  | 4050           | The web interface, where all certificate configuration happens.              |
| `api`       | `api` | 4050           | The download base path devices fetch their key and certificate from.         |
| `challenge` | `api` | 4060           | Serves ACME http-01 challenge responses.                                     |

`ui` and `api` share one binding and differ only in path — `api` points at
`/certwarden/api/v1/download/`, so the address copied from it is the base a
consumer appends a certificate name to.

`challenge` requests external port 80, because ACME servers validate http-01 on
port 80 of the name being issued and nowhere else. It is only useful when the
name being issued resolves to this server; for every other case the dns-01
challenge providers need no inbound port at all.

The application also exposes an HTTPS port and two pprof ports upstream. This
package binds none of them: StartOS terminates TLS in front of the container, and
pprof is a debugging profiler that stays off.

## Installation and First-Run Flow

Upstream ships a fixed default administrator password and expects the user to
change it after signing in for the first time. This package does not let that
window exist.

On install, a `critical` task is raised immediately, which blocks the service from
starting. The service therefore never runs — and its address never serves — while
the shipped password is still in place. Running the Set Admin Password action
replaces that password and clears the task, and only then does the service start.

Nothing else about first run differs from upstream: no ACME account, key or
certificate is created for the user, and no setup wizard is skipped.

## Actions

Two actions, both user-facing.

### Set Admin Password

Run it to take ownership of the account on a fresh install, whenever the password
should be replaced, and to recover from a lost password. It generates a new
password, applies it, saves it, and shows it once.

**It is a reset, not a change: it never needs the existing password.** The
application stores passwords as bcrypt hashes in `appdata.db` and offers no reset
path through its API, so this writes the hash into that table directly. A password
the user set inside the application's own web interface is overwritten like any
other, and a forgotten one is recovered by running this.

- **What it changes:** the administrator's row in `appdata.db` (`password_hash` and
  `updated_at`), and `adminPassword` in `store.json`.
- **Cost:** about a second. On a fresh install where the database does not exist
  yet, it first runs the application once to create it, which brings it to a few
  seconds.
- **Repeat safety:** safe to repeat. Each run replaces the previous password.
- **What happens next:** on a fresh install this clears the critical task and the
  service becomes startable.
- **Outputs:** the username and the new password. The password is not recoverable
  afterwards — running the action again is the only way to get a usable one.

### Server Settings

Run it to change how much the application logs, usually to raise it to debug
while diagnosing a certificate order that will not complete.

- **What it changes:** `log_level` in `config.yaml`.
- **Cost:** immediate.
- **Repeat safety:** safe to repeat.
- **What happens next:** the application reads this file at startup, so a change
  takes effect on the next restart.
- **Outputs:** none.

Everything else — ACME servers, accounts, private keys, certificates, challenge
providers and API keys — is configured inside the application's web interface,
not through actions.

## Tasks

One task, and it is the reason a fresh install does not start on its own.

| Task               | Severity   | Raised when                             | Cleared by                                          |
| ------------------ | ---------- | --------------------------------------- | --------------------------------------------------- |
| Set Admin Password | `critical` | `store.json` holds no admin password.   | Running the Set Admin Password action successfully. |

Because it is `critical`, the service will not start while it is raised, and the
ordinary controls are suspended until it is satisfied. It can return only if the
stored password is lost, which in practice means a restore of the `main` volume
without the `startos` volume.

## Health Checks

One check, on the daemon.

| Check         | Probes                                                             |
| ------------- | ------------------------------------------------------------------ |
| `cert-warden` | The application's own health endpoint on the web interface port.   |

A failure means the HTTP server is not answering. During the first few seconds of
a start that is normal. Persisting past that is a real fault, and the service log
names it — the two that stop the application outright are a `config.yaml` whose
`config_version` key is missing or unparseable, and a configuration schema too old
for the application to migrate automatically. Both are configuration faults, not
crashes, and both are reported in the log rather than by the check.

## Backups and Restore

Both volumes are copied wholesale; nothing is dumped and replayed. The SQLite
database is captured as a file.

Because StartOS stops the service for the duration of a backup, the database is
copied from a quiescent volume — no dump step is needed to get a consistent
SQLite file.

The application's log directory is excluded, because a log is not state worth
restoring. The application's own snapshot directory is **not** excluded: those
snapshots are restore points the user can see and select in its web interface, and
a restore that emptied that list would look like data loss.

Those in-application snapshots are not a substitute for this backup and the
package does not present them as one — they live on the same disk as the data they
copy. They are Cert Warden's own rollback feature, left at upstream's defaults and
configured, if at all, in its web interface.

A restored instance is immediately usable and needs nothing re-entered — the
`startos` volume carries the admin password across, so the credential from before
the backup still works. Restoring `main` alone raises the Set Admin Password task
again, and running it recovers access under a new password.

## Limitations and Differences

1. **Set Admin Password requires the service to be stopped.** It writes to the
   SQLite database the running service holds open, which is not safe to do
   concurrently.
2. **A password changed inside the application is not the one StartOS holds.** The
   Change Password screen in the application's own web interface works, but StartOS
   does not learn the new value, so what Set Admin Password last showed is stale.
   Running Set Admin Password again resolves it and always succeeds.
3. **The pprof profiler is unavailable.** Upstream can expose it on two ports;
   this package binds neither and holds the setting off.
4. **Automatic update checks are off.** The application would otherwise poll for
   new releases; StartOS delivers updates instead.
5. **HTTPS is terminated by StartOS, not by the application.** The container
   serves plain HTTP and the application's own certificate settings go unused,
   which is why its documentation's advice to secure the server with one of its
   own certificates does not apply here.

---

## Quick Reference for AI Consumers

```yaml
package_id: 'cert-warden'
images:
  cert-warden: ghcr.io/gregtwallace/certwarden
  sqlite: built from Dockerfile.sqlite
architectures: [x86_64, aarch64]
subcontainers:
  [
    cert-warden-sub,
    cert-warden-db-probe,
    cert-warden-db-init,
    cert-warden-set-password,
  ]
volumes:
  main: /app/data
  startos: null
file_models:
  - main:app/config.yaml
  - startos:store.json
startos_managed_env_vars: []
dependencies: none
interfaces:
  ui: { type: ui, port: 4050 }
  api: { type: api, port: 4050 }
  challenge: { type: api, port: 4060 }
actions:
  - set-admin-password
  - server-settings
tasks:
  - { action: set-admin-password, severity: critical }
health_checks:
  - cert-warden
```
