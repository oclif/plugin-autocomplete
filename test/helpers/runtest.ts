import {platform} from 'node:os'

// eslint-disable-next-line mocha/no-exports, unicorn/no-anonymous-default-export
export default (msg: string, cbk: () => void) =>
  platform() === 'win32' ? console.log('skipping on windows') : describe(msg, cbk)
