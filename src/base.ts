import {Command} from '@oclif/core'
import * as fs from 'fs-extra'
import * as path from 'path'

export abstract class AutocompleteBase extends Command {
  public get cliBin() {
    return this.config.bin
  }

  public get cliBinEnvVar() {
    return this.config.bin.toUpperCase().replace('-', '_')
  }

  public get autocompleteCacheDir(): string {
    return path.join(this.config.cacheDir, 'autocomplete')
  }

  public get acLogfilePath(): string {
    return path.join(this.config.cacheDir, 'autocomplete.log')
  }

  public autocompleteSetupScriptPath(shell: string): string {
    // <cachedir>/autocomplete/<shell>_setup
    return path.join(this.autocompleteCacheDir, `${shell}_setup`)
  }

  public autocompleteFunctionDir(shell: string): string {
    // <cachedir>/autocomplete/functions/<shell>
    return path.join(this.autocompleteCacheDir, 'functions', shell)
  }

  public get bashCompletionFunctionPath(): string {
    // <cachedir>/autocomplete/functions/bash/<bin>.bash
    return path.join(this.autocompleteFunctionDir('bash'), `${this.cliBin}.bash`)
  }

  public get zshCompletionFunctionPath(): string {
    // <cachedir>/autocomplete/functions/zsh/_<bin>
    return path.join(this.autocompleteFunctionDir('zsh'), `_${this.cliBin}`)
  }

  public get powershellCompletionFunctionPath(): string {
    // <cachedir>/autocomplete/functions/powershell/<bin>.ps1
    return path.join(this.autocompleteFunctionDir('powershell'), `${this.cliBin}.ps1`)
  }

  public get bashSetupScript(): string {
    const envVar = this.completionFunctionPathEnvVar('bash')
    /* eslint-disable-next-line no-useless-escape */
    return `${envVar}=${this.bashCompletionFunctionPath} && test -f \$${envVar} && source \$${envVar};`
  }

  public get zshSetupScript(): string {
    return `
fpath=(
${this.autocompleteFunctionDir('zsh')}
$fpath
);
autoload -Uz compinit;
compinit;\n`
  }

  public get powershellSetupScript(): string {
    const envVar = this.completionFunctionPathEnvVar('powershell')
    return `$env:${envVar}="${this.powershellCompletionFunctionPath}"; .$env:${envVar}`
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

  public errorIfNotSupportedShell(shell: string) {
    if (!shell) {
      this.error('Missing required argument shell')
    }
    if (!['bash', 'zsh', 'powershell'].includes(shell)) {
      throw new Error(`${shell} is not a supported shell for autocomplete`)
    }
  }

  public writeLogFile(msg: string) {
    const entry = `[${(new Date()).toISOString()}] ${msg}\n`
    const fd = fs.openSync(this.acLogfilePath, 'a')
    fs.write(fd, entry)
  }

  // Returns the name of an environment variable that points to the completion function file for the given shell.
  private completionFunctionPathEnvVar(shell: string): string {
    const binUpcase = this.cliBinEnvVar
    const shellUpcase = shell.toUpperCase()
    return `${binUpcase}_AC_${shellUpcase}_COMPFUNC_PATH`
  }

  private isBashOnWindows(shell: string) {
    return shell.endsWith('\\bash.exe')
  }
}
