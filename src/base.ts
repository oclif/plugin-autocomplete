import {Command} from '@oclif/core'
import {openSync, writeSync} from 'fs'
import * as path from 'path'

export abstract class AutocompleteBase extends Command {
  public get cliBin() {
    return this.config.bin
  }

  public get cliBinEnvVar() {
    return this.config.bin.toUpperCase().replace(/-/g, '_')
  }

  public determineShell(shell: string) {
    if (!shell) {
      this.error('Missing required argument shell')
    } else if (this.isBashOnWindows(shell)) {
      return 'bash'
    } else {
      return shell
    }
  }

  public get autocompleteCacheDir(): string {
    return path.join(this.config.cacheDir, 'autocomplete')
  }

  public get acLogfilePath(): string {
    return path.join(this.config.cacheDir, 'autocomplete.log')
  }

  writeLogFile(msg: string) {
    const entry = `[${(new Date()).toISOString()}] ${msg}\n`
    const fd = openSync(this.acLogfilePath, 'a')
    writeSync(fd, entry)
  }

  private isBashOnWindows(shell: string) {
    return shell.endsWith('\\bash.exe')
  }
}
