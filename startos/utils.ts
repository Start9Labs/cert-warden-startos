import { utils } from '@start9labs/start-sdk'
import { manifest } from './manifest'

export const uiPort = 4050
export const challengePort = 4060

export const dataPath = '/app/data'
export const configSubpath = 'app/config.yaml'

export const adminUsername = 'admin'

// The replay key `createOwnTask` derives, needed to clear a task the watcher no
// longer raises.
export const taskId = (action: { id: string }) => `${manifest.id}:${action.id}`

export const getPassword = () =>
  utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 24 })
