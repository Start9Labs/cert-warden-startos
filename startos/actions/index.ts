import { sdk } from '../sdk'
import { serverSettings } from './serverSettings'
import { setAdminPassword } from './setAdminPassword'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(serverSettings)
