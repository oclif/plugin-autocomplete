import * as util from 'util'
import {Config, Interfaces, Command} from '@oclif/core'

function sanitizeSummary(description?: string): string {
  if (description === undefined) {
    return ''
  }
  return (
    description
    .replace(/([`"])/g, '\\\\\\$1') // backticks and double-quotes require triple-backslashes
    // eslint-disable-next-line no-useless-escape
    .replace(/([\[\]])/g, '\\\\$1') // square brackets require double-backslashes
    .split('\n')[0]
  ) // only use the first line
}

type CommandCompletion = {
  id: string;
  summary: string;
  flags: CommandFlags;
}

type CommandFlags = {
  [name: string]: Command.Flag.Cached;
}

type Topic = {
  name: string;
  description: string;
}

export default class ZshCompWithSpaces {
  protected config: Config

  private topics: Topic[]

  private commands: CommandCompletion[]

  private coTopics: string[]

  constructor(config: Config) {
    this.config = config
    this.topics = this.getTopics()
    this.commands = this.getCommands()
    this.coTopics = this.getCoTopics()
  }

  public generate(): string {
    const firstArgs: Array<{id: string; summary?: string}> = []

    this.topics.forEach(t => {
      if (!t.name.includes(':'))
        firstArgs.push({
          id: t.name,
          summary: t.description,
        })
    })
    this.commands.forEach(c => {
      if (!firstArgs.find(a => a.id === c.id) && !c.id.includes(':'))
        firstArgs.push({
          id: c.id,
          summary: c.summary,
        })
    })

    const mainArgsCaseBlock = () => {
      let caseBlock = ''

      for (const arg of firstArgs) {
        if (this.coTopics.includes(arg.id)) {
          // coTopics already have a completion function.
          caseBlock += `\n        ${arg.id})\n          _arguments -C "*::arg:->args"\n          _${this.config.bin}_${arg.id}\n          ;;`
        } else {
          const cmd = this.commands.find(c => c.id === arg.id)

          if (cmd) {
            // if it's a command and has flags, inline flag completion statement.
            // skip it from the args statement if it doesn't accept any flag.
            if (Object.keys(cmd.flags).length > 0) {
              caseBlock += `\n        ${arg.id})\n          _arguments -C "*::arg:->args"\n          ${this.genZshFlagArgumentsBlock(cmd.flags)}         ;;`
            }
          } else {
            // it's a topic, redirect to its completion function.
            caseBlock += `\n        ${arg.id})\n          _arguments -C "*::arg:->args"\n          _${this.config.bin}_${arg.id}\n          ;;`
          }
        }
      }

      return caseBlock
    }

    let flags = '\n    --help"[Show help]" \\'
    flags += '\n    --version"[Show version]"\n  '

    const compFunc = `#compdef ${this.config.bin}

${this.topics.map(t => this.genZshTopicCompFun(t.name)).join('\n')}
_${this.config.bin}() {
  local context state state_descr line
  typeset -A opt_args

  local -a flags=(%s)

  _arguments -C "1: :->cmds" "*: :->args"

  case "$state" in
    cmds)
      %s \\
              "\${flags[@]}"
      ;;
    args)
      case $line[1] in%s
        *)
          _arguments -S \\
                     "\${flags[@]}"
          ;;
      esac
      ;;
  esac
}

_${this.config.bin}
`
    return util.format(compFunc, flags, this.genZshValuesBlock(firstArgs), mainArgsCaseBlock())
  }

  private genZshFlagArguments(flags?: CommandFlags): string[] {
    // if a command doesn't have flags make it only complete files
    // also add comp for the global `--help` flag.
    if (!flags) return ['--help"[Show help for command]" \\', '"*: :_files"']

    const flagNames = Object.keys(flags)

    const argumentsArray: string[] = []

    for (const flagName of flagNames) {
      const f = flags[flagName]

      // skip hidden flags
      if (f.hidden) continue

      f.summary = sanitizeSummary(f.summary || f.description)

      let flagSpec = ''

      if (f.type === 'option') {
        if (f.char) {
          if (f.multiple) {
            // this flag can be present multiple times on the line
            flagSpec += `"*"{-${f.char},--${f.name}}`
          } else {
            flagSpec += `"(-${f.char} --${f.name})"{-${f.char},--${f.name}}`
          }
        } else if (f.multiple) {
          // this flag can be present multiple times on the line
          flagSpec += `"*"--${f.name}`
        } else {
          flagSpec += `--${f.name}`
        }
      } else if (f.char) {
        // Flag.Boolean
        flagSpec += `"(-${f.char} --${f.name})"{-${f.char},--${f.name}}"[${f.summary}]"`
      } else {
        // Flag.Boolean
        flagSpec += `--${f.name}"[${f.summary}]"`
      }

      if (f.type === 'option') {
        flagSpec += `"[${f.summary}]`

        if (f.options) {
          flagSpec += `:${f.name} options:(${f.options?.join(' ')})"`
        } else {
          flagSpec += ':file:_files"'
        }
      }

      flagSpec += ' \\'
      argumentsArray.push(flagSpec)
    }
    // add global `--help` flag
    argumentsArray.push('--help"[Show help for command]" \\')
    // complete files if `-` is not present on the current line
    argumentsArray.push('"*: :_files"')

    return argumentsArray
  }

  private genZshFlagArgumentsBlock(flags?: CommandFlags): string {
    // `-S`:
    // Do not complete flags after a ‘--’ appearing on the line, and ignore the ‘--’. For example, with -S, in the line:
    // foobar -x -- -y
    // the ‘-x’ is considered a flag, the ‘-y’ is considered an argument, and the ‘--’ is considered to be neither.
    let argumentsBlock = '_arguments -S \\'
    this.genZshFlagArguments(flags).forEach(f => {
      argumentsBlock += `\n                     ${f}`
    })

    return argumentsBlock
  }

  private genZshValuesBlock(subArgs: Array<{id: string; summary?: string}>): string {
    let valuesBlock = '_values "completions"'

    subArgs.forEach(subArg => {
      valuesBlock += ` \\\n              "${subArg.id}[${subArg.summary}]"`
    })

    return valuesBlock
  }

  private genZshTopicCompFun(id: string): string {
    const underscoreSepId = id.replace(/:/g, '_')
    const depth = id.split(':').length

    let flags = ''

    const cflags = this.commands.find(c => c.id === id)?.flags
    this.genZshFlagArguments(cflags).forEach(f => {
      flags += `\n    ${f}`
    })
    flags += '\n  '

    let argsBlock = ''

    const subArgs: Array<{id: string; summary?: string}> = []
    this.topics
    .filter(t => t.name.startsWith(id + ':') && t.name.split(':').length === depth + 1)
    .forEach(t => {
      const subArg = t.name.split(':')[depth]

      subArgs.push({
        id: subArg,
        summary: t.description,
      })

      argsBlock += util.format('\n        "%s")\n          _arguments -C "*::arg:->args"\n          %s\n        ;;', subArg, `_${this.config.bin}_${underscoreSepId}_${subArg}`)
    })

    for (const c of this.commands.filter(c => c.id.startsWith(id + ':') && c.id.split(':').length === depth + 1)) {
      if (!this.coTopics?.includes(c.id)) {
        const subArg = c.id.split(':')[depth]

        subArgs.push({
          id: subArg,
          summary: c.summary,
        })

        const block = this.genZshFlagArgumentsBlock(c.flags)
        argsBlock += util.format('\n        "%s")\n          _arguments -C "*::arg:->args"\n          %s\n          ;;', subArg, block)
      }
    }

    const topicCompFunc = `_${this.config.bin}_${underscoreSepId}() {
  local context state state_descr line
  typeset -A opt_args

  local -a flags=(%s)

  _arguments -C "1: :->cmds" "*: :->args"

  case "$state" in
    cmds)
      %s \\
              "\${flags[@]}"
      ;;
    args)
      case $line[1] in%s
        *)
          _arguments -S \\
                     "\${flags[@]}"
          ;;
      esac
      ;;
  esac
}
`
    return util.format(topicCompFunc, flags, this.genZshValuesBlock(subArgs), argsBlock)
  }

  private getCoTopics(): string[] {
    const coTopics: string[] = []

    for (const topic of this.topics) {
      for (const cmd of this.commands) {
        if (topic.name === cmd.id) {
          coTopics.push(topic.name)
        }
      }
    }

    return coTopics
  }

  private getTopics(): Topic[] {
    const topics = this.config.topics
    .filter((topic: Interfaces.Topic) => {
      // it is assumed a topic has a child if it has children
      const hasChild = this.config.topics.some(subTopic => subTopic.name.includes(`${topic.name}:`))
      return hasChild
    })
    .sort((a, b) => {
      if (a.name < b.name) {
        return -1
      }
      if (a.name > b.name) {
        return 1
      }
      return 0
    })
    .map(t => {
      const description = t.description ? sanitizeSummary(t.description) : `${t.name.replace(/:/g, ' ')} commands`

      return {
        name: t.name,
        description,
      }
    })

    return topics
  }

  private getCommands(): CommandCompletion[] {
    const cmds: CommandCompletion[] = []

    this.config.plugins.forEach(p => {
      p.commands.forEach(c => {
        if (c.hidden) return
        const summary = sanitizeSummary(c.summary || c.description)
        const flags = c.flags
        cmds.push({
          id: c.id,
          summary,
          flags,
        })

        c.aliases.forEach(a => {
          cmds.push({
            id: a,
            summary,
            flags,
          })

          const split = a.split(':')

          let topic = split[0]

          // Completion funcs are generated from topics:
          // `force` -> `force:org` -> `force:org:open|list`
          //
          // but aliases aren't guaranteed to follow the plugin command tree
          // so we need to add any missing topic between the starting point and the alias.
          for (let i = 0; i < split.length - 1; i++) {
            if (!this.topics.find(t => t.name === topic)) {
              this.topics.push({
                name: topic,
                description: `${topic.replace(/:/g, ' ')} commands`,
              })
            }
            topic += `:${split[i + 1]}`
          }
        })
      })
    })

    return cmds
  }
}
