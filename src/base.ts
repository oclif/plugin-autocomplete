import {Command} from '@oclif/core'
import {mkdirSync, openSync, writeSync} from 'node:fs'
import path from 'node:path'

export abstract class AutocompleteBase extends Command {
  public get acLogfilePath(): string {
    return path.join(this.config.cacheDir, 'autocomplete.log')
  }

  public get autocompleteCacheDir(): string {
    return path.join(this.config.cacheDir, 'autocomplete')
  }

  public get cliBin() {
    return this.config.bin
  }

  public get cliBinEnvVar() {
    return this.config.bin.toUpperCase().replaceAll('-', '_')
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

  public getSetupEnvVar(shell: string): string {
    return `${this.cliBinEnvVar}_AC_${shell.toUpperCase()}_SETUP_PATH`
  }

  writeLogFile(msg: string) {
    mkdirSync(this.config.cacheDir, {recursive: true})
    const entry = `[${new Date().toISOString()}] ${msg}\n`
    const fd = openSync(this.acLogfilePath, 'a')
    writeSync(fd, entry)
  }

  private isBashOnWindows(shell: string) {
    return shell.endsWith('\\bash.exe')
  }
}
