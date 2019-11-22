// import {flags} from '@oclif/command'
import {Config, Plugin} from '@oclif/config'
import {loadJSON} from '@oclif/config/lib/util'
import {expect} from 'chai'
import * as path from 'path'

import Create from '../../../src/commands/autocomplete/create'

const root = path.resolve(__dirname, '../../../package.json')
const config = new Config({root})

// autocomplete will throw error on windows ci
const {default: skipWindows} = require('../../helpers/runtest')

// const AC_PLUGIN_PATH = path.resolve(__dirname, '..', '..', '..')

// class CacheBuildFlagsTest extends Create {
//   static flags = {
//     app: flags.string({description: 'app to use', char: 'a'}),
//     visable: flags.string({description: 'Visable flag', char: 'v'}),
//     hidden: flags.boolean({description: 'Hidden flag', char: 'h', hidden: true}),
//   }
// }

skipWindows('Create', () => {
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
      expect(cmd.bashSetupScriptPath).to.eq(`${dir}/autocomplete/bash_setup`)
      expect(cmd.bashCompletionFunctionPath).to.eq(`${dir}/autocomplete/functions/bash/oclif-example.bash`)
      expect(cmd.zshSetupScriptPath).to.eq(`${dir}/autocomplete/zsh_setup`)
      expect(cmd.zshCompletionFunctionPath).to.eq(`${dir}/autocomplete/functions/zsh/_oclif-example`)
    })

    it('#bashSetupScript', () => {
      expect(cmd.bashSetupScript).to.eq(`OCLIF_EXAMPLE_AC_BASH_COMPFUNC_PATH=${config.cacheDir}/autocomplete/functions/bash/oclif-example.bash && test -f $OCLIF_EXAMPLE_AC_BASH_COMPFUNC_PATH && source $OCLIF_EXAMPLE_AC_BASH_COMPFUNC_PATH;\n`)
    })

    it('#zshSetupScript', () => {
      expect(cmd.zshSetupScript).to.eq(`
fpath=(
${config.cacheDir}/autocomplete/functions/zsh
$fpath
);
autoload -Uz compinit;
compinit;
`)
    })

    it('#bashCompletionFunction', () => {
      expect(cmd.bashCompletionFunction).to.eq(`#!/usr/bin/env bash

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

_oclif-example()
{

  local cur="\${COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
autocomplete --skip-instructions
autocomplete:foo --bar --baz --dangerous --brackets --double-quotes --multi-line --json
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

complete -F _oclif-example oclif-example\n`)
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

_oclif-example\n`)

      /* eslint-enable no-useless-escape */
    })
  })
})
