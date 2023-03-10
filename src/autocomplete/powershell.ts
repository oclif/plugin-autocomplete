import * as util from 'util'
import { EOL } from 'os'
import {Config, Interfaces, Command} from '@oclif/core'

function sanitizeSummary(description?: string): string {
  if (description === undefined) {
    return ''
  }
  return description
  .replace(/([`"])/g, '\\\\\\$1') // backticks and double-quotes require triple-backslashes
  // eslint-disable-next-line no-useless-escape
  .replace(/([\[\]])/g, '\\\\$1') // square brackets require double-backslashes
  .split('\n')[0] // only use the first line
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

export default class PowerShellComp {
  protected config: Config;

  private topics: Topic[]

  private commands: CommandCompletion[]

  private _coTopics?: string[]

  constructor(config: Config) {
    this.config = config
    this.topics = this.getTopics()
    this.commands = this.getCommands()
  }

  private genCmdHashtable(cmd: CommandCompletion ): string {
    const flaghHashtables: string[] = []

    const flagNames = Object.keys(cmd.flags)
    if (flagNames.length > 0) {
      for (const f of flagNames) {
        // skip hidden flags
        if (cmd.flags[f].hidden) continue
        // FIX: powershell fails if there's no summary
        const flagSummary = cmd.flags[f].summary ?? "no summary"
        flaghHashtables.push(
          `    "${f}" = @{ "summary" = "${sanitizeSummary(flagSummary)}" }`
        )
      }
    }

    const cmdHashtable =
`@{
  "summary" = "${cmd.summary}"
  "flags" = @{
${flaghHashtables.join(EOL)}
  }
}
`
  return cmdHashtable
  }

  public generate(): string {
    let commandsObj: Record<string, any> = {
      org: {
        "_summary": "org commands",
        create: {
          "_summary": "org create commands",
          scratch: {
            "_command": 'org:create:scratch',
          },
          sandbox: {
            "_command": 'org:create:sandbox',
          }
        }
      },
      data: {
        "_summary": "data commands",
        query: {
          "_command": "data:query",
          resume: {
            "_command": "data:query:resume",
          }
        }
      }
    }

    const commandObj:Record<string,any>={}

    this.commands.forEach(c => {
      const cmdKeys=Object.keys(commandObj)

      if(!cmdKeys.includes(c.id)) {
        const split = c.id.split(':')
        if (split[0] ==="visualforce"){
          commandObj[split[0]] = {
            "_command": c.id
          }
        }
      }
    })

    const hashtables:string[]=[]

    const genHashtable = (key: string,node: Record<string, any>, leafTpl?: string): string=>{
      if (!leafTpl) {
        leafTpl = 
`
"${key}" = @{
  %s
}
`
      }
      
      const nodeKeys=Object.keys(node[key])

      // this is a topic
      if (nodeKeys.includes("_summary")) {
        let childTpl = `"_summary" = "${node[key]["_summary"]}"\n%s`

        const newKeys = nodeKeys.filter(k=>k!=="_summary")
        if (newKeys.length>0) {
          const childNodes:string[]=[]

          for (const newKey of newKeys) {
            childNodes.push(genHashtable(newKey, node[key]))
          }
          childTpl = util.format(childTpl, childNodes.join(`\n`))

          return util.format(leafTpl, childTpl)
        }
        // last node
        return util.format(leafTpl, childTpl)
      }

      for (const k of nodeKeys) {
        if (k==="_command") {
          const cmd = this.commands.find(c=>c.id===node[key][k])
          if (!cmd) throw new Error('no command')

          return util.format(leafTpl,`"_command" = ${this.genCmdHashtable(cmd)}`)
        } else {
          const childTpl = `"summary" = "${node[k]["_summary"]}"\n"${k}" = @{ \n    %s\n   }`
          return genHashtable(key,node[key], util.format(leafTpl, childTpl))
        }
      }

      return leafTpl
    }

    for (const topLevelArg of Object.keys(commandObj)) {
      hashtables.push(genHashtable(topLevelArg, commandObj))
    }
    
    const commandsHashtable =
`
@{
${hashtables.join(EOL)}
}
`

const compRegister =
`
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

  private get coTopics(): string [] {
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

  private getTopics(): Topic[] {
    const topics = this.config.topics.filter((topic: Interfaces.Topic) => {
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

