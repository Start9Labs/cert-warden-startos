import { setAdminPassword as applyPassword } from '../certwardenDb'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { adminUsername, getPassword } from '../utils'

export const setAdminPassword = sdk.Action.withoutInput(
  'set-admin-password',

  {
    name: i18n('Set Admin Password'),
    description: i18n(
      'Generate a new password for the Cert Warden admin account. Use this to take ownership of a new install, to rotate, or to get back in if you have lost the password. The password is shown once, here.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  },

  async ({ effects }) => {
    const password = getPassword()

    try {
      await applyPassword(effects, password)
    } catch (e) {
      const code = e instanceof Error ? e.message : String(e)
      if (code.startsWith('ERR_DB_INIT')) {
        throw new Error(
          i18n('Cert Warden did not start up. Check the service logs.'),
        )
      }
      throw new Error(i18n('Failed to set the Cert Warden password.'))
    }

    await storeJson.merge(effects, { adminPassword: password })

    return {
      version: '1',
      title: i18n('Login Credentials'),
      message: i18n(
        'Save this password now — it is not shown again. Run this action to replace it.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: null,
            value: adminUsername,
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: password,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
