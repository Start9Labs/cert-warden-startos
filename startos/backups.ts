import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.withOptions({ exclude: ['log'] })
    .addVolume('main')
    .addVolume('startos'),
)
