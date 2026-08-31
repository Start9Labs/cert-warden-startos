import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { configSubpath, uiPort } from '../utils'

export const logLevels = ['debug', 'info', 'warn', 'error'] as const

const updaterSchema = z.looseObject({
  // StartOS owns updates; upstream otherwise polls for new releases on a timer.
  auto_check: z.literal(false).catch(false),
})

const shape = z.looseObject({
  // Cert Warden refuses to start when this key is absent, and migrates it
  // itself when its schema moves; seed it, never pin it.
  config_version: z.number().int().catch(5),
  bind_address: z.literal('').catch(''),
  http_port: z.literal(uiPort).catch(uiPort),
  serve_frontend: z.literal(true).catch(true),
  enable_pprof: z.literal(false).catch(false),
  log_level: z.enum(logLevels).catch('info'),
  updater: updaterSchema.catch(() => updaterSchema.parse({})),
})

export const configYaml = FileHelper.yaml(
  { base: sdk.volumes.main, subpath: configSubpath },
  shape,
)
