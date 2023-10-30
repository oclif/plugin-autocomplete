import {platform} from 'node:os'

export default (msg: string, cbk: () => void) =>
  platform() === 'win32' ? console.log('skipping on windows') : describe(msg, cbk)
