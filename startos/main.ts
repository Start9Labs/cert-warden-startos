import { i18n } from './i18n'
import { sdk } from './sdk'
import { dataPath, uiPort } from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Cert Warden!'))

  return sdk.Daemons.of(effects).addDaemon('cert-warden', {
    subcontainer: sdk.SubContainer.of(
      effects,
      { imageId: 'cert-warden' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: dataPath,
        readonly: false,
      }),
      'cert-warden-sub',
    ),
    exec: { command: sdk.useEntrypoint() },
    ready: {
      display: i18n('Web Interface'),
      fn: () =>
        sdk.healthCheck.checkWebUrl(
          effects,
          `http://localhost:${uiPort}/certwarden/api/health`,
          {
            successMessage: i18n('The web interface is ready'),
            errorMessage: i18n('The web interface is not ready'),
          },
        ),
    },
    requires: [],
  })
})
