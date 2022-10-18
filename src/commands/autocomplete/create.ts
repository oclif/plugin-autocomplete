import * as fs from 'fs-extra'

import bashAutocomplete from '../../autocomplete/bash'
import bashAutocompleteWithSpaces from '../../autocomplete/bash-spaces'
import powershellAutocomplete from '../../autocomplete/powershell'
import {AutocompleteBase} from '../../base'

const debug = require('debug')('autocomplete:create')

type CommandCompletion = {
  id: string;
  description: string;
  flags: any;
}

function sanitizeDescription(description?: string): string {
  if (description === undefined) {
    return ''
  }
  return description
  .replace(/([`"])/g, '\\\\\\$1') // backticks and double-quotes require triple-backslashes
  // eslint-disable-next-line no-useless-escape
  .replace(/([\[\]])/g, '\\\\$1') // square brackets require double-backslashes
  .split('\n')[0] // only use the first line
}

export default class Create extends AutocompleteBase {
  static hidden = true

  static args = [{name: 'shell', description: 'The shell for which to create an autocomplete script', required: false}]

  static description = 'create autocomplete setup scripts and completion functions'

  private _commands?: CommandCompletion[]

  async run() {
    const {args} = await this.parse(Create)
    this.errorIfNotSupported(args.shell ?? this.config.shell)
    // 1. ensure needed dirs
    await this.ensureDirs(args.shell ?? this.config.shell)
    // 2. save (generated) autocomplete files
    await this.createFiles(args.shell ?? this.config.shell)
  }

  private async ensureDirs(shell: string) {
    // ensure autocomplete cache dir
    await fs.ensureDir(this.autocompleteCacheDir)
    // ensure autocomplete function dir
    await fs.ensureDir(this.autocompleteFunctionDir(shell))
  }

  private async createFiles(shell: string) {
    switch (shell) {
    case 'bash':
      // TODO: remove this commented line and other code that references a bashSetupScript, it's not needed anymore
      // await fs.writeFile(this.autocompleteSetupScriptPath(shell), this.bashSetupScript)
      await fs.writeFile(this.bashCompletionFunctionPath, this.bashCompletionFunction)
      break
    case 'zsh':
      // TODO: remove this commented line and other code that references a zshSetupScript, it's not needed anymore
      // await fs.writeFile(this.autocompleteSetupScriptPath(shell), this.zshSetupScript)
      await fs.writeFile(this.zshCompletionFunctionPath, this.zshCompletionFunction)
      break
    case 'powershell':
      // TODO: remove this commented line and other code that references a powershellSetupScript, it's not needed anymore
      // await fs.writeFile(this.autocompleteSetupScriptPath(shell), this.powershellSetupScript)
      await fs.writeFile(this.powershellCompletionFunctionPath, this.powershellCompletionFunction)
      break
    }
  }

  private get commands(): CommandCompletion[] {
    if (this._commands) return this._commands

    const plugins = this.config.plugins
    const cmds: CommandCompletion[] = []

    plugins.forEach(p => {
      p.commands.forEach(c => {
        try {
          if (c.hidden) return
          const description = sanitizeDescription(c.description || '')
          const flags = c.flags
          cmds.push({
            id: c.id,
            description,
            flags,
          })
          c.aliases.forEach(a => {
            cmds.push({
              id: a,
              description,
              flags,
            })
          })
        } catch (error: any) {
          debug(`Error creating zsh flag spec for command ${c.id}`)
          debug(error.message)
          this.writeLogFile(error.message)
        }
      })
    })

    this._commands = cmds

    return this._commands
  }

  /* eslint-disable no-useless-escape */
  private get genAllCommandsMetaString(): string {
    return this.commands.map(c => {
      return `\"${c.id.replace(/:/g, '\\:')}:${c.description}\"`
    }).join('\n')
  }
  /* eslint-enable no-useless-escape */

  private get genCaseStatementForFlagsMetaString(): string {
    // command)
    //   _command_flags=(
    //   "--boolean[bool descr]"
    //   "--value=-[value descr]:"
    //   )
    // ;;
    return this.commands.map(c => {
      return `${c.id})
  _command_flags=(
    ${this.genZshFlagSpecs(c)}
  )
;;\n`
    }).join('\n')
  }

  private get bashCommandsWithFlagsList(): string {
    return this.commands.map(c => {
      const publicFlags = this.genCmdPublicFlags(c).trim()
      return `${c.id} ${publicFlags}`
    }).join('\n')
  }

  private get bashCompletionFunction(): string {
    const cliBin = this.cliBin
    const bashScript = this.config.topicSeparator === ' ' ? bashAutocompleteWithSpaces : bashAutocomplete
    return bashScript.replace(/<CLI_BIN>/g, cliBin).replace(/<BASH_COMMANDS_WITH_FLAGS_LIST>/g, this.bashCommandsWithFlagsList)
  }

  private get zshCompletionFunction(): string {
    const cliBin = this.cliBin
    const allCommandsMeta = this.genAllCommandsMetaString
    const caseStatementForFlagsMeta = this.genCaseStatementForFlagsMetaString

    return `#compdef ${cliBin}

_${cliBin} () {
  local _command_id=\${words[2]}
  local _cur=\${words[CURRENT]}
  local -a _command_flags=()

  ## public cli commands & flags
  local -a _all_commands=(
${allCommandsMeta}
  )

  _set_flags () {
    case $_command_id in
${caseStatementForFlagsMeta}
    esac
  }
  ## end public cli commands & flags

  _complete_commands () {
    _describe -t all-commands "all commands" _all_commands
  }

  if [ $CURRENT -gt 2 ]; then
    if [[ "$_cur" == -* ]]; then
      _set_flags
    else
      _path_files
    fi
  fi


  _arguments -S '1: :_complete_commands' \\
                $_command_flags
}

_${cliBin}
`
  }

  private get powershellCommands(): string {
    return this.commands.map(c => c.id.replace(/:/g, this.config.topicSeparator)).sort().join(',')
  }

  private get powershellCompletionFunction(): string {
    const cliBin = this.cliBin
    const powershellScript = powershellAutocomplete
    return powershellScript.replace(/<CLI_BIN>/g, cliBin).replace(/<POWERSHELL_COMMANDS_WITH_FLAGS_LIST>/g, this.powershellCommands)
  }

  private genCmdPublicFlags(Command: CommandCompletion): string {
    const Flags = Command.flags || {}
    return Object.keys(Flags)
    .filter(flag => !Flags[flag].hidden)
    .map(flag => `--${flag}`)
    .join(' ')
  }

  private genZshFlagSpecs(Klass: any): string {
    return Object.keys(Klass.flags || {})
    .filter(flag => Klass.flags && !Klass.flags[flag].hidden)
    .map(flag => {
      const f = (Klass.flags && Klass.flags[flag]) || {description: ''}
      const isBoolean = f.type === 'boolean'
      const name = isBoolean ? flag : `${flag}=-`
      const valueCmpl = isBoolean ? '' : ':'
      const completion = `--${name}[${sanitizeDescription(f.description)}]${valueCmpl}`
      return `"${completion}"`
    })
    .join('\n')
  }
}
