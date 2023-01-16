import * as path from 'path'
import * as util from 'util'

import * as fs from 'fs-extra'
import * as _ from 'lodash'

import bashAutocomplete from '../../autocomplete/bash'
import bashAutocompleteWithSpaces from '../../autocomplete/bash-spaces'
import {AutocompleteBase} from '../../base'
import {Interfaces } from '@oclif/core'

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
    await fs.writeFile(this.zshCompletionFunctionPath, this.zshCompletionWithSpacesFunction)
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
    /* eslint-disable-next-line no-useless-escape */
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

  // TODO: handle commands without flags
  // private genZshCmdFlagsCompFun(id: string, skipFunc: boolean = false): string {
  //   const command = this.config.findCommand(id,{must:true})
  //
  //   const flagNames = Object.keys(command.flags)
  //   let flagsComp=''
  //
  //   for (const flagName of flagNames){
  //     const flag = command.flags[flagName]
  //
  //     if (flag.char) {
  //       flagsComp+=`    {-${flag.char},--${flagName}}'[${sanitizeDescription(flag.summary ||flag.description)}]' \\\n`
  //     } else {
  //       flagsComp+=`    --${flagName}'[${sanitizeDescription(flag.summary || flag.description)}]' \\\n`
  //     }
  //   }
  //   if (skipFunc) {
  //     return flagsComp
  //   }
  //       
  //   return util.format(`_${this.cliBin}_${command.id.replace(/:/g,'_')}() {  \n  _arguments -S \\\n%s}`, flagsComp)
  // }

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

  private genCmdPublicFlags(Command: CommandCompletion): string {
    const Flags = Command.flags || {}
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
    const bashScript = this.config.topicSeparator === ' ' ? bashAutocompleteWithSpaces : bashAutocomplete
    return bashScript.replace(/<CLI_BIN>/g, cliBin).replace(/<BASH_COMMANDS_WITH_FLAGS_LIST>/g, this.bashCommandsWithFlagsList)
  }


  private get zshCompletionWithSpacesFunction(): string {
    const valueTemplate = `        "%s[%s]" \\\n`
    const argTemplate = `        "%s")\n          %s\n        ;;\n`

    // TODO:
    // * include command aliases
    // * ignore hidden commands
    const commands = this.config.commands
      .map(c=>{
        c.description = sanitizeDescription(c.summary || c.description || '')
        return c
      })
      .sort((a, b) => {
        if (a.id < b.id) {
          return -1;
        }
        if (a.id > b.id) {
          return 1;
        }
        return 0;
      });

    let topics = this.config.topics.filter((topic: Interfaces.Topic) => {
      // it is assumed a topic has a child if it has children
      const hasChild = this.config.topics.some(subTopic => subTopic.name.includes(`${topic.name}:`))
      return hasChild
    })
      .sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      })
      .map(t=> {
        return {
          name: t.name,
          description: sanitizeDescription(t.description)
        }
      })


    const genZshTopicCompFun = (id: string): string => {
      const underscoreSepId = id.replace(/:/g,'_')
      const depth = id.split(':').length

      let valuesBlock = ''
      let argsBlock = ''

      topics
        .filter(t => t.name.startsWith(id + ':') && t.name.split(':').length === depth + 1)
        .forEach(t => {
          const subArg = t.name.split(':')[depth]

          valuesBlock+=util.format(valueTemplate,subArg,t.description)
          argsBlock+= util.format(argTemplate,subArg,`_${this.cliBin}_${underscoreSepId}_${subArg}`) 
        })

      commands
        .filter(c => c.id.startsWith(id + ':') && c.id.split(':').length === depth + 1)
        .forEach(c => {
          const subArg = c.id.split(':')[depth]

          // TODO: skip commands without flags
          const flagNames = Object.keys(c.flags)
          let flagsComp=''

          for (const flagName of flagNames){
            const f = c.flags[flagName]

            let flagCompValue = '            '

            // Flag.Option
            if (f.type ==='option') {
              if (f.char) {
                if (f.multiple) {
                  flagCompValue += `*{-${f.char},--${f.name}}`
                } else {
                  flagCompValue += `"(-${f.char} --${f.name})"{-${f.char},--${f.name}}`
                }

                flagCompValue += `"[${sanitizeDescription(f.summary || f.description)}]`

                if (f.options) {
                  flagCompValue += `:${f.name} options:(${f.options?.join(' ')})"`
                } else {
                  flagCompValue += ':"'
                }
              } else {
                if (f.multiple) {
                  flagCompValue += '"*"'
                }

                flagCompValue += `--${f.name}"[${sanitizeDescription(f.summary || f.description)}]:`

                if (f.options) {
                  flagCompValue += `${f.name} options:(${f.options.join(' ')})"`
                } else {
                  flagCompValue += '"'
                }
              }
            } else {
              // Flag.Boolean
              if (f.char) {
                flagCompValue += `"(-${f.char} --${f.name})"{-${f.char},--${f.name}}"[${sanitizeDescription(f.summary || f.description)}]"`
              } else {
                flagCompValue+=`--${f.name}"[${sanitizeDescription(f.summary || f.description)}]"`
              }
            } 
            
            flagCompValue += ` \\\n`
            flagsComp += flagCompValue
          }

          valuesBlock+=util.format(valueTemplate,subArg,c.description)

          const flagArgsTemplate = `        "%s")\n          _arguments -S \\\n%s\n        ;;\n`
          argsBlock+= util.format(flagArgsTemplate,subArg,flagsComp) 
        })

      const topicCompFunc =
`_${this.cliBin}_${underscoreSepId}() {
  local line state

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
      _values "${this.cliBin} command" \\
%s
      ;;
    args)
      case $line[1] in
%s
      esac
      ;;
  esac 
}
`

      return util.format(topicCompFunc, valuesBlock, argsBlock)
    }

    const compFunc =
`#compdef ${this.cliBin}

${topics.map(t=> {
  if (t.name.includes('data')) {
    return genZshTopicCompFun(t.name)
  }
}).join('\n')}

${genZshTopicCompFun('force')}

_sfdx() {
  local line state

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
      cmds)
          _values "${this.cliBin} command" \\
                  "force[force stuff]" \\
                  "data[data stuff]"
          ;;
      args)
          case $line[1] in
              data)
                  _sfdx_data
                  ;;
              force)
                  _sfdx_force
                  ;;
          esac
          ;;
  esac
}

_${this.cliBin}
`
  return compFunc
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
}
