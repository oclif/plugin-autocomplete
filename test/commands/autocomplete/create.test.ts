import * as path from 'path'

import {expect} from 'chai'

import {Config, Plugin} from '@oclif/core'
import {loadJSON} from '@oclif/core/lib/config/util'

import Create from '../../../src/commands/autocomplete/create'

const root = path.resolve(__dirname, '../../../package.json')
const config = new Config({root})

describe('Create', () => {
  // Unit test private methods for extra coverage
  describe('private methods', () => {
    let cmd: any
    let plugin: any
    before(async () => {
      await config.load()
      cmd = new Create([], config)
      plugin = new Plugin({root})
      cmd.config.plugins = [plugin]
      plugin._manifest = () => {
        return loadJSON(path.resolve(__dirname, '../../test.oclif.manifest.json'))
      }
      await plugin.load()
    })

    it('file paths', () => {
      const dir = cmd.config.cacheDir
      expect(cmd.bashCompletionFunctionPath).to.eq(path.join(dir, 'autocomplete', 'functions', 'bash', 'oclif-example.bash'))
      expect(cmd.zshCompletionFunctionPath).to.eq(path.join(dir, 'autocomplete', 'functions', 'zsh', '_oclif-example'))
      expect(cmd.powershellCompletionFunctionPath).to.eq(path.join(dir, 'autocomplete', 'functions', 'powershell', 'oclif-example.ps1'))
    })

    it('#bashSetupScript', () => {
      expect(cmd.bashSetupScript).to.eq(`OCLIF_EXAMPLE_AC_BASH_COMPFUNC_PATH=${path.join(config.cacheDir, 'autocomplete', 'functions', 'bash', 'oclif-example.bash')} && test -f $OCLIF_EXAMPLE_AC_BASH_COMPFUNC_PATH && source $OCLIF_EXAMPLE_AC_BASH_COMPFUNC_PATH;`)
    })

    it('#zshSetupScript', () => {
      expect(cmd.zshSetupScript).to.eq(`
fpath=(
${path.join(config.cacheDir, 'autocomplete', 'functions', 'zsh')}
$fpath
);
autoload -Uz compinit;
compinit;
`)
    })

    it('#powershellSetupScript', () => {
      expect(cmd.powershellSetupScript).to.eq(`$env:OCLIF_EXAMPLE_AC_POWERSHELL_COMPFUNC_PATH="${path.join(config.cacheDir, 'autocomplete', 'functions', 'powershell', 'oclif-example.ps1')}"; .$env:OCLIF_EXAMPLE_AC_POWERSHELL_COMPFUNC_PATH`)
    })

    it('#bashCompletionFunction', () => {
      expect(cmd.bashCompletionFunction).to.eq(`#!/usr/bin/env bash

_oclif-example_autocomplete()
{

  local cur="\${COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
autocomplete --skip-instructions
autocomplete:foo --bar --baz --dangerous --brackets --double-quotes --multi-line --json
foo --bar --baz --dangerous --brackets --double-quotes --multi-line --json
"

  if [[ "$cur" != "-"* ]]; then
    opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
  else
    local __COMP_WORDS
    if [[ \${COMP_WORDS[2]} == ":" ]]; then
      #subcommand
      __COMP_WORDS=$(printf "%s" "\${COMP_WORDS[@]:1:3}")
    else
      #simple command
      __COMP_WORDS="\${COMP_WORDS[@]:1:1}"
    fi
    opts=$(printf "$commands" | grep "\${__COMP_WORDS}" | sed -n "s/^\${__COMP_WORDS} //p")
  fi
  _get_comp_words_by_ref -n : cur
  COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
  __ltrim_colon_completions "$cur"
  return 0

}

complete -o default -F _oclif-example_autocomplete oclif-example\n`)
    })

    it('#bashCompletionFunction with spaces', async () => {
      const spacedConfig = new Config({root})

      await spacedConfig.load()
      spacedConfig.topicSeparator = ' '
      // : any is required for the next two lines otherwise ts will complain about _manifest and bashCompletionFunction being private down below
      const spacedCmd: any = new Create([], spacedConfig)
      const spacedPlugin: any = new Plugin({root})
      spacedCmd.config.plugins = [spacedPlugin]
      spacedPlugin._manifest = () => {
        return loadJSON(path.resolve(__dirname, '../../test.oclif.manifest.json'))
      }
      await spacedPlugin.load()

      expect(spacedCmd.bashCompletionFunction).to.eq(`#!/usr/bin/env bash

# This function joins an array using a character passed in
# e.g. ARRAY=(one two three) -> join_by ":" \${ARRAY[@]} -> "one:two:three"
function join_by { local IFS="$1"; shift; echo "$*"; }

_oclif-example_autocomplete()
{

  local cur="\${COMP_WORDS[COMP_CWORD]}" opts normalizedCommand colonPrefix IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
autocomplete --skip-instructions
autocomplete:foo --bar --baz --dangerous --brackets --double-quotes --multi-line --json
foo --bar --baz --dangerous --brackets --double-quotes --multi-line --json
"

  function __trim_colon_commands()
  {
    # Turn $commands into an array
    commands=("\${commands[@]}")

    if [[ -z "$colonPrefix" ]]; then
      colonPrefix="$normalizedCommand:"
    fi

    # Remove colon-word prefix from $commands
    commands=( "\${commands[@]/$colonPrefix}" )

    for i in "\${!commands[@]}"; do
      if [[ "\${commands[$i]}" == "$normalizedCommand" ]]; then
        # If the currently typed in command is a topic command we need to remove it to avoid suggesting it again
        unset "\${commands[$i]}"
      else
        # Trim subcommands from each command
        commands[$i]="\${commands[$i]%%:*}"
      fi
    done
  }

  if [[ "$cur" != "-"* ]]; then
    # Command
    __COMP_WORDS=( "\${COMP_WORDS[@]:1}" )

    # The command typed by the user but separated by colons (e.g. "mycli command subcom" -> "command:subcom")
    normalizedCommand="$( printf "%s" "$(join_by ":" "\${__COMP_WORDS[@]}")" )"

    # The command hirarchy, with colons, leading up to the last subcommand entered (e.g. "mycli com subcommand subsubcom" -> "com:subcommand:")
    colonPrefix="\${normalizedCommand%"\${normalizedCommand##*:}"}"

    if [[ -z "$normalizedCommand" ]]; then
      # If there is no normalizedCommand yet the user hasn't typed in a full command
      # So we should trim all subcommands & flags from $commands so we can suggest all top level commands
      opts=$(printf "%s " "\${commands[@]}" | grep -Eo '^[a-zA-Z0-9_-]+')
    else
      # Filter $commands to just the ones that match the $normalizedCommand and turn into an array
      commands=( $(compgen -W "$commands" -- "\${normalizedCommand}") )
      # Trim higher level and subcommands from the subcommands to suggest
      __trim_colon_commands "$colonPrefix"

      opts=$(printf "%s " "\${commands[@]}") # | grep -Eo '^[a-zA-Z0-9_-]+'
    fi
  else 
    # Flag

    # The full CLI command separated by colons (e.g. "mycli command subcommand --fl" -> "command:subcommand")
    # This needs to be defined with $COMP_CWORD-1 as opposed to above because the current "word" on the command line is a flag and the command is everything before the flag
    normalizedCommand="$( printf "%s" "$(join_by ":" "\${COMP_WORDS[@]:1:($COMP_CWORD - 1)}")" )"

    # The line below finds the command in $commands using grep
    # Then, using sed, it removes everything from the found command before the --flags (e.g. "command:subcommand:subsubcom --flag1 --flag2" -> "--flag1 --flag2")
    opts=$(printf "%s " "\${commands[@]}" | grep "\${normalizedCommand}" | sed -n "s/^\${normalizedCommand} //p")
  fi

  COMPREPLY=($(compgen -W "$opts" -- "\${cur}"))
}

complete -F _oclif-example_autocomplete oclif-example\n`)
    })

    it('#zshCompletionFunction', () => {
      /* eslint-disable no-useless-escape */
      expect(cmd.zshCompletionFunction).to.eq(`#compdef oclif-example

_oclif-example () {
  local _command_id=\${words[2]}
  local _cur=\${words[CURRENT]}
  local -a _command_flags=()

  ## public cli commands & flags
  local -a _all_commands=(
"autocomplete:display autocomplete instructions"
"autocomplete\\:foo:cmd for autocomplete testing \\\\\\\`with some potentially dangerous script\\\\\\\` and \\\\\[square brackets\\\\\] and \\\\\\\"double-quotes\\\\\\\""
"foo:cmd for autocomplete testing \\\\\\\`with some potentially dangerous script\\\\\\\` and \\\\\[square brackets\\\\\] and \\\\\\\"double-quotes\\\\\\\""
  )

  _set_flags () {
    case $_command_id in
autocomplete)
  _command_flags=(
    "--skip-instructions[don't show installation instructions]"
  )
;;

autocomplete:foo)
  _command_flags=(
    "--bar=-[bar for testing]:"
"--baz=-[baz for testing]:"
"--dangerous=-[\\\\\\\`with some potentially dangerous script\\\\\\\`]:"
"--brackets=-[\\\\\[square brackets\\\\\]]:"
"--double-quotes=-[\\\\\\\"double-quotes\\\\\\\"]:"
"--multi-line=-[multi-]:"
"--json[output in json format]"
  )
;;

foo)
  _command_flags=(
    "--bar=-[bar for testing]:"
"--baz=-[baz for testing]:"
"--dangerous=-[\\\\\\\`with some potentially dangerous script\\\\\\\`]:"
"--brackets=-[\\\\\[square brackets\\\\\]]:"
"--double-quotes=-[\\\\\\\"double-quotes\\\\\\\"]:"
"--multi-line=-[multi-]:"
"--json[output in json format]"
  )
;;

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

_oclif-example\n`)

      /* eslint-enable no-useless-escape */
    })

    it('#powershellCompletionFunction', () => {
      expect(cmd.powershellCompletionFunction).to.eq(`# oclif-example Autocomplete
Register-ArgumentCompleter -Native -CommandName oclif-example -ScriptBlock {
  $commands = "autocomplete,autocomplete:foo,foo"
  ($commands).Split(",") | ForEach-Object {
    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
  }
}\n`)
    })
  })
})
