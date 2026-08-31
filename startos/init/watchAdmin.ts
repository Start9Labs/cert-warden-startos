import { setAdminPassword } from '../actions/setAdminPassword'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { taskId } from '../utils'

export const watchAdmin = sdk.setupOnInit(async (effects) => {
  const adminPassword = await storeJson
    .read((s) => s.adminPassword)
    .const(effects)

  if (adminPassword) {
    await sdk.action.clearTask(effects, taskId(setAdminPassword))
    return
  }

  await sdk.action.createOwnTask(effects, setAdminPassword, 'critical', {
    reason: i18n(
      'Set your Cert Warden password. Until you do, the account still has the password it ships with.',
    ),
  })
})
