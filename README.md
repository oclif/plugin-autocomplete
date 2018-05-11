@oclif/plugin-autocomplete
==========================

autocomplte plugin for oclif

[![Version](https://img.shields.io/npm/v/@oclif/plugin-autocomplete.svg)](https://npmjs.org/package/@oclif/plugin-autocomplete)
[![CircleCI](https://circleci.com/gh/oclif/plugin-autocomplete/tree/master.svg?style=shield)](https://circleci.com/gh/oclif/plugin-autocomplete/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/plugin-autocomplete?branch=master&svg=true)](https://ci.appveyor.com/project/oclif/plugin-autocomplete/branch/master)
[![Codecov](https://codecov.io/gh/oclif/plugin-autocomplete/branch/master/graph/badge.svg)](https://codecov.io/gh/oclif/plugin-autocomplete)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/plugin-autocomplete.svg)](https://npmjs.org/package/@oclif/plugin-autocomplete)
[![License](https://img.shields.io/npm/l/@oclif/plugin-autocomplete.svg)](https://github.com/oclif/plugin-autocomplete/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @oclif/plugin-autocomplete
$ oclif COMMAND
running command...
$ oclif (-v|--version|version)
@oclif/plugin-autocomplete/0.0.0 darwin-x64 node-v9.3.0
$ oclif --help [COMMAND]
USAGE
  $ oclif COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`oclif autocomplete [SHELL]`](#oclif-autocomplete-shell)

## `oclif autocomplete [SHELL]`

display autocomplete instructions

```
USAGE
  $ oclif autocomplete [SHELL]

ARGUMENTS
  SHELL  shell type

OPTIONS
  -s, --skip-instructions  Do not show installation instructions

EXAMPLES
  $ heroku autocomplete

  $ heroku autocomplete bash

  $ heroku autocomplete zsh
```

_See code: [src/commands/autocomplete.ts](https://github.com/oclif/plugin-autocomplete/blob/v0.0.0/src/commands/autocomplete.ts)_
<!-- commandsstop -->
