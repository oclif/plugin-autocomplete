import * as path from 'path'

import {AutocompleteBase} from '../../base'

export default class Script extends AutocompleteBase {
  static description = 'outputs autocomplete config script for shells'
  static hidden = true
  static args = [{name: 'shell', description: 'shell type', required: false}]

  async run() {
    this.errorIfWindows()

    const {args} = this.parse(Script)
    const shell = args.shell || this.config.shell

    if (!shell) {
      this.error('Missing required argument shell')
    }

    this.errorIfNotSupportedShell(shell)

    let binUpcase = this.config.bin.toUpperCase()
    let shellUpcase = shell.toUpperCase()
    this.log(
      `${this.prefix}${binUpcase}_AC_${shellUpcase}_SETUP_PATH=${path.join(
        this.autocompleteCacheDir,
        `${shell}_setup`,
      )} && test -f $${binUpcase}_AC_${shellUpcase}_SETUP_PATH && source $${binUpcase}_AC_${shellUpcase}_SETUP_PATH;`,
    )
  }

  private get prefix(): string {
    return `\n# ${this.config.bin} autocomplete setup\n`
  }
}
