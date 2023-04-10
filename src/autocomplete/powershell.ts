import * as util from 'util'
import {EOL} from 'os'
import {Config, Interfaces, Command} from '@oclif/core'

function sanitizeSummary(description?: string): string {
  if (description === undefined) {
    // PowerShell:
    // [System.Management.Automation.CompletionResult] will error out if will error out if you pass in an empty string for the summary.
    return ' '
  }
  return description
  .replace(/"/g, '`') // double-quotes require backticks in PowerShell
  .split(EOL)[0] // only use the first line
}

type CommandCompletion = {
  id: string;
  summary: string;
  flags: CommandFlags;
};

type CommandFlags = {
  [name: string]: Command.Flag.Cached;
};

type Topic = {
  name: string;
  description: string;
};

export default class PowerShellComp {
  protected config: Config;

  private topics: Topic[];

  private _coTopics?: string[];

  private commands: CommandCompletion[];

  constructor(config: Config) {
    this.config = config
    this.topics = this.getTopics()
    this.commands = this.getCommands()
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

  private genCmdHashtable(cmd: CommandCompletion): string {
    const flaghHashtables: string[] = []

    const flagNames = Object.keys(cmd.flags)
    if (flagNames.length > 0) {
      for (const flagName of flagNames) {
        const f = cmd.flags[flagName]
        // skip hidden flags
        if (f.hidden) continue
        if (f.type === 'option' && f.multiple) {
          flaghHashtables.push(
            `    "${f.name}" = @{
      "summary" = "${sanitizeSummary(f.summary)}"
      "multiple" = $true
}`,
          )
        } else {
          flaghHashtables.push(
            `    "${f.name}" = @{ "summary" = "${sanitizeSummary(f.summary)}" }`,
          )
        }
      }
    }

    const cmdHashtable = `@{
  "summary" = "${cmd.summary}"
  "flags" = @{
${flaghHashtables.join('\n')}
  }
}
`
    return cmdHashtable
  }

  private genHashtable(
    key: string,
    node: Record<string, any>,
    leafTpl?: string,
  ): string {
    if (!leafTpl) {
      leafTpl = `
"${key}" = @{
%s
}
`
    }

    const nodeKeys = Object.keys(node[key])

    // this is a topic
    if (nodeKeys.includes('_summary')) {
      let childTpl = `"_summary" = "${node[key]._summary}"\n%s`

      const newKeys = nodeKeys.filter(k => k !== '_summary')
      if (newKeys.length > 0) {
        const childNodes: string[] = []

        for (const newKey of newKeys) {
          childNodes.push(this.genHashtable(newKey, node[key]))
        }
        childTpl = util.format(childTpl, childNodes.join('\n'))

        return util.format(leafTpl, childTpl)
      }
      // last node
      return util.format(leafTpl, childTpl)
    }

    const childNodes: string[] = []
    for (const k of nodeKeys) {
      if (k === '_command') {
        const cmd = this.commands.find(c => c.id === node[key][k])
        if (!cmd) throw new Error('no command')

        childNodes.push(
          util.format('"_command" = %s', this.genCmdHashtable(cmd)),
        )
      } else if (node[key][k]._command) {
        const cmd = this.commands.find(c => c.id === node[key][k]._command)
        if (!cmd) throw new Error('no command')

        childNodes.push(
          util.format(`"${k}" = @{\n"_command" = %s\n}`, this.genCmdHashtable(cmd)),
        )
      } else {
        const childTpl = `"summary" = "${node[key][k]._summary}"\n"${k}" = @{ \n    %s\n   }`
        childNodes.push(
          this.genHashtable(k, node[key], childTpl),
        )
      }
    }
    if (childNodes.length >= 1) {
      return util.format(leafTpl, childNodes.join('\n'))
    }

    return leafTpl
  }

  public generate(): string {
    const genNode = (partialId: string): Record<string, any> => {
      const node: Record<string, any> = {}

      const nextArgs: string[] = []

      const depth = partialId.split(':').length

      for (const t of this.topics) {
        const topicNameSplit = t.name.split(':')

        if (
          t.name.startsWith(partialId + ':') &&
          topicNameSplit.length === depth + 1
        ) {
          nextArgs.push(topicNameSplit[depth])

          if (this.coTopics.includes(t.name)) {
            node[topicNameSplit[depth]] = {
              ...genNode(`${partialId}:${topicNameSplit[depth]}`),
            }
          } else {
            node[topicNameSplit[depth]] = {
              _summary: t.description,
              ...genNode(`${partialId}:${topicNameSplit[depth]}`),
            }
          }
        }
      }

      for (const c of this.commands) {
        const cmdIdSplit = c.id.split(':')

        if (partialId === c.id && this.coTopics.includes(c.id)) {
          node._command = c.id
        }

        if (
          c.id.startsWith(partialId + ':') &&
          cmdIdSplit.length === depth + 1 &&
          !nextArgs.includes(cmdIdSplit[depth])
        ) {
          node[cmdIdSplit[depth]] = {
            _command: c.id,
          }
        }
      }
      return node
    }

    const commandTree: Record<string, any> = {}

    this.topics.forEach(t => {
      if (!t.name.includes(':')) {
        if (this.coTopics.includes(t.name)) {
          commandTree[t.name] = {
            ...genNode(t.name),
          }
        } else {
          commandTree[t.name] = {
            _summary: t.description,
            ...genNode(t.name),
          }
        }
      }
    })

    const hashtables: string[] = []

    for (const topLevelArg of Object.keys(commandTree)) {
      hashtables.push(this.genHashtable(topLevelArg, commandTree))
    }

    const commandsHashtable = `
@{
${hashtables.join('\n')}
}
`

    const compRegister = `
using namespace System.Management.Automation
using namespace System.Management.Automation.Language

$scriptblock = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = ${commandsHashtable}

    # everything after <cli>.
    # \`sf deploy --json\`
    # $currentLine = [deploy, json]
    $currentLine = $commandAst.CommandElements[1..$($commandAst.CommandElements.Count - 1)]

    # top-level args
    $nextSuggestions = $commands.GetEnumerator()


    # top-level args
    if ($commandAst.CommandElements.Count -eq 1) {
        $nextSuggestions | ForEach-Object {
            New-Object -Type CompletionResult -ArgumentList \`
                "$($_.Key) ",
                $_.Key,
                "ParameterValue",
                "$($commands[$_.Key]._summary ?? $commands[$_.Key]._command.summary ?? " ")"
        }
    } else {
        # remove flag elements from current line
        # TODO: this should be done at the start of completion.
        if ($wordToComplete -like '-*') {
            $currentLine = @(
                for ($i = 0; $i -lt $currentLine.Count; $i++) {
                    $element = $currentLine[$i]
                    if ($element -isnot [StringConstantExpressionAst] -or
                        $element.StringConstantType -ne [StringConstantType]::BareWord -or
                        $element.Value.StartsWith('-')) {
                        break
                    }
                    $element
                }
            )
        }

        $prevNode = $null

        # go to the next hashtable
        $currentLine | ForEach-Object {
            $hashIndex = $hashIndex -eq $null ? $commands["$($_.value)"] : $prevNode["$($_.value)"]
            
            $prevNode = $hashIndex
        }

        # this is a command!
        if ($hashIndex._command -ne $null) {
            # \`sf org -<tab>\` start completing flags
            if ($wordToComplete -like '-*') {
                $hashIndex._command.flags.GetEnumerator() | ForEach-Object {
                   New-Object -Type CompletionResult -ArgumentList \`
                    "--$($_.key) ",
                    $_.key,
                    "ParameterValue",
                    "$($hashIndex._command.flags[$_.Key].summary)"
                }
            } else {
                # if it is a coTopic, remove "_command" key and suggest next set of keys in hashtable
                $hashIndex.remove("_command")

                if ($hashIndex.keys -gt 0) {
                    $hashIndex.GetEnumerator() | ForEach-Object {
                        New-Object -Type CompletionResult -ArgumentList \`
                            "$($_.key) ",
                            $_.key,
                            "ParameterValue",
                            "$($hashIndex[$_.Key]._summary ?? " ")"
                    }
                }
            }

            
        } else {
            # remove topic["_summary"] key
            $hashIndex.remove("_summary")

            $hashIndex.GetEnumerator() | ForEach-Object {
                New-Object -Type CompletionResult -ArgumentList \`
                    "$($_.key) ",
                    $_.key,
                    "ParameterValue",
                    "$($hashIndex[$_.Key]._summary ?? $hashIndex[$_.Key]._command.summary ?? " ")"
            }
        }
    }
}
Register-ArgumentCompleter -Native -CommandName ${this.config.bin} -ScriptBlock $scriptblock
`

    return compRegister
  }

  private getTopics(): Topic[] {
    const topics = this.config.topics
    .filter((topic: Interfaces.Topic) => {
      // it is assumed a topic has a child if it has children
      const hasChild = this.config.topics.some(subTopic =>
        subTopic.name.includes(`${topic.name}:`),
      )
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
      const description = t.description ?
        sanitizeSummary(t.description) :
        `${t.name.replace(/:/g, ' ')} commands`

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
