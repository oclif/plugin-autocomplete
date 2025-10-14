import {Command, Config, Interfaces} from '@oclif/core'
import * as ejs from 'ejs'
import {format} from 'node:util'

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
  private topics: Topic[]

  constructor(config: Config) {
    this.config = config
    this.topics = this.getTopics()
    this.commands = []
  }

  async init(): Promise<void> {
    this.commands = await this.getCommands()
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

  public async generate(): Promise<string> {
    // Ensure commands are loaded with completion properties
    if (this.commands.length === 0) {
      await this.init()
    }

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
              caseBlock += `${arg.id})\n${this.genZshFlagArgumentsBlock(cmd.flags, cmd.id)} ;; \n`
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


${this.genDynamicCompletionHelper()}

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

  private genDynamicCompletionHelper(): string {
    // Using ${'$'} instead of \$ to avoid linter errors
    return `# Dynamic completion helper with timestamp-based caching
# This outputs completion options to stdout for use in command substitution
_${this.config.bin}_dynamic_comp() {
  local cmd_id="$1"
  local flag_name="$2"
  local cache_duration="$3"
  local cache_dir="$HOME/.cache/${this.config.bin}/autocomplete/flag_completions"
  local cache_file="$cache_dir/${'$'}{cmd_id//[:]/_}_${'$'}{flag_name}.cache"
  
  # Check if cache file exists and is valid
  if [[ -f "$cache_file" ]]; then
    # Read timestamp from first line
    local cache_timestamp=${'$'}(head -n 1 "$cache_file" 2>/dev/null)
    local current_timestamp=${'$'}(date +%s)
    local age=${'$'}((current_timestamp - cache_timestamp))
    
    # Check if cache is still valid
    if [[ -n "$cache_timestamp" ]] && (( age < cache_duration )); then
      # Cache valid - read and output options (skip first line and empty lines)
      tail -n +2 "$cache_file" | grep -v "^${'$'}"
      return 0
    fi
  fi
  
  # Cache miss or expired - call Node.js
  mkdir -p "$cache_dir" 2>/dev/null
  local raw_output=${'$'}(${this.config.bin} autocomplete:options ${'$'}{cmd_id} ${'$'}{flag_name} 2>/dev/null)
  
  if [[ -n "$raw_output" ]]; then
    # Save to cache with timestamp
    {
      echo "${'$'}(date +%s)"
      echo "$raw_output"
    } > "$cache_file"
    
    # Output the completions
    echo "$raw_output"
  fi
  # If no output, return nothing (will fall back to default completion)
}
`
  }

  private genZshCompletionSuffix(f: Command.Flag.Cached, flagName: string, commandId: string | undefined): string {
    // Only handle option flags
    if (f.type !== 'option') return ''

    // Check completion type: static, dynamic, or none
    const {completion} = f as any
    const completionType = completion?.type
    const hasStaticCompletion = completionType === 'static' && Array.isArray(completion?.options)
    const hasDynamicCompletion = completionType === 'dynamic' || typeof completion?.options === 'function'
    const cacheDuration = completion?.cacheDuration || 86_400 // Default: 24 hours

    if (hasStaticCompletion && commandId) {
      // STATIC: Embed options directly (instant!)
      const options = completion.options.join(' ')
      return f.char ? `:${flagName}:(${options})` : `: :${flagName}:(${options})`
    }

    if (f.options) {
      // Legacy static options
      return f.char ? `:${flagName} options:(${f.options?.join(' ')})` : `: :${flagName} options:(${f.options.join(' ')})`
    }

    // ONLY add dynamic completion if the flag has a completion property
    if (hasDynamicCompletion && commandId) {
      // Use command substitution to generate completions inline
      return `: :(${'$'}(_${this.config.bin}_dynamic_comp ${commandId} ${flagName} ${cacheDuration}))`
    }

    // No completion defined - fall back to file completion
    return ':file:_files'
  }

  private genZshFlagArgumentsBlock(flags?: CommandFlags, commandId?: string): string {
    // if a command doesn't have flags make it only complete files
    // also add comp for the global `--help` flag.
    if (!flags) return '_arguments -S \\\n"--help[Show help for command]" \\\n"*: :_files"'

    const flagNames = Object.keys(flags)

    // `-S`:
    // Do not complete flags after a '--' appearing on the line, and ignore the '--'. For example, with -S, in the line:
    // foobar -x -- -y
    // the '-x' is considered a flag, the '-y' is considered an argument, and the '--' is considered to be neither.
    let argumentsBlock = '_arguments -S \\\n'

    for (const flagName of flagNames) {
      const f = flags[flagName]
      // willie testing changes

      // skip hidden flags
      if (f.hidden) continue

      const flagSummary = this.sanitizeSummary(f.summary ?? f.description)
      const flagSpec = this.genZshFlagSpec(f, flagName, flagSummary, commandId)

      argumentsBlock += flagSpec + ' \\\n'
    }

    // add global `--help` flag
    argumentsBlock += '"--help[Show help for command]" \\\n'
    // complete files if `-` is not present on the current line
    argumentsBlock += '"*: :_files"'

    return argumentsBlock
  }

  private genZshFlagSpec(f: Command.Flag.Any, flagName: string, flagSummary: string, commandId?: string): string {
    if (f.type === 'option') {
      return this.genZshOptionFlagSpec(f, flagName, flagSummary, commandId)
    }

    // Boolean flag
    if (f.char) {
      return `"(-${f.char} --${flagName})"{-${f.char},--${flagName}}"[${flagSummary}]"`
    }

    return `"--${flagName}[${flagSummary}]"`
  }

  private genZshOptionFlagSpec(f: Command.Flag.Cached, flagName: string, flagSummary: string, commandId?: string): string {
    // TypeScript doesn't narrow f to option type, so we cast
    const optionFlag = f as Command.Flag.Cached & {multiple?: boolean}
    const completionSuffix = this.genZshCompletionSuffix(f, flagName, commandId)

    if (f.char) {
      const multiplePart = optionFlag.multiple
        ? `"*"{-${f.char},--${flagName}}`
        : `"(-${f.char} --${flagName})"{-${f.char},--${flagName}}`
      return `${multiplePart}"[${flagSummary}]${completionSuffix}"`
    }

    const multiplePart = optionFlag.multiple ? '*' : ''
    return `"${multiplePart}--${flagName}[${flagSummary}]${completionSuffix}"`
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

    ${this.genZshFlagArgumentsBlock(this.commands.find((c) => c.id === id)?.flags, id)}
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

        argsBlock += format(argTemplate, subArg, `_${this.config.bin}_${underscoreSepId}_${subArg}`)
      }

      for (const c of this.commands.filter((c) => c.id.startsWith(id + ':') && c.id.split(':').length === depth + 1)) {
        if (coTopics.includes(c.id)) continue
        const subArg = c.id.split(':')[depth]

        subArgs.push({
          id: subArg,
          summary: c.summary,
        })

        argsBlock += format(flagArgsTemplate, subArg, this.genZshFlagArgumentsBlock(c.flags, c.id))
      }

      return format(coTopicCompFunc, this.genZshValuesBlock(subArgs), argsBlock)
    }

    let argsBlock = ''

    const subArgs: {id: string; summary?: string}[] = []
    for (const t of this.topics.filter((t) => t.name.startsWith(id + ':') && t.name.split(':').length === depth + 1)) {
      const subArg = t.name.split(':')[depth]

      subArgs.push({
        id: subArg,
        summary: t.description,
      })

      argsBlock += format(argTemplate, subArg, `_${this.config.bin}_${underscoreSepId}_${subArg}`)
    }

    for (const c of this.commands.filter((c) => c.id.startsWith(id + ':') && c.id.split(':').length === depth + 1)) {
      if (coTopics.includes(c.id)) continue
      const subArg = c.id.split(':')[depth]

      subArgs.push({
        id: subArg,
        summary: c.summary,
      })

      argsBlock += format(flagArgsTemplate, subArg, this.genZshFlagArgumentsBlock(c.flags, c.id))
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
    return format(topicCompFunc, this.genZshValuesBlock(subArgs), argsBlock)
  }

  private genZshValuesBlock(subArgs: {id: string; summary?: string}[]): string {
    let valuesBlock = '_values "completions" \\\n'

    for (let i = 0; i < subArgs.length; i++) {
      const subArg = subArgs[i]
      const isLast = i === subArgs.length - 1
      valuesBlock += `"${subArg.id}[${subArg.summary}]"${isLast ? '\n' : ' \\\n'}`
    }

    return valuesBlock
  }

  private async getCommands(): Promise<CommandCompletion[]> {
    const cmds: CommandCompletion[] = []

    for (const p of this.config.getPluginsList()) {
      for (const c of p.commands) {
        if (c.hidden) continue
        const summary = this.sanitizeSummary(c.summary ?? c.description)

        // Load the actual command class to get flags with completion properties
        let flags = c.flags
        try {
          const CommandClass = await c.load()
          // Use flags from command class if available (includes completion properties)
          if (CommandClass.flags) {
            flags = CommandClass.flags as CommandFlags
          }
        } catch {
          // Fall back to manifest flags if loading fails
        }

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

  private hasDynamicCompletions(): boolean {
    // Check if any command has dynamic completions
    for (const command of this.commands) {
      const flags = command.flags || {}
      for (const flag of Object.values(flags)) {
        if (
          flag.type === 'option' &&
          flag.completion && // If completion doesn't have a type, assume dynamic (backward compatibility)
          // If it has type === 'dynamic', it's dynamic
          // @ts-expect-error - completion.type may not exist yet in types
          (!flag.completion.type || flag.completion.type === 'dynamic')
        ) {
          return true
        }
      }
    }

    return false
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
