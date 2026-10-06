import { configYaml } from '../fileModels/config.yaml'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  logLevel: Value.select({
    name: i18n('Log Level'),
    description: i18n(
      'How much detail Cert Warden writes to its log.\n- Debug: everything, including the detail needed to diagnose a failed certificate order. Switch back once you are done.\n- Info: routine activity, plus warnings and errors.\n- Warning: only warnings and errors.\n- Error: only errors.',
    ),
    default: 'info',
    values: {
      debug: i18n('Debug'),
      info: i18n('Info'),
      warn: i18n('Warning'),
      error: i18n('Error'),
    },
  }),
})

export const serverSettings = sdk.Action.withInput(
  'server-settings',

  async () => ({
    name: i18n('Server Settings'),
    description: i18n(
      'Everything else — ACME providers, accounts, keys and certificates — is configured in the Cert Warden web interface.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => ({
    logLevel:
      (await configYaml.read((c) => c.log_level).const(effects)) ?? undefined,
  }),

  async ({ effects, input }) => {
    await configYaml.merge(effects, { log_level: input.logLevel })
  },
)
