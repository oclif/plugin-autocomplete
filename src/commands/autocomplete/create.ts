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
    .replace(/(`)/g, '\\\\\\$1') // backticks require triple-backslashes
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
            flags: c.flags
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

  private genZshFlagSpecs(Klass: any): string {
    return Object.keys(Klass.flags || {})
      .filter(flag => Klass.flags && !Klass.flags[flag].hidden)
      .map(flag => {
        const f = (Klass.flags && Klass.flags[flag]) || {description: ''}
        const isBoolean = f.type === 'boolean'
        const name = isBoolean ? flag : `${flag}=-`
        let valueCmpl = isBoolean ? '' : ':'
        const completion = `--${name}[${sanitizeDescription(f.description)}]${valueCmpl}`
        return `"${completion}"`
      })
      .join('\n')
  }

    private get genAllCommandsMetaString(): string {
      return this.commands.map(c => {
        return `\"${c.id.replace(/:/g, '\\:')}:${c.description}\"`
      }).join('\n')
    }

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

    private genCmdPublicFlags(Command: CommandCompletion): string {
      let Flags = Command.flags || {}
      return Object.keys(Flags)
        .filter(flag => !Flags[flag].hidden)
        .map(flag => `--${flag}`)
        .join(' ')
    }

    private get bashCommandsWithFlagsList(): string {
      return this.commands.map(c => {
        const publicFlags = this.genCmdPublicFlags(c).trim()
        return `${c.id} ${publicFlags}`
      }).join('\n')
    }

    private get bashCompletionFunction(): string {
      const cliBin = this.cliBin

      return `#!/usr/bin/env bash

if ! type __ltrim_colon_completions >/dev/null 2>&1; then
  #   Copyright © 2006-2008, Ian Macdonald <ian@caliban.org>
  #             © 2009-2017, Bash Completion Maintainers
  __ltrim_colon_completions() {
      # If word-to-complete contains a colon,
      # and bash-version < 4,
      # or bash-version >= 4 and COMP_WORDBREAKS contains a colon
      if [[
          "$1" == *:* && (
              \${BASH_VERSINFO[0]} -lt 4 ||
              (\${BASH_VERSINFO[0]} -ge 4 && "$COMP_WORDBREAKS" == *:*)
          )
      ]]; then
          # Remove colon-word prefix from COMPREPLY items
          local colon_word=\${1%\${1##*:}}
          local i=\${#COMPREPLY[*]}
          while [ $((--i)) -ge 0 ]; do
              COMPREPLY[$i]=\${COMPREPLY[$i]#"$colon_word"}
          done
      fi
  }
fi

_${cliBin}()
{

  local cur="\${COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
${this.bashCommandsWithFlagsList}
"

  if [[ "\${COMP_CWORD}" -eq 1 ]] ; then
      opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
      COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
       __ltrim_colon_completions "$cur"
  else
      if [[ $cur == "-"* ]] ; then
        opts=$(printf "$commands" | grep "\${COMP_WORDS[1]}" | sed -n "s/^\${COMP_WORDS[1]} //p")
        COMPREPLY=( $(compgen -W  "\${opts}" -- \${cur}) )
      fi
  fi
  return 0
}

complete -F _${cliBin} ${cliBin}
`
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
    fi
  fi


  _arguments -S '1: :_complete_commands' \\
                $_command_flags
}

_${cliBin}
`
    }
}
