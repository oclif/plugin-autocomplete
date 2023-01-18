import {Args} from '@oclif/core'
import * as path from 'path'

import {AutocompleteBase} from '../../base'

export default class Script extends AutocompleteBase {
  static description = 'outputs autocomplete config script for shells'

  static hidden = true

  static args = {
    shell: Args.string({description: 'shell type', required: false}),
  }

  async run() {
    const {args} = await this.parse(Script)
    const shell = args.shell || this.config.shell
    this.errorIfNotSupportedShell(shell)

    const binUpcase = this.cliBinEnvVar.replace(/-/g, '_')
    const shellUpcase = shell.toUpperCase()
    this.log(
      `${this.prefix}${binUpcase}_AC_${shellUpcase}_SETUP_PATH=${path.join(
        this.autocompleteCacheDir,
        `${shell}_setup`,
      )} && test -f $${binUpcase}_AC_${shellUpcase}_SETUP_PATH && source $${binUpcase}_AC_${shellUpcase}_SETUP_PATH;${this.suffix}`,
    )
  }

  private get prefix(): string {
    return '\n'
  }

  private get suffix(): string {
    return ` # ${this.cliBin} autocomplete setup\n`
  }
}
