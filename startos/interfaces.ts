import { i18n } from './i18n'
import { sdk } from './sdk'
import { challengePort, uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const serverMulti = sdk.MultiHost.of(effects, 'server-multi')
  const serverOrigin = await serverMulti.bindPort(uiPort, { protocol: 'http' })

  const ui = sdk.createInterface(effects, {
    name: i18n('Web UI'),
    id: 'ui',
    description: i18n('The web interface of Cert Warden'),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const api = sdk.createInterface(effects, {
    name: i18n('Download API'),
    id: 'api',
    description: i18n(
      'Base URL your devices fetch their keys and certificates from, each with its own API key',
    ),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '/certwarden/api/v1/download/',
    query: {},
  })

  // ACME servers validate http-01 on port 80 of the name being issued.
  const challengeMulti = sdk.MultiHost.of(effects, 'challenge-multi')
  const challengeOrigin = await challengeMulti.bindPort(challengePort, {
    protocol: 'http',
    preferredExternalPort: 80,
  })

  const challenge = sdk.createInterface(effects, {
    name: i18n('HTTP-01 Challenge Server'),
    id: 'challenge',
    description: i18n(
      'Answers ACME http-01 challenges. Only needed if you use the http-01 challenge method',
    ),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [
    await serverOrigin.export([ui, api]),
    await challengeOrigin.export([challenge]),
  ]
})
