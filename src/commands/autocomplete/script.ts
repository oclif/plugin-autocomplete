import * as path from 'path'

import {AutocompleteBase} from '../../base'

export default class Script extends AutocompleteBase {
  static description = 'outputs autocomplete config script for shells'

  static hidden = true

  static args = [{name: 'shell', description: 'shell type', required: false}]

  async run() {
    const {args} = await this.parse(Script)
    const shell = args.shell ?? this.config.shell
    this.errorIfNotSupportedShell(shell)

    let setupScript
    switch (shell) {
    case 'bash':
      setupScript = this.bashSetupScript
      break
    case 'zsh':
      setupScript = this.zshSetupScript
      break
    case 'powershell':
      setupScript = this.powershellSetupScript
      break
    }

    this.log(`${this.prefix}${setupScript}`)
  }

  private get prefix(): string {
    return '\n'
  }
}
