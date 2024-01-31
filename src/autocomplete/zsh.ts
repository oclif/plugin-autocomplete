import {Command, Config, Interfaces} from '@oclif/core'
import * as ejs from 'ejs'
import {execSync} from 'node:child_process'
import * as util from 'node:util'

const argTemplate = '        "%s")\n          %s\n        ;;\n'

type CommandCompletion = {
  flags: CommandFlags
  id: string
  summary: string
}

type CommandFlags = {
  [name: string]: Command.Flag.Cached
}

type Topic = {
  description: string
  name: string
}

export default class ZshCompWithSpaces {
  protected config: Config

  private _coTopics?: string[]

  private commands: CommandCompletion[]

  private orgs: string[]

  private topics: Topic[]

  constructor(config: Config) {
    this.config = config
    this.topics = this.getTopics()
    this.commands = this.getCommands()
    this.orgs = this.getOrgs()
  }

  public generate(): string {
    const firstArgs: {id: string; summary?: string}[] = []

    for (const t of this.topics) {
      if (!t.name.includes(':'))
        firstArgs.push({
          id: t.name,
          summary: t.description,
        })
    }

    for (const c of this.commands) {
      if (!firstArgs.some((a) => a.id === c.id) && !c.id.includes(':'))
        firstArgs.push({
          id: c.id,
          summary: c.summary,
        })
    }

    const mainArgsCaseBlock = () => {
      let caseBlock = 'case $line[1] in\n'

      for (const arg of firstArgs) {
        if (this.coTopics.includes(arg.id)) {
          // coTopics already have a completion function.
          caseBlock += `${arg.id})\n  _${this.config.bin}_${arg.id}\n  ;;\n`
        } else {
          const cmd = this.commands.find((c) => c.id === arg.id)

          if (cmd) {
            // if it's a command and has flags, inline flag completion statement.
            // skip it from the args statement if it doesn't accept any flag.
            if (Object.keys(cmd.flags).length > 0) {
              caseBlock += `${arg.id})\n${this.genZshFlagArgumentsBlock(cmd.flags)} ;; \n`
            }
          } else {
            // it's a topic, redirect to its completion function.
            caseBlock += `${arg.id})\n  _${this.config.bin}_${arg.id}\n  ;;\n`
          }
        }
      }

      caseBlock += 'esac\n'

      return caseBlock
    }

    return `#compdef ${this.config.bin}
${this.config.binAliases?.map((a) => `compdef ${a}=${this.config.bin}`).join('\n') ?? ''}

_orgs(){
  local orgs
  orgs=(
    ${this.genOrgs()}
  )
    
  _describe -t orgs 'orgs' orgs && return 0
}

${this.topics.map((t) => this.genZshTopicCompFun(t.name)).join('\n')}

_${this.config.bin}() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
      ${this.genZshValuesBlock(firstArgs)}
    ;;
    args)
      ${mainArgsCaseBlock()}
    ;;
  esac
}

_${this.config.bin}
`
  }

  private get coTopics(): string[] {
    if (this._coTopics) return this._coTopics

    const coTopics: string[] = []

    for (const topic of this.topics) {
      for (const cmd of this.commands) {
        if (topic.name === cmd.id) {
          coTopics.push(topic.name)
        }
      }
    }

    this._coTopics = coTopics

    return this._coTopics
  }

  private genOrgs(): string {
    return this.orgs.join('\n')
  }

  private genZshFlagArgumentsBlock(flags?: CommandFlags): string {
    // if a command doesn't have flags make it only complete files
    // also add comp for the global `--help` flag.
    if (!flags) return '_arguments -S \\\n --help"[Show help for command]" "*: :_files'

    const flagNames = Object.keys(flags)

    // `-S`:
    // Do not complete flags after a ‘--’ appearing on the line, and ignore the ‘--’. For example, with -S, in the line:
    // foobar -x -- -y
    // the ‘-x’ is considered a flag, the ‘-y’ is considered an argument, and the ‘--’ is considered to be neither.
    let argumentsBlock = '_arguments -S \\\n'

    for (const flagName of flagNames) {
      const f = flags[flagName]

      // skip hidden flags
      if (f.hidden) continue

      const flagSummary = this.sanitizeSummary(f.summary ?? f.description)

      let flagSpec = ''

      if (f.type === 'option') {
        if (f.char) {
          // eslint-disable-next-line unicorn/prefer-ternary
          if (f.multiple) {
            // this flag can be present multiple times on the line
            flagSpec += `"*"{-${f.char},--${f.name}}`
          } else {
            flagSpec += `"(-${f.char} --${f.name})"{-${f.char},--${f.name}}`
          }

          flagSpec += `"[${flagSummary}]`

          flagSpec += f.options
            ? `:${f.name} options:(${f.options?.join(' ')})"`
            : f.name === 'target-org'
              ? ':org:_orgs"'
              : ':file:_files"'
        } else {
          if (f.multiple) {
            // this flag can be present multiple times on the line
            flagSpec += '"*"'
          }

          flagSpec += `--${f.name}"[${flagSummary}]:`

          flagSpec += f.options
            ? `${f.name} options:(${f.options.join(' ')})"`
            : f.name === 'target-org'
              ? ':org:_orgs"'
              : ':file:_files"'
        }
      } else if (f.char) {
        // Flag.Boolean
        flagSpec += `"(-${f.char} --${f.name})"{-${f.char},--${f.name}}"[${flagSummary}]"`
      } else {
        // Flag.Boolean
        flagSpec += `--${f.name}"[${flagSummary}]"`
      }

      flagSpec += ' \\\n'
      argumentsBlock += flagSpec
    }

    // add global `--help` flag
    argumentsBlock += '--help"[Show help for command]" \\\n'
    // complete files if `-` is not present on the current line
    argumentsBlock += '"*: :_files"'

    return argumentsBlock
  }

  private genZshTopicCompFun(id: string): string {
    const coTopics: string[] = []

    for (const topic of this.topics) {
      for (const cmd of this.commands) {
        if (topic.name === cmd.id) {
          coTopics.push(topic.name)
        }
      }
    }

    const flagArgsTemplate = '        "%s")\n          %s\n        ;;\n'

    const underscoreSepId = id.replaceAll(':', '_')
    const depth = id.split(':').length

    const isCotopic = coTopics.includes(id)

    if (isCotopic) {
      const compFuncName = `${this.config.bin}_${underscoreSepId}`

      const coTopicCompFunc = `_${compFuncName}() {
  _${compFuncName}_flags() {
    local context state state_descr line
    typeset -A opt_args

    ${this.genZshFlagArgumentsBlock(this.commands.find((c) => c.id === id)?.flags)}
  }

  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*: :->args"

  case "$state" in
    cmds)
      if [[ "\${words[CURRENT]}" == -* ]]; then
        _${compFuncName}_flags
      else
%s
      fi
      ;;
    args)
      case $line[1] in
%s
      *)
        _${compFuncName}_flags
      ;;
      esac
      ;;
  esac
}
`
      const subArgs: {id: string; summary?: string}[] = []

      let argsBlock = ''

      for (const t of this.topics.filter(
        (t) => t.name.startsWith(id + ':') && t.name.split(':').length === depth + 1,
      )) {
        const subArg = t.name.split(':')[depth]

        subArgs.push({
          id: subArg,
          summary: t.description,
        })

        argsBlock += util.format(argTemplate, subArg, `_${this.config.bin}_${underscoreSepId}_${subArg}`)
      }

      for (const c of this.commands.filter((c) => c.id.startsWith(id + ':') && c.id.split(':').length === depth + 1)) {
        if (coTopics.includes(c.id)) continue
        const subArg = c.id.split(':')[depth]

        subArgs.push({
          id: subArg,
          summary: c.summary,
        })

        argsBlock += util.format(flagArgsTemplate, subArg, this.genZshFlagArgumentsBlock(c.flags))
      }

      return util.format(coTopicCompFunc, this.genZshValuesBlock(subArgs), argsBlock)
    }

    let argsBlock = ''

    const subArgs: {id: string; summary?: string}[] = []
    for (const t of this.topics.filter((t) => t.name.startsWith(id + ':') && t.name.split(':').length === depth + 1)) {
      const subArg = t.name.split(':')[depth]

      subArgs.push({
        id: subArg,
        summary: t.description,
      })

      argsBlock += util.format(argTemplate, subArg, `_${this.config.bin}_${underscoreSepId}_${subArg}`)
    }

    for (const c of this.commands.filter((c) => c.id.startsWith(id + ':') && c.id.split(':').length === depth + 1)) {
      if (coTopics.includes(c.id)) continue
      const subArg = c.id.split(':')[depth]

      subArgs.push({
        id: subArg,
        summary: c.summary,
      })

      argsBlock += util.format(flagArgsTemplate, subArg, this.genZshFlagArgumentsBlock(c.flags))
    }

    const topicCompFunc = `_${this.config.bin}_${underscoreSepId}() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
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
    return util.format(topicCompFunc, this.genZshValuesBlock(subArgs), argsBlock)
  }

  private genZshValuesBlock(subArgs: {id: string; summary?: string}[]): string {
    let valuesBlock = '_values "completions" \\\n'

    for (const subArg of subArgs) {
      valuesBlock += `"${subArg.id}[${subArg.summary}]" \\\n`
    }

    return valuesBlock
  }

  private getCommands(): CommandCompletion[] {
    const cmds: CommandCompletion[] = []

    for (const p of this.config.getPluginsList()) {
      for (const c of p.commands) {
        if (c.hidden) continue
        const summary = this.sanitizeSummary(c.summary ?? c.description)
        const {flags} = c
        cmds.push({
          flags,
          id: c.id,
          summary,
        })

        for (const a of c.aliases) {
          cmds.push({
            flags,
            id: a,
            summary,
          })

          const split = a.split(':')

          let topic = split[0]

          // Completion funcs are generated from topics:
          // `force` -> `force:org` -> `force:org:open|list`
          //
          // but aliases aren't guaranteed to follow the plugin command tree
          // so we need to add any missing topic between the starting point and the alias.
          for (let i = 0; i < split.length - 1; i++) {
            if (!this.topics.some((t) => t.name === topic)) {
              this.topics.push({
                description: `${topic.replaceAll(':', ' ')} commands`,
                name: topic,
              })
            }

            topic += `:${split[i + 1]}`
          }
        }
      }
    }

    return cmds
  }

  private getOrgs(): string[] {
    const orgsJson = JSON.parse(execSync('sf org list auth --json 2>/dev/null').toString())
    const result: string[] = []
    for (const element of orgsJson.result) {
      if (element.alias) result.push(element.alias)
      else result.push(element.username)
    }

    return result.sort()
  }

  private getTopics(): Topic[] {
    const topics = this.config.topics
      .filter((topic: Interfaces.Topic) => {
        // it is assumed a topic has a child if it has children
        const hasChild = this.config.topics.some((subTopic) => subTopic.name.includes(`${topic.name}:`))
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
      .map((t) => {
        const description = t.description
          ? this.sanitizeSummary(t.description)
          : `${t.name.replaceAll(':', ' ')} commands`

        return {
          description,
          name: t.name,
        }
      })

    return topics
  }

  private sanitizeSummary(summary?: string): string {
    if (summary === undefined) {
      return ''
    }

    return ejs
      .render(summary, {config: this.config})
      .replaceAll(/(["`])/g, '\\\\\\$1') // backticks and double-quotes require triple-backslashes

      .replaceAll(/([[\]])/g, '\\\\$1') // square brackets require double-backslashes
      .split('\n')[0] // only use the first line
  }
}
