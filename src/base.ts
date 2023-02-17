import {Command} from '@oclif/core'
import * as fs from 'fs-extra'
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

  public errorIfWindows() {
    if (this.config.windows && !this.isBashOnWindows(this.config.shell)) {
      throw new Error('Autocomplete is not currently supported in Windows')
    }
  }

  public errorIfNotSupportedShell(shell: string) {
    if (!shell) {
      this.error('Missing required argument shell')
    }
    this.errorIfWindows()
    if (!['bash', 'zsh'].includes(shell)) {
      throw new Error(`${shell} is not a supported shell for autocomplete`)
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
    const fd = fs.openSync(this.acLogfilePath, 'a')
    fs.write(fd, entry)
  }

  private isBashOnWindows(shell: string) {
    return shell.endsWith('\\bash.exe')
  }
}
