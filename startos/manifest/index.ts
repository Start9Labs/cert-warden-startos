import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'cert-warden',
  title: 'Cert Warden',
  license: 'custom',
  packageRepo: 'https://github.com/Start9Labs/cert-warden-startos',
  upstreamRepo: 'https://github.com/gregtwallace/certwarden',
  marketingUrl: 'https://www.certwarden.com',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'startos'],
  images: {
    'cert-warden': {
      source: { dockerTag: 'ghcr.io/gregtwallace/certwarden:v0.29.7' },
      arch: ['x86_64', 'aarch64'],
    },
    sqlite: {
      source: { dockerBuild: { dockerfile: 'Dockerfile.sqlite' } },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
