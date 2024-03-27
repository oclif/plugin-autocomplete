const script = `#!/usr/bin/env bash

_<CLI_BIN>_autocomplete()
{

  local cur="\${COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
<BASH_COMMANDS_WITH_FLAGS_LIST>
"

local targetOrgFlags=("--target-org" "-o")

function _isTargetOrgFlag(){
  local value="$1"
  for flag in "\${targetOrgFlags[@]}"; do
    if [[ "$flag" == "$value" ]]; then
      return 0 # value found
    fi
  done
  return 1 # value not found
}

function _suggestOrgs(){
  local orgs="$(sf autocomplete --display-orgs bash 2>/dev/null)"

  if [[ "$cur" != "-"* ]]; then
    opts=$(printf "%s " "\${orgs[@]}" | grep -i "\${cur}")
    COMPREPLY=($(compgen -W "$opts"))
  fi
}

  if [[ "$cur" != "-"* ]]; then
    if _isTargetOrgFlag "\${COMP_WORDS[COMP_CWORD-1]}"; then
      _suggestOrgs
    else
      opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
    fi
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

    if _isTargetOrgFlag "\${COMP_WORDS[COMP_CWORD]}"; then
      _suggestOrgs
    fi
  fi
  _get_comp_words_by_ref -n : cur

  if [[ -z "$COMPREPLY" ]]; then
    COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
  fi
  __ltrim_colon_completions "$cur"
  return 0

}

complete -o default -F _<CLI_BIN>_autocomplete <CLI_BIN>
`

export default script
