import {Config} from '@oclif/core'
import * as path from 'path'
import {Plugin as IPlugin} from '@oclif/core/lib/interfaces'
import {expect} from 'chai'
import {Command as ICommand} from '@oclif/core/lib/interfaces'
import ZshCompWithSpaces from '../../src/autocomplete/zsh'

// autocomplete will throw error on windows ci
const {default: skipWindows} = require('../helpers/runtest')

// @ts-expect-error
class MyCommandClass implements ICommand.Class {
  _base = ''

  aliases: string[] = []

  hidden = false

  id = 'foo:bar'

  flags = {}

  new(): ICommand.Instance {
    return {
      _run(): Promise<any> {
        return Promise.resolve()
      }}
  }

  run(): PromiseLike<any> {
    return Promise.resolve()
  }
}

const commandPluginA: ICommand.Loadable = {
  strict: false,
  aliases: [],
  args: [],
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
      summary: 'Format output as json.',
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
  async load(): Promise<ICommand.Class> {
    return new MyCommandClass() as unknown as ICommand.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/plugina',
}

const commandPluginB: ICommand.Loadable = {
  strict: false,
  aliases: [],
  args: [],
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
  async load(): Promise<ICommand.Class> {
    return new MyCommandClass() as unknown as ICommand.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/pluginb',
}

const commandPluginC: ICommand.Loadable = {
  strict: false,
  aliases: [],
  args: [],
  flags: {},
  hidden: false,
  id: 'search',
  summary: 'Search for a command',
  async load(): Promise<ICommand.Class> {
    return new MyCommandClass() as unknown as ICommand.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/pluginc',
}

const pluginA: IPlugin = {
  load: async (): Promise<void> => {},
  findCommand: async (): Promise<ICommand.Class> => {
    return new MyCommandClass() as unknown as ICommand.Class
  },
  name: '@My/plugina',
  alias: '@My/plugina',
  commands: [commandPluginA, commandPluginB, commandPluginC],
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

skipWindows('zsh comp', () => {
  describe('zsh completion with spaces', () => {
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
      const zshCompWithSpaces = new ZshCompWithSpaces(config as Config)
      expect(zshCompWithSpaces.generate()).to.equal(`#compdef test-cli

_test-cli_deploy() {
  _test-cli_deploy_flags() {
    local context state state_descr line
    typeset -A opt_args

    _arguments -S \\
"*"{-m,--metadata}"[]:file:_files" \\
"(-a --api-version)"{-a,--api-version}"[]:file:_files" \\
--json"[Format output as json.]" \\
"(-i --ignore-errors)"{-i,--ignore-errors}"[Ignore errors.]" \\
"*: :_files"
  }

  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
      if [[ "\${words[CURRENT]}" == -* ]]; then
        _test-cli_deploy_flags
      else
_values "completions" \\
"functions[Deploy a function.]" \\

      fi
      ;;
    args)
      case $line[1] in
        "functions")
          _arguments -S \\
"(-b --branch)"{-b,--branch}"[]:file:_files" \\
"*: :_files"
        ;;

      *)
        _test-cli_deploy_flags
      ;;
      esac
      ;;
  esac
}


_test-cli() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
      _values "completions" \\
"deploy[Deploy a project]" \\
"search[Search for a command]" \\
 
    ;;
    args)
      case $line[1] in
deploy)
  _test-cli_deploy
  ;;
search)
  _test-cli_search
  ;;
esac

    ;;
  esac
}

_test-cli
`)
    })
  })
})
