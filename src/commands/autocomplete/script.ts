import {Args} from '@oclif/core'
import * as path from 'node:path'

import {AutocompleteBase} from '../../base.js'

export default class Script extends AutocompleteBase {
  static args = {
    shell: Args.string({
      description: 'Shell type',
      options: ['zsh', 'bash', 'powershell'],
      required: false,
    }),
  }

  static description = 'outputs autocomplete config script for shells'

  static hidden = true

  async run() {
    const {args} = await this.parse(Script)
    const shell = args.shell ?? this.config.shell

    const binUpcase = this.cliBinEnvVar
    const shellUpcase = shell.toUpperCase()
    if (shell === 'powershell') {
      const completionFuncPath = path.join(
        this.config.cacheDir,
        'autocomplete',
        'functions',
        'powershell',
        `${this.cliBin}.ps1`,
      )
      this.log(`. ${completionFuncPath}`)
    } else {
      this.log(
        `${this.prefix}${binUpcase}_AC_${shellUpcase}_SETUP_PATH=${path.join(
          this.autocompleteCacheDir,
          `${shell}_setup`,
        )} && test -f $${binUpcase}_AC_${shellUpcase}_SETUP_PATH && source $${binUpcase}_AC_${shellUpcase}_SETUP_PATH;${
          this.suffix
        }`,
      )
    }
  }

  private get prefix(): string {
    return '\n'
  }

  private get suffix(): string {
    return ` # ${this.cliBin} autocomplete setup\n`
  }
}
