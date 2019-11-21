import {generate as generateBash} from '@completely/bash-generator'
import {Schema as CompletelyDescription} from '@completely/spec'
import {generate as generateZsh} from '@completely/zsh-generator'
import * as fs from 'fs-extra'
import * as path from 'path'

const debug = require('debug')('autocomplete:create')

import {AutocompleteBase} from '../../base'

type CommandCompletion = {
  id: string
  description: string
  flags: any
}

function sanitizeDescription(description?: string): string {
  if (description === undefined) {
    return ''
  }
  return description
    .replace(/([`"])/g, '\\\\\\$1') // backticks and double-quotes require triple-backslashes
    .replace(/([\[\]])/g, '\\\\$1') // square brackets require double-backslashes
    .split('\n')[0] // only use the first line
}

export default class Create extends AutocompleteBase {
  static hidden = true
  static description = 'create autocomplete setup scripts and completion functions'

  private _commands?: CommandCompletion[]

  async run() {
    this.errorIfWindows()
    // 1. ensure needed dirs
    await this.ensureDirs()
    // 2. save (generated) autocomplete files
    await this.createFiles()
  }

  private async ensureDirs() {
    // ensure autocomplete cache dir
    await fs.ensureDir(this.autocompleteCacheDir)
    // ensure autocomplete bash function dir
    await fs.ensureDir(this.bashFunctionsDir)
    // ensure autocomplete zsh function dir
    await fs.ensureDir(this.zshFunctionsDir)
  }

  private async createFiles() {
    await fs.writeFile(this.bashSetupScriptPath, this.bashSetupScript)
    await fs.writeFile(this.bashCompletionFunctionPath, this.bashCompletionFunction)
    await fs.writeFile(this.zshSetupScriptPath, this.zshSetupScript)
    await fs.writeFile(this.zshCompletionFunctionPath, this.zshCompletionFunction)
  }

  private get bashSetupScriptPath(): string {
    // <cachedir>/autocomplete/bash_setup
    return path.join(this.autocompleteCacheDir, 'bash_setup')
  }

  private get zshSetupScriptPath(): string {
    // <cachedir>/autocomplete/zsh_setup
    return path.join(this.autocompleteCacheDir, 'zsh_setup')
  }

  private get bashFunctionsDir(): string {
    // <cachedir>/autocomplete/functions/bash
    return path.join(this.autocompleteCacheDir, 'functions', 'bash')
  }

  private get zshFunctionsDir(): string {
    // <cachedir>/autocomplete/functions/zsh
    return path.join(this.autocompleteCacheDir, 'functions', 'zsh')
  }

  private get bashCompletionFunctionPath(): string {
    // <cachedir>/autocomplete/functions/bash/<bin>.bash
    return path.join(this.bashFunctionsDir, `${this.cliBin}.bash`)
  }

  private get zshCompletionFunctionPath(): string {
    // <cachedir>/autocomplete/functions/zsh/_<bin>
    return path.join(this.zshFunctionsDir, `_${this.cliBin}`)
  }

  private get bashSetupScript(): string {
    const setup = path.join(this.bashFunctionsDir, `${this.cliBin}.bash`)
    const bin = this.cliBinEnvVar
    return `${bin}_AC_BASH_COMPFUNC_PATH=${setup} && test -f \$${bin}_AC_BASH_COMPFUNC_PATH && source \$${bin}_AC_BASH_COMPFUNC_PATH;
`
  }

  private get zshSetupScript(): string {
    return `
fpath=(
${this.zshFunctionsDir}
$fpath
);
autoload -Uz compinit;
compinit;\n`
  }

  private get commands(): CommandCompletion[] {
    if (this._commands) return this._commands

    const plugins = this.config.plugins
    let cmds: CommandCompletion[] = []

    plugins.map(p => {
      p.commands.map(c => {
        try {
          if (c.hidden) return
          cmds.push({
            id: c.id,
            description: sanitizeDescription(c.description || ''),
            flags: c.flags,
          })
        } catch (err) {
          debug(`Error creating zsh flag spec for command ${c.id}`)
          debug(err.message)
          this.writeLogFile(err.message)
        }
      })
    })

    this._commands = cmds

    return this._commands
  }

    private get buildDescription(): CompletelyDescription {
      const subcommands = this.commands
        .map(command => {
          const flags = Object.entries(command.flags).map(([key, value]: any) => {
            const flag: any = {
              name: key,
              type: value.type === 'option' ? 'string' : 'boolean',
            }
            if (flag.type === 'string') {
              flag.completion = {
                type: 'any'
              }
              if (value.options) {
                flag.completion.type = 'oneOf'
                flag.completion.values = value.options
              }
            }

            return flag
          })

          return {
            command: command.id,
            flags,
            args: []
          }
        })

      return {
        command: this.cliBin,
        subcommands
      }
    }

    private get bashCompletionFunction(): string {
      const bashScript = generateBash(this.buildDescription)

      return bashScript
    }

    private get zshCompletionFunction(): string {
      const zshScript = generateZsh(this.buildDescription)

      return zshScript
    }
}
