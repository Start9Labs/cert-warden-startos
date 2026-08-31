export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Cert Warden!': 0,
  'Web Interface': 1,
  'The web interface is ready': 2,
  'The web interface is not ready': 3,
  // interfaces.ts
  'Web UI': 4,
  'The web interface of Cert Warden': 5,
  'Download API': 6,
  'Base URL your devices fetch their keys and certificates from, each with its own API key': 7,
  'HTTP-01 Challenge Server': 8,
  'Answers ACME http-01 challenges. Only needed if you use the http-01 challenge method': 9,
  // init/watchAdmin.ts
  'Set your Cert Warden password. Until you do, the account still has the password it ships with.': 10,
  // actions/setAdminPassword.ts
  'Set Admin Password': 11,
  'Generate a new password for the Cert Warden admin account. Use this to take ownership of a new install, to rotate, or to get back in if you have lost the password. The password is shown once, here.': 12,
  'Cert Warden did not start up. Check the service logs.': 13,
  'Failed to set the Cert Warden password.': 14,
  'Login Credentials': 15,
  'Save this password now \u2014 it is not shown again. Run this action to replace it.': 16,
  Username: 17,
  Password: 18,
  // actions/serverSettings.ts
  'Server Settings': 19,
  'Everything else \u2014 ACME providers, accounts, keys and certificates \u2014 is configured in the Cert Warden web interface.': 20,
  'Log Level': 21,
  'How much detail Cert Warden writes to its log. Raise it to debug when diagnosing a failed certificate order.': 22,
  Debug: 23,
  Info: 24,
  Warning: 25,
  Error: 26,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
