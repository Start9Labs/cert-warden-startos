import { T } from '@start9labs/start-sdk'
import { writeFile } from 'node:fs/promises'
import { sdk } from './sdk'
import { adminUsername, dataPath, uiPort } from './utils'

const dbPath = `${dataPath}/app/appdata.db`
const bootScriptPath = '/tmp/cw-boot.sh'
const bootTimeoutMs = 180_000

// Cert Warden's own bcrypt cost, so a hash written here is indistinguishable
// from one it wrote itself.
const bcryptCost = 12

const mounts = () =>
  sdk.Mounts.of().mountVolume({
    volumeId: 'main',
    subpath: null,
    mountpoint: dataPath,
    readonly: false,
  })

const bootScript = String.raw`#!/bin/sh
/app/certwarden >/tmp/boot.log 2>&1 &
PID=$!
i=0
until [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:__PORT__/certwarden/api/health" 2>/dev/null)" = "204" ]; do
  i=$((i + 1))
  if [ "$i" -ge 90 ]; then kill "$PID" 2>/dev/null; echo "ERR_TIMEOUT"; exit 1; fi
  sleep 1
done
kill "$PID" 2>/dev/null
wait "$PID" 2>/dev/null
echo "OK"
`.replace('__PORT__', String(uiPort))

/**
 * Runs Cert Warden once if it has never run, so that it creates its database.
 * Everything else here operates on that database directly.
 */
async function ensureDatabase(effects: T.Effects): Promise<void> {
  const exists = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'sqlite' },
    mounts(),
    'cert-warden-db-probe',
    async (sub) => (await sub.exec(['test', '-s', dbPath])).exitCode === 0,
  )
  if (exists) return

  const { stdout } = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'cert-warden' },
    mounts(),
    'cert-warden-db-init',
    async (sub) => {
      await writeFile(`${sub.rootfs}${bootScriptPath}`, bootScript, {
        mode: 0o755,
      })
      return sub.exec(['/bin/sh', bootScriptPath], { timeout: bootTimeoutMs })
    },
  )
  if (!String(stdout).includes('OK')) throw new Error('ERR_DB_INIT')
}

/**
 * Replaces the admin account's password. Writes the bcrypt hash straight into
 * Cert Warden's database, so it works without knowing the existing password —
 * which is what makes it a reset rather than a change. Must run with the
 * service stopped.
 */
export async function setAdminPassword(
  effects: T.Effects,
  password: string,
): Promise<void> {
  await ensureDatabase(effects)

  const { stdout } = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'sqlite' },
    mounts(),
    'cert-warden-set-password',
    async (sub) => {
      await writeFile(`${sub.rootfs}/tmp/cw-pw`, password)
      return sub.exec([
        '/bin/sh',
        '-c',
        `hash=$(htpasswd -bnBC ${bcryptCost} "" "$(cat /tmp/cw-pw)" | cut -d: -f2 | tr -d '\\r\\n') && ` +
          `hex=$(printf '%s' "$hash" | od -An -tx1 | tr -d ' \\n') && ` +
          `sqlite3 ${dbPath} ` +
          `"UPDATE users SET password_hash = x'$hex', updated_at = unixepoch() WHERE username = '${adminUsername}'; SELECT changes();"`,
      ])
    },
  )

  if (String(stdout).trim() !== '1') throw new Error('ERR_NO_USER')
}
