import {Config, Command} from '@oclif/core'
import * as path from 'path'
import {Plugin as IPlugin} from '@oclif/core/lib/interfaces'
import {expect} from 'chai'
import PowerShellComp from '../../src/autocomplete/powershell'

class MyCommandClass implements Command.Cached {
  [key: string]: unknown;

  args: {[name: string]: Command.Arg.Cached} = {}

  _base = ''

  aliases: string[] = []

  hidden = false

  id = 'foo:bar'

  flags = {}

  new(): Command.Cached {
    // @ts-expect-error this is not the full interface but enough for testing
    return {
      _run(): Promise<any> {
        return Promise.resolve()
      }}
  }

  run(): PromiseLike<any> {
    return Promise.resolve()
  }
}

const commandPluginA: Command.Loadable = {
  strict: false,
  aliases: [],
  args: {},
  flags: {
    metadata: {
      name: 'metadata',
      type: 'option',
      char: 'm',
      multiple: true,
    },
    'api-version': {
      name: 'api-version',
      type: 'option',
      char: 'a',
      multiple: false,
    },
    json: {
      name: 'json',
      type: 'boolean',
      summary: 'Format output as "json".',
      allowNo: false,
    },
    'ignore-errors': {
      name: 'ignore-errors',
      type: 'boolean',
      char: 'i',
      summary: 'Ignore errors.',
      allowNo: false,
    },
  },
  hidden: false,
  id: 'deploy',
  summary: 'Deploy a project',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/plugina',
}

const commandPluginB: Command.Loadable = {
  strict: false,
  aliases: [],
  args: {},
  flags: {
    branch: {
      name: 'branch',
      type: 'option',
      char: 'b',
      multiple: false,
    },
  },
  hidden: false,
  id: 'deploy:functions',
  summary: 'Deploy a function.',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/pluginb',
}

const commandPluginC: Command.Loadable = {
  strict: false,
  aliases: [],
  args: {},
  flags: {},
  hidden: false,
  id: 'search',
  summary: 'Search for a command',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/pluginc',
}

const commandPluginD: Command.Loadable = {
  strict: false,
  aliases: [],
  args: {},
  flags: {},
  hidden: false,
  id: 'app:execute:code',
  summary: 'execute code',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/plugind',
}

const pluginA: IPlugin = {
  load: async (): Promise<void> => {},
  findCommand: async (): Promise<Command.Class> => {
    return new MyCommandClass() as unknown as Command.Class
  },
  name: '@My/plugina',
  alias: '@My/plugina',
  commands: [commandPluginA, commandPluginB, commandPluginC, commandPluginD],
  _base: '',
  pjson: {} as any,
  commandIDs: ['deploy'],
  root: '',
  version: '0.0.0',
  type: 'core',
  hooks: {},
  topics: [{
    name: 'foo',
    description: 'foo commands',
  }],
  valid: true,
  tag: 'tag',
}

const plugins: IPlugin[] = [pluginA]

describe('powershell completion', () => {
  const root = path.resolve(__dirname, '../../package.json')
  const config = new Config({root})

  before(async () => {
    await config.load()
    /* eslint-disable require-atomic-updates */
    config.plugins = plugins
    config.pjson.oclif.plugins = ['@My/pluginb']
    config.pjson.dependencies = {'@My/pluginb': '0.0.0'}
    for (const plugin of config.plugins) {
      // @ts-expect-error private method
      config.loadCommands(plugin)
      // @ts-expect-error private method
      config.loadTopics(plugin)
    }
  })

  it('generates a valid completion file.', () => {
    config.bin = 'test-cli'
    const powerShellComp = new PowerShellComp(config as Config)
    expect(powerShellComp.generate()).to.equal(`
using namespace System.Management.Automation
using namespace System.Management.Automation.Language

$scriptblock = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = 
@{

"app" = @{
"_summary" = "execute code"

"execute" = @{
"_summary" = "execute code"

"code" = @{
"_command" = @{
  "summary" = "execute code"
  "flags" = @{

  }
}

}

}

}


"deploy" = @{
"_command" = @{
  "summary" = "Deploy a project"
  "flags" = @{
    "metadata" = @{
      "summary" = " "
      "multiple" = $true
}
    "api-version" = @{ "summary" = " " }
    "json" = @{ "summary" = "Format output as ""json""." }
    "ignore-errors" = @{ "summary" = "Ignore errors." }
  }
}

"functions" = @{
"_command" = @{
  "summary" = "Deploy a function."
  "flags" = @{
    "branch" = @{ "summary" = " " }
  }
}

}
}


"search" = @{
"_command" = @{
  "summary" = "Search for a command"
  "flags" = @{

  }
}

}

}


    $currentLine = $commandAst.CommandElements[1..$commandAst.CommandElements.Count] -split " "

    $flags = $currentLine | Where-Object {
      $_ -Match "^-{1,2}(\\w+)"
    } | ForEach-Object {
      $_.trim("-")
    }
    # set $flags to an empty hashtable if there are no flags in the current line.
    if ($flags -eq $null) {
      $flags = @{}
    }

    # top-level args
    $nextSuggestions = $commands.GetEnumerator() | Sort-Object -Property key


    # top-level args
    if ($currentLine.Count -eq 0) {
        $nextSuggestions | ForEach-Object {
            New-Object -Type CompletionResult -ArgumentList \`
                "$($_.Key) ",
                $_.Key,
                "ParameterValue",
                "$($commands[$_.Key]._summary ?? $commands[$_.Key]._command.summary ?? " ")"
        }
    } else {
        # Remove flags from $currentLine
        if ($wordToComplete -like '-*') {
            $currentLine = $currentLine | Where-Object {
              !$_.StartsWith('-')
            }
        }

        $prevNode = $null

        # go to the next hashtable
        $currentLine | ForEach-Object {
            if ($hashIndex -eq $null) {
              $hashIndex = $commands[$_]
            } elseif ($prevNode["$($_)"] -ne $null) {
              $hashIndex = $prevNode[$_]
            } elseif ($_.StartsWith('-')) {
              break
            } else {
              $hashIndex = $prevNode
            }

            $prevNode = $hashIndex
        }

        # this is a command!
        if ($hashIndex._command -ne $null) {
            # \`sf org -<tab>\` start completing flags
            if ($wordToComplete -like '-*') {
                $hashIndex._command.flags.GetEnumerator() | Sort-Object -Property key | Where-Object {
                  $_.value.multiple -eq $true -or !$flags.Contains($_.key)
                } | ForEach-Object {
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
                    $hashIndex.GetEnumerator() | Sort-Object -Property key | ForEach-Object {
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

            $hashIndex.GetEnumerator() | Sort-Object -Property key | ForEach-Object {
                New-Object -Type CompletionResult -ArgumentList \`
                    "$($_.key) ",
                    $_.key,
                    "ParameterValue",
                    "$($hashIndex[$_.Key]._summary ?? $hashIndex[$_.Key]._command.summary ?? " ")"
            }
        }
    }
}
Register-ArgumentCompleter -Native -CommandName test-cli -ScriptBlock $scriptblock
`)
  })
})
