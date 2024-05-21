import {Command, Config} from '@oclif/core'
import {Deprecation, Plugin as IPlugin} from '@oclif/core/lib/interfaces'
import {expect} from 'chai'
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'

import PowerShellComp from '../../src/autocomplete/powershell.js'

class MyCommandClass implements Command.Cached {
  [key: string]: unknown
  aliases: string[] = []
  aliasPermutations?: string[] | undefined
  args: {[name: string]: Command.Arg.Cached} = {}
  deprecateAliases?: boolean | undefined
  deprecationOptions?: Deprecation | undefined
  description?: string | undefined
  examples?: Command.Example[] | undefined
  flags = {}
  hasDynamicHelp?: boolean | undefined
  hidden = false
  hiddenAliases!: string[]
  id = 'foo:bar'
  isESM?: boolean | undefined
  permutations?: string[] | undefined
  pluginAlias?: string | undefined
  pluginName?: string | undefined
  pluginType?: string | undefined
  relativePath?: string[] | undefined

  state?: string | undefined

  strict?: boolean | undefined

  summary?: string | undefined

  type?: string | undefined

  usage?: string | string[] | undefined

  _base = ''

  new(): Command.Cached {
    // @ts-expect-error this is not the full interface but enough for testing
    return {
      _run(): Promise<any> {
        return Promise.resolve()
      },
    }
  }

  run(): PromiseLike<any> {
    return Promise.resolve()
  }
}

const commandPluginA: Command.Loadable = {
  aliases: [],
  args: {},
  flags: {
    'api-version': {
      char: 'a',
      multiple: false,
      name: 'api-version',
      type: 'option',
    },
    'ignore-errors': {
      allowNo: false,
      char: 'i',
      name: 'ignore-errors',
      summary: 'Ignore errors.',
      type: 'boolean',
    },
    json: {
      allowNo: false,
      name: 'json',
      summary: 'Format output as "json".',
      type: 'boolean',
    },
    metadata: {
      char: 'm',
      multiple: true,
      name: 'metadata',
      type: 'option',
    },
  },
  hidden: false,
  hiddenAliases: [],
  id: 'deploy',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginAlias: '@My/plugina',
  pluginType: 'core',
  strict: false,
  summary: 'Deploy a project',
}

const commandPluginB: Command.Loadable = {
  aliases: [],
  args: {},
  flags: {
    branch: {
      char: 'b',
      multiple: false,
      name: 'branch',
      type: 'option',
    },
  },
  hidden: false,
  hiddenAliases: [],
  id: 'deploy:functions',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginAlias: '@My/pluginb',
  pluginType: 'core',
  strict: false,
  summary: 'Deploy a function.',
}

const commandPluginC: Command.Loadable = {
  aliases: [],
  args: {},
  flags: {},
  hidden: false,
  hiddenAliases: [],
  id: 'search',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginAlias: '@My/pluginc',
  pluginType: 'core',
  strict: false,
  summary: 'Search for a command',
}

const commandPluginD: Command.Loadable = {
  aliases: [],
  args: {},
  flags: {},
  hidden: false,
  hiddenAliases: [],
  id: 'app:execute:code',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginAlias: '@My/plugind',
  pluginType: 'core',
  strict: false,
  summary: 'execute code',
}

const pluginA: IPlugin = {
  _base: '',
  alias: '@My/plugina',
  commandIDs: ['deploy'],
  commands: [commandPluginA, commandPluginB, commandPluginC, commandPluginD],
  commandsDir: '',
  async findCommand(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  hasManifest: false,
  hooks: {},
  isRoot: false,
  async load(): Promise<void> {},
  moduleType: 'commonjs',
  name: '@My/plugina',
  options: {root: ''},
  pjson: {} as any,
  root: '',
  tag: 'tag',
  topics: [
    {
      description: 'foo commands',
      name: 'foo',
    },
  ],
  type: 'core',
  valid: true,
  version: '0.0.0',
}

const plugins: IPlugin[] = [pluginA]

describe('powershell completion', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json')
  const config = new Config({root})

  before(async () => {
    await config.load()

    for (const plugin of plugins) config.plugins.set(plugin.name, plugin)
    config.pjson.oclif.plugins = ['@My/pluginb']
    config.pjson.dependencies = {'@My/pluginb': '0.0.0'}
    for (const plugin of config.getPluginsList()) {
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

function orgs(){
  $orglist=sf autocomplete --display-orgs
  return $orglist
}

$targetOrgFlags=@{
  "long" = "--target-org"
  "short" = "-o"
}

function containsTargetOrgFlag {
  param (
      [Parameter(Mandatory=$true)]
      [array]$items,

      [Parameter(Mandatory=$true)]
      [hashtable]$targetOrgFlags
  )

  foreach ($item in $items) {
      if ($item -like $targetOrgFlags['long']+"*" -Or $item -like $targetOrgFlags['short']+"*") {return $true}
  }
  return $false
}

function getTargetOrgFlag {
  param (
      [Parameter(Mandatory=$true)]
      [array]$line,

      [Parameter(Mandatory=$true)]
      [hashtable]$targetOrgFlags
  )

  if($line -contains $targetOrgFlags['long']) {return $targetOrgFlags['long']}
  if($line -contains $targetOrgFlags['short']) {return $targetOrgFlags['short']} 
  return ""
}

$scriptblock = {
    param($WordToComplete, $CommandAst, $CursorPosition)

    $Commands =
@{
"app" = @{
"_summary" = "execute code"
"execute" = @{
"_summary" = "execute code"
"code" = @{
"_command" = @{
  "summary" = "execute code"
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
  }
}
}

}

}

"deploy" = @{
"_command" = @{
  "summary" = "Deploy a project"
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
    "api-version" = @{ "summary" = " " }
    "ignore-errors" = @{ "summary" = "Ignore errors." }
    "json" = @{ "summary" = "Format output as ""json""." }
    "metadata" = @{
      "summary" = " "
      "multiple" = $true
}
  }
}
"functions" = @{
"_command" = @{
  "summary" = "Deploy a function."
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
    "branch" = @{ "summary" = " " }
  }
}
}
}

"autocomplete" = @{
"_command" = @{
  "summary" = "Display autocomplete installation instructions."
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
    "display-orgs" = @{ "summary" = "Display authenticated orgs." }
    "refresh-cache" = @{ "summary" = "Refresh cache (ignores displaying instructions)" }
  }
}
}

"search" = @{
"_command" = @{
  "summary" = "Search for a command"
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
  }
}
}

}

    # Get the current mode
    $Mode = (Get-PSReadLineKeyHandler | Where-Object {$_.Key -eq "Tab" }).Function

    # Everything in the current line except the CLI executable name.
    $CurrentLine = $commandAst.CommandElements[1..$commandAst.CommandElements.Count] -split " "

    # Remove $WordToComplete from the current line.
    if ($WordToComplete -ne "") {
      if ($CurrentLine.Count -eq 1) {
        $CurrentLine = @()
      } else {
        $CurrentLine = $CurrentLine[0..$CurrentLine.Count]
      }
    }

    # Save flags in current line without the \`--\` prefix.
    $Flags = $CurrentLine | Where-Object {
      $_ -Match "^-{1,2}(\\w+)"
    } | ForEach-Object {
      $_.trim("-")
    }
    # Set $flags to an empty hashtable if there are no flags in the current line.
    if ($Flags -eq $null) {
      $Flags = @{}
    }

    # No command in the current line, suggest top-level args.
    if ($CurrentLine.Count -eq 0) {
        $Commands.GetEnumerator() | Where-Object {
            $_.Key.StartsWith("$WordToComplete")
          } | Sort-Object -Property key | ForEach-Object {
          New-Object -Type CompletionResult -ArgumentList \`
              $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
              $_.Key,
              "ParameterValue",
              "$($_.Value._summary ?? $_.Value._command.summary ?? " ")"
          }
    } else {
      # Start completing command/topic/coTopic

      $NextArg = $null
      $PrevNode = $null

      # Iterate over the current line to find the command/topic/coTopic hashtable
      $CurrentLine | ForEach-Object {
        if ($NextArg -eq $null) {
          $NextArg = $Commands[$_]
        } elseif ($PrevNode[$_] -ne $null) {
          $NextArg = $PrevNode[$_]
        } elseif ($_.StartsWith('-')) {
          return
        } else {
          $NextArg = $PrevNode
        }

        $PrevNode = $NextArg
      }

      # Start completing command.
      if ($NextArg._command -ne $null) {
          # Complete flags
          # \`cli config list -<TAB>\`
          if ($WordToComplete -like '-*') {
            if(containsTargetOrgFlag @($CurrentLine[-1]) $targetOrgFlags){
              $targetOrgFlag=getTargetOrgFlag $CurrentLine $targetOrgFlags
              
              orgs | Where-Object { $search = $CurrentLine[-1].replace($targetOrgFlag, "").Trim(); return ($search -eq "" ? $true : $_ -like "*$search*") } | Sort-Object | ForEach-Object {
                New-Object -Type CompletionResult -ArgumentList "$_", $_, 'ParameterValue', 'Custom completion description'
              }
            }else{
              $NextArg._command.flags.GetEnumerator() | Sort-Object -Property key
                  | Where-Object {
                      # Filter out already used flags (unless \`flag.multiple = true\`).
                      $_.Key.StartsWith("$($WordToComplete.Trim("-"))") -and ($_.Value.multiple -eq $true -or !$flags.Contains($_.Key))
                  }
                  | ForEach-Object {
                      New-Object -Type CompletionResult -ArgumentList \`
                          $($Mode -eq "MenuComplete" ? "--$($_.Key) " : "--$($_.Key)"),
                          $_.Key,
                          "ParameterValue",
                          "$($NextArg._command.flags[$_.Key].summary ?? " ")"
                  }
            }
          } else {
              # This could be a coTopic. We remove the "_command" hashtable
              # from $NextArg and check if there's a command under the current partial ID.
              $NextArg.remove("_command")
              $targetOrgFlag=getTargetOrgFlag $CurrentLine $targetOrgFlags

              if(containsTargetOrgFlag @($CurrentLine[-1], $CurrentLine[-2]) $targetOrgFlags){
                orgs | Where-Object { $search = $CurrentLine[-1].replace($targetOrgFlag, "").Trim(); return ($search -eq "" ? $true : $_ -like "*$search*") } | Sort-Object | ForEach-Object {
                  New-Object -Type CompletionResult -ArgumentList "$_", $_, 'ParameterValue', 'Custom completion description'
                }
              }else{
                if ($NextArg.keys -gt 0) {
                    $NextArg.GetEnumerator() | Where-Object {
                        $_.Key.StartsWith("$WordToComplete")
                      } | Sort-Object -Property key | ForEach-Object {
                      New-Object -Type CompletionResult -ArgumentList \`
                        $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
                        $_.Key,
                        "ParameterValue",
                        "$($NextArg[$_.Key]._summary ?? " ")"
                    }
                }
              }
          }
      } else {
          # Start completing topic.

          # Topic summary is stored as "_summary" in the hashtable.
          # At this stage it is no longer needed so we remove it
          # so that $NextArg contains only commands/topics hashtables

          $NextArg.remove("_summary")

          $NextArg.GetEnumerator() | Where-Object {
                $_.Key.StartsWith("$WordToComplete")
              } | Sort-Object -Property key | ForEach-Object {
              New-Object -Type CompletionResult -ArgumentList \`
                  $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
                  $_.Key,
                  "ParameterValue",
                  "$($NextArg[$_.Key]._summary ?? $NextArg[$_.Key]._command.summary ?? " ")"
          }
      }
    }
}
Register-ArgumentCompleter -Native -CommandName test-cli -ScriptBlock $scriptblock
`)
  })
  it('generates a valid completion file with a bin alias.', () => {
    config.bin = 'test-cli'
    config.binAliases = ['test']
    const powerShellComp = new PowerShellComp(config as Config)
    expect(powerShellComp.generate()).to.equal(`
using namespace System.Management.Automation
using namespace System.Management.Automation.Language

function orgs(){
  $orglist=sf autocomplete --display-orgs
  return $orglist
}

$targetOrgFlags=@{
  "long" = "--target-org"
  "short" = "-o"
}

function containsTargetOrgFlag {
  param (
      [Parameter(Mandatory=$true)]
      [array]$items,

      [Parameter(Mandatory=$true)]
      [hashtable]$targetOrgFlags
  )

  foreach ($item in $items) {
      if ($item -like $targetOrgFlags['long']+"*" -Or $item -like $targetOrgFlags['short']+"*") {return $true}
  }
  return $false
}

function getTargetOrgFlag {
  param (
      [Parameter(Mandatory=$true)]
      [array]$line,

      [Parameter(Mandatory=$true)]
      [hashtable]$targetOrgFlags
  )

  if($line -contains $targetOrgFlags['long']) {return $targetOrgFlags['long']}
  if($line -contains $targetOrgFlags['short']) {return $targetOrgFlags['short']} 
  return ""
}

$scriptblock = {
    param($WordToComplete, $CommandAst, $CursorPosition)

    $Commands =
@{
"app" = @{
"_summary" = "execute code"
"execute" = @{
"_summary" = "execute code"
"code" = @{
"_command" = @{
  "summary" = "execute code"
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
  }
}
}

}

}

"deploy" = @{
"_command" = @{
  "summary" = "Deploy a project"
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
    "api-version" = @{ "summary" = " " }
    "ignore-errors" = @{ "summary" = "Ignore errors." }
    "json" = @{ "summary" = "Format output as ""json""." }
    "metadata" = @{
      "summary" = " "
      "multiple" = $true
}
  }
}
"functions" = @{
"_command" = @{
  "summary" = "Deploy a function."
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
    "branch" = @{ "summary" = " " }
  }
}
}
}

"autocomplete" = @{
"_command" = @{
  "summary" = "Display autocomplete installation instructions."
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
    "display-orgs" = @{ "summary" = "Display authenticated orgs." }
    "refresh-cache" = @{ "summary" = "Refresh cache (ignores displaying instructions)" }
  }
}
}

"search" = @{
"_command" = @{
  "summary" = "Search for a command"
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
  }
}
}

}

    # Get the current mode
    $Mode = (Get-PSReadLineKeyHandler | Where-Object {$_.Key -eq "Tab" }).Function

    # Everything in the current line except the CLI executable name.
    $CurrentLine = $commandAst.CommandElements[1..$commandAst.CommandElements.Count] -split " "

    # Remove $WordToComplete from the current line.
    if ($WordToComplete -ne "") {
      if ($CurrentLine.Count -eq 1) {
        $CurrentLine = @()
      } else {
        $CurrentLine = $CurrentLine[0..$CurrentLine.Count]
      }
    }

    # Save flags in current line without the \`--\` prefix.
    $Flags = $CurrentLine | Where-Object {
      $_ -Match "^-{1,2}(\\w+)"
    } | ForEach-Object {
      $_.trim("-")
    }
    # Set $flags to an empty hashtable if there are no flags in the current line.
    if ($Flags -eq $null) {
      $Flags = @{}
    }

    # No command in the current line, suggest top-level args.
    if ($CurrentLine.Count -eq 0) {
        $Commands.GetEnumerator() | Where-Object {
            $_.Key.StartsWith("$WordToComplete")
          } | Sort-Object -Property key | ForEach-Object {
          New-Object -Type CompletionResult -ArgumentList \`
              $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
              $_.Key,
              "ParameterValue",
              "$($_.Value._summary ?? $_.Value._command.summary ?? " ")"
          }
    } else {
      # Start completing command/topic/coTopic

      $NextArg = $null
      $PrevNode = $null

      # Iterate over the current line to find the command/topic/coTopic hashtable
      $CurrentLine | ForEach-Object {
        if ($NextArg -eq $null) {
          $NextArg = $Commands[$_]
        } elseif ($PrevNode[$_] -ne $null) {
          $NextArg = $PrevNode[$_]
        } elseif ($_.StartsWith('-')) {
          return
        } else {
          $NextArg = $PrevNode
        }

        $PrevNode = $NextArg
      }

      # Start completing command.
      if ($NextArg._command -ne $null) {
          # Complete flags
          # \`cli config list -<TAB>\`
          if ($WordToComplete -like '-*') {
            if(containsTargetOrgFlag @($CurrentLine[-1]) $targetOrgFlags){
              $targetOrgFlag=getTargetOrgFlag $CurrentLine $targetOrgFlags
              
              orgs | Where-Object { $search = $CurrentLine[-1].replace($targetOrgFlag, "").Trim(); return ($search -eq "" ? $true : $_ -like "*$search*") } | Sort-Object | ForEach-Object {
                New-Object -Type CompletionResult -ArgumentList "$_", $_, 'ParameterValue', 'Custom completion description'
              }
            }else{
              $NextArg._command.flags.GetEnumerator() | Sort-Object -Property key
                  | Where-Object {
                      # Filter out already used flags (unless \`flag.multiple = true\`).
                      $_.Key.StartsWith("$($WordToComplete.Trim("-"))") -and ($_.Value.multiple -eq $true -or !$flags.Contains($_.Key))
                  }
                  | ForEach-Object {
                      New-Object -Type CompletionResult -ArgumentList \`
                          $($Mode -eq "MenuComplete" ? "--$($_.Key) " : "--$($_.Key)"),
                          $_.Key,
                          "ParameterValue",
                          "$($NextArg._command.flags[$_.Key].summary ?? " ")"
                  }
            }
          } else {
              # This could be a coTopic. We remove the "_command" hashtable
              # from $NextArg and check if there's a command under the current partial ID.
              $NextArg.remove("_command")
              $targetOrgFlag=getTargetOrgFlag $CurrentLine $targetOrgFlags

              if(containsTargetOrgFlag @($CurrentLine[-1], $CurrentLine[-2]) $targetOrgFlags){
                orgs | Where-Object { $search = $CurrentLine[-1].replace($targetOrgFlag, "").Trim(); return ($search -eq "" ? $true : $_ -like "*$search*") } | Sort-Object | ForEach-Object {
                  New-Object -Type CompletionResult -ArgumentList "$_", $_, 'ParameterValue', 'Custom completion description'
                }
              }else{
                if ($NextArg.keys -gt 0) {
                    $NextArg.GetEnumerator() | Where-Object {
                        $_.Key.StartsWith("$WordToComplete")
                      } | Sort-Object -Property key | ForEach-Object {
                      New-Object -Type CompletionResult -ArgumentList \`
                        $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
                        $_.Key,
                        "ParameterValue",
                        "$($NextArg[$_.Key]._summary ?? " ")"
                    }
                }
              }
          }
      } else {
          # Start completing topic.

          # Topic summary is stored as "_summary" in the hashtable.
          # At this stage it is no longer needed so we remove it
          # so that $NextArg contains only commands/topics hashtables

          $NextArg.remove("_summary")

          $NextArg.GetEnumerator() | Where-Object {
                $_.Key.StartsWith("$WordToComplete")
              } | Sort-Object -Property key | ForEach-Object {
              New-Object -Type CompletionResult -ArgumentList \`
                  $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
                  $_.Key,
                  "ParameterValue",
                  "$($NextArg[$_.Key]._summary ?? $NextArg[$_.Key]._command.summary ?? " ")"
          }
      }
    }
}
Register-ArgumentCompleter -Native -CommandName @("test","test-cli") -ScriptBlock $scriptblock
`)
  })
  it('generates a valid completion file with multiple bin aliases.', () => {
    config.bin = 'test-cli'
    config.binAliases = ['test', 'test1']
    const powerShellComp = new PowerShellComp(config as Config)
    expect(powerShellComp.generate()).to.equal(`
using namespace System.Management.Automation
using namespace System.Management.Automation.Language

function orgs(){
  $orglist=sf autocomplete --display-orgs
  return $orglist
}

$targetOrgFlags=@{
  "long" = "--target-org"
  "short" = "-o"
}

function containsTargetOrgFlag {
  param (
      [Parameter(Mandatory=$true)]
      [array]$items,

      [Parameter(Mandatory=$true)]
      [hashtable]$targetOrgFlags
  )

  foreach ($item in $items) {
      if ($item -like $targetOrgFlags['long']+"*" -Or $item -like $targetOrgFlags['short']+"*") {return $true}
  }
  return $false
}

function getTargetOrgFlag {
  param (
      [Parameter(Mandatory=$true)]
      [array]$line,

      [Parameter(Mandatory=$true)]
      [hashtable]$targetOrgFlags
  )

  if($line -contains $targetOrgFlags['long']) {return $targetOrgFlags['long']}
  if($line -contains $targetOrgFlags['short']) {return $targetOrgFlags['short']} 
  return ""
}

$scriptblock = {
    param($WordToComplete, $CommandAst, $CursorPosition)

    $Commands =
@{
"app" = @{
"_summary" = "execute code"
"execute" = @{
"_summary" = "execute code"
"code" = @{
"_command" = @{
  "summary" = "execute code"
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
  }
}
}

}

}

"deploy" = @{
"_command" = @{
  "summary" = "Deploy a project"
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
    "api-version" = @{ "summary" = " " }
    "ignore-errors" = @{ "summary" = "Ignore errors." }
    "json" = @{ "summary" = "Format output as ""json""." }
    "metadata" = @{
      "summary" = " "
      "multiple" = $true
}
  }
}
"functions" = @{
"_command" = @{
  "summary" = "Deploy a function."
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
    "branch" = @{ "summary" = " " }
  }
}
}
}

"autocomplete" = @{
"_command" = @{
  "summary" = "Display autocomplete installation instructions."
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
    "display-orgs" = @{ "summary" = "Display authenticated orgs." }
    "refresh-cache" = @{ "summary" = "Refresh cache (ignores displaying instructions)" }
  }
}
}

"search" = @{
"_command" = @{
  "summary" = "Search for a command"
  "flags" = @{
    "help" = @{ "summary" = "Show help for command" }
  }
}
}

}

    # Get the current mode
    $Mode = (Get-PSReadLineKeyHandler | Where-Object {$_.Key -eq "Tab" }).Function

    # Everything in the current line except the CLI executable name.
    $CurrentLine = $commandAst.CommandElements[1..$commandAst.CommandElements.Count] -split " "

    # Remove $WordToComplete from the current line.
    if ($WordToComplete -ne "") {
      if ($CurrentLine.Count -eq 1) {
        $CurrentLine = @()
      } else {
        $CurrentLine = $CurrentLine[0..$CurrentLine.Count]
      }
    }

    # Save flags in current line without the \`--\` prefix.
    $Flags = $CurrentLine | Where-Object {
      $_ -Match "^-{1,2}(\\w+)"
    } | ForEach-Object {
      $_.trim("-")
    }
    # Set $flags to an empty hashtable if there are no flags in the current line.
    if ($Flags -eq $null) {
      $Flags = @{}
    }

    # No command in the current line, suggest top-level args.
    if ($CurrentLine.Count -eq 0) {
        $Commands.GetEnumerator() | Where-Object {
            $_.Key.StartsWith("$WordToComplete")
          } | Sort-Object -Property key | ForEach-Object {
          New-Object -Type CompletionResult -ArgumentList \`
              $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
              $_.Key,
              "ParameterValue",
              "$($_.Value._summary ?? $_.Value._command.summary ?? " ")"
          }
    } else {
      # Start completing command/topic/coTopic

      $NextArg = $null
      $PrevNode = $null

      # Iterate over the current line to find the command/topic/coTopic hashtable
      $CurrentLine | ForEach-Object {
        if ($NextArg -eq $null) {
          $NextArg = $Commands[$_]
        } elseif ($PrevNode[$_] -ne $null) {
          $NextArg = $PrevNode[$_]
        } elseif ($_.StartsWith('-')) {
          return
        } else {
          $NextArg = $PrevNode
        }

        $PrevNode = $NextArg
      }

      # Start completing command.
      if ($NextArg._command -ne $null) {
          # Complete flags
          # \`cli config list -<TAB>\`
          if ($WordToComplete -like '-*') {
            if(containsTargetOrgFlag @($CurrentLine[-1]) $targetOrgFlags){
              $targetOrgFlag=getTargetOrgFlag $CurrentLine $targetOrgFlags
              
              orgs | Where-Object { $search = $CurrentLine[-1].replace($targetOrgFlag, "").Trim(); return ($search -eq "" ? $true : $_ -like "*$search*") } | Sort-Object | ForEach-Object {
                New-Object -Type CompletionResult -ArgumentList "$_", $_, 'ParameterValue', 'Custom completion description'
              }
            }else{
              $NextArg._command.flags.GetEnumerator() | Sort-Object -Property key
                  | Where-Object {
                      # Filter out already used flags (unless \`flag.multiple = true\`).
                      $_.Key.StartsWith("$($WordToComplete.Trim("-"))") -and ($_.Value.multiple -eq $true -or !$flags.Contains($_.Key))
                  }
                  | ForEach-Object {
                      New-Object -Type CompletionResult -ArgumentList \`
                          $($Mode -eq "MenuComplete" ? "--$($_.Key) " : "--$($_.Key)"),
                          $_.Key,
                          "ParameterValue",
                          "$($NextArg._command.flags[$_.Key].summary ?? " ")"
                  }
            }
          } else {
              # This could be a coTopic. We remove the "_command" hashtable
              # from $NextArg and check if there's a command under the current partial ID.
              $NextArg.remove("_command")
              $targetOrgFlag=getTargetOrgFlag $CurrentLine $targetOrgFlags

              if(containsTargetOrgFlag @($CurrentLine[-1], $CurrentLine[-2]) $targetOrgFlags){
                orgs | Where-Object { $search = $CurrentLine[-1].replace($targetOrgFlag, "").Trim(); return ($search -eq "" ? $true : $_ -like "*$search*") } | Sort-Object | ForEach-Object {
                  New-Object -Type CompletionResult -ArgumentList "$_", $_, 'ParameterValue', 'Custom completion description'
                }
              }else{
                if ($NextArg.keys -gt 0) {
                    $NextArg.GetEnumerator() | Where-Object {
                        $_.Key.StartsWith("$WordToComplete")
                      } | Sort-Object -Property key | ForEach-Object {
                      New-Object -Type CompletionResult -ArgumentList \`
                        $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
                        $_.Key,
                        "ParameterValue",
                        "$($NextArg[$_.Key]._summary ?? " ")"
                    }
                }
              }
          }
      } else {
          # Start completing topic.

          # Topic summary is stored as "_summary" in the hashtable.
          # At this stage it is no longer needed so we remove it
          # so that $NextArg contains only commands/topics hashtables

          $NextArg.remove("_summary")

          $NextArg.GetEnumerator() | Where-Object {
                $_.Key.StartsWith("$WordToComplete")
              } | Sort-Object -Property key | ForEach-Object {
              New-Object -Type CompletionResult -ArgumentList \`
                  $($Mode -eq "MenuComplete" ? "$($_.Key) " : "$($_.Key)"),
                  $_.Key,
                  "ParameterValue",
                  "$($NextArg[$_.Key]._summary ?? $NextArg[$_.Key]._command.summary ?? " ")"
          }
      }
    }
}
Register-ArgumentCompleter -Native -CommandName @("test","test1","test-cli") -ScriptBlock $scriptblock
`)
  })
})
