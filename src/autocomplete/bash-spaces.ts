import {Command, Config, Interfaces} from '@oclif/core'
import * as ejs from 'ejs'

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

export default class BashCompWithSpaces {
  protected config: Config
  private commands: CommandCompletion[]
  private topics: Topic[]

  constructor(config: Config) {
    this.config = config
    this.topics = this.getTopics()
    this.commands = this.getCommands()
  }

  public generate(): string {
    const commandsWithFlags = this.generateCommandsWithFlags()
    const flagCompletionCases = this.generateFlagCompletionCases()
    const multipleFlagsCases = this.generateMultipleFlagsCases()
    
    return `#!/usr/bin/env bash

# This function joins an array using a character passed in
# e.g. ARRAY=(one two three) -> join_by ":" \${ARRAY[@]} -> "one:two:three"
function join_by { local IFS="$1"; shift; echo "$*"; }

_${this.config.bin}_autocomplete()
{
  local cur="\${COMP_WORDS[COMP_CWORD]}" opts normalizedCommand colonPrefix IFS=$' \\t\\n'
  local prev="\${COMP_WORDS[COMP_CWORD-1]}"
  COMPREPLY=()

  local commands="
${commandsWithFlags}
"

  # Function to check if a flag can be specified multiple times
  function __is_multiple_flag()
  {
    local cmd="$1"
    local flag="$2"
    case "$cmd" in
${multipleFlagsCases}
      *)
        return 1
        ;;
    esac
  }

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

  # Check if we're completing a flag value by looking for the last flag that expects a value
  local last_flag_expecting_value=""
  local should_complete_flag_value=false
  
  # Check if the previous word is a flag (simple case)
  if [[ "$prev" =~ ^(-[a-zA-Z]|--[a-zA-Z0-9-]+)$ ]]; then
    last_flag_expecting_value="$prev"
    should_complete_flag_value=true
  else
    # Look backwards through the words to find the last flag that might expect a value
    for ((i=COMP_CWORD-1; i>=1; i--)); do
      local word="\${COMP_WORDS[i]}"
      if [[ "$word" =~ ^(-[a-zA-Z]|--[a-zA-Z0-9-]+)$ ]]; then
        # Found a flag, check if it expects a value and doesn't have one yet
        local flag_has_value=false
        if [[ $((i+1)) -lt COMP_CWORD ]]; then
          local next_word="\${COMP_WORDS[$((i+1))]}"
          if [[ "$next_word" != -* && -n "$next_word" ]]; then
            flag_has_value=true
          fi
        fi
        
        # If this flag doesn't have a value yet, it might be expecting one
        if [[ "$flag_has_value" == false ]]; then
          last_flag_expecting_value="$word"
          should_complete_flag_value=true
          break
        fi
      elif [[ "$word" != -* ]]; then
        # Hit a non-flag word, stop looking
        break
      fi
    done
  fi
  
  if [[ "$should_complete_flag_value" == true ]]; then
    # Get the command path (everything except flags and their values)
    local cmd_words=()
    local i=1
    while [[ i -lt COMP_CWORD ]]; do
      if [[ "\${COMP_WORDS[i]}" =~ ^--[a-zA-Z0-9-]+$ ]]; then
        # Found a long flag, skip it and its potential value
        if [[ $((i+1)) -lt COMP_CWORD && "\${COMP_WORDS[$((i+1))]}" != -* ]]; then
          ((i++)) # Skip the flag value
        fi
      elif [[ "\${COMP_WORDS[i]}" =~ ^-[a-zA-Z]$ ]]; then
        # Found a short flag, skip it and its potential value
        if [[ $((i+1)) -lt COMP_CWORD && "\${COMP_WORDS[$((i+1))]}" != -* ]]; then
          ((i++)) # Skip the flag value
        fi
      elif [[ "\${COMP_WORDS[i]}" != -* ]]; then
        # This is a command word (not a flag)
        cmd_words+=("\${COMP_WORDS[i]}")
      fi
      ((i++))
    done
    # Build colon-separated command, then convert to space-separated for case matching
    local colonCommand="$( printf "%s" "$(join_by ":" "\${cmd_words[@]}")" )"
    normalizedCommand="\${colonCommand//:/ }"
    
    # Handle flag value completion (only if the flag actually has values to complete)
    local has_flag_values=false
    local prev="$last_flag_expecting_value"
    case "$normalizedCommand" in
${flagCompletionCases}
      *)
        has_flag_values=false
        ;;
    esac
    
    # If no flag values found, fall through to regular flag completion
    if [[ "$has_flag_values" == false ]]; then
      # Treat this as regular flag completion instead
      normalizedCommand="$colonCommand"
      # Fall through to flag completion below (don't return here)
    else
      # We found flag values, return them and exit early
      COMPREPLY=($(compgen -W "$opts" -- "\${cur}"))
      return 0
    fi
  fi
  
  # Handle command completion
  if [[ "$cur" != "-"* ]]; then
    # Command completion
    __COMP_WORDS=( "\${COMP_WORDS[@]:1}" )

    # Filter out any flags from the command words
    local clean_words=()
    for word in "\${__COMP_WORDS[@]}"; do
      if [[ "$word" != -* ]]; then
        clean_words+=("$word")
      fi
    done

    # The command typed by the user but separated by colons (e.g. "mycli command subcom" -> "command:subcom")
    normalizedCommand="$( printf "%s" "$(join_by ":" "\${clean_words[@]}")" )"

    # The command hierarchy, with colons, leading up to the last subcommand entered
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

      opts=$(printf "%s " "\${commands[@]}")
    fi
  else
    # Handle flag completion OR fallthrough from boolean flag case above
    # Flag completion
    
    # DEBUG: Dump completion state to temp file
    echo "=== DEBUG FLAG COMPLETION ===" > /tmp/sf_completion_debug.log
    echo "COMP_WORDS: \${COMP_WORDS[@]}" >> /tmp/sf_completion_debug.log
    echo "COMP_CWORD: \$COMP_CWORD" >> /tmp/sf_completion_debug.log
    echo "cur: $cur" >> /tmp/sf_completion_debug.log
    echo "prev: $prev" >> /tmp/sf_completion_debug.log
    
    # Get the command path (everything except flags and their values)
    local cmd_words=()
    local i=1
    while [[ i -lt COMP_CWORD ]]; do
      if [[ "\${COMP_WORDS[i]}" =~ ^--[a-zA-Z0-9-]+$ ]]; then
        # Found a long flag, skip it and its potential value
        if [[ $((i+1)) -lt COMP_CWORD && "\${COMP_WORDS[$((i+1))]}" != -* ]]; then
          ((i++)) # Skip the flag value
        fi
      elif [[ "\${COMP_WORDS[i]}" =~ ^-[a-zA-Z]$ ]]; then
        # Found a short flag, skip it and its potential value
        if [[ $((i+1)) -lt COMP_CWORD && "\${COMP_WORDS[$((i+1))]}" != -* ]]; then
          ((i++)) # Skip the flag value
        fi
      elif [[ "\${COMP_WORDS[i]}" != -* ]]; then
        # This is a command word (not a flag)
        cmd_words+=("\${COMP_WORDS[i]}")
      fi
      ((i++))
    done
    normalizedCommand="$( printf "%s" "$(join_by ":" "\${cmd_words[@]}")" )"
    echo "cmd_words: \${cmd_words[@]}" >> /tmp/sf_completion_debug.log
    echo "normalizedCommand: $normalizedCommand" >> /tmp/sf_completion_debug.log

    # Get already used flags to avoid suggesting them again
    local used_flags=()
    local i=1
    while [[ i -lt COMP_CWORD ]]; do
      if [[ "\${COMP_WORDS[i]}" =~ ^--[a-zA-Z0-9-]+$ ]]; then
        used_flags+=("\${COMP_WORDS[i]}")
        # Only skip next word if it's actually a flag value (not starting with - and not empty)
        if [[ $((i+1)) -lt COMP_CWORD && "\${COMP_WORDS[$((i+1))]}" != -* && -n "\${COMP_WORDS[$((i+1))]}" ]]; then
          ((i++))
        fi
      elif [[ "\${COMP_WORDS[i]}" =~ ^-[a-zA-Z]$ ]]; then
        used_flags+=("\${COMP_WORDS[i]}")
        # Only skip next word if it's actually a flag value (not starting with - and not empty)
        if [[ $((i+1)) -lt COMP_CWORD && "\${COMP_WORDS[$((i+1))]}" != -* && -n "\${COMP_WORDS[$((i+1))]}" ]]; then
          ((i++))
        fi
      fi
      ((i++))
    done
    
    echo "used_flags: \${used_flags[@]}" >> /tmp/sf_completion_debug.log

    # Find the command in $commands and extract its flags
    local cmd_line=$(printf "%s\\n" "\${commands[@]}" | grep "^$normalizedCommand ")
    if [[ -n "$cmd_line" ]]; then
      # Extract flags from the command line
      local all_flags=$(echo "$cmd_line" | sed -n "s/^$normalizedCommand //p")
      echo "cmd_line: $cmd_line" >> /tmp/sf_completion_debug.log
      echo "all_flags: $all_flags" >> /tmp/sf_completion_debug.log
      
      # Build a mapping of short to long flags for equivalency checking
      local flag_pairs=()
      local temp_flags=($all_flags)
      local j=0
      while [[ j -lt \${#temp_flags[@]} ]]; do
        if [[ "\${temp_flags[j]}" =~ ^-[a-zA-Z]$ && $((j+1)) -lt \${#temp_flags[@]} && "\${temp_flags[$((j+1))]}" =~ ^--[a-zA-Z0-9-]+$ ]]; then
          flag_pairs+=("\${temp_flags[j]}:\${temp_flags[$((j+1))]}")
          ((j += 2))
        else
          ((j++))
        fi
      done
      
      # Filter out already used flags (including equivalent short/long forms)
      local available_flags=()
      for flag in $all_flags; do
        local flag_found=false
        
        # Check if this flag can be specified multiple times
        if __is_multiple_flag "$normalizedCommand" "$flag"; then
          # Multiple flags are always available
          echo "Flag $flag is multiple for command $normalizedCommand" >> /tmp/sf_completion_debug.log
          flag_found=false
        else
          # Check direct match
          for used_flag in "\${used_flags[@]}"; do
            if [[ "$flag" == "$used_flag" ]]; then
              flag_found=true
              break
            fi
          done
          
          # Check equivalent short/long form
          if [[ "$flag_found" == false ]]; then
            for pair in "\${flag_pairs[@]}"; do
              local short_flag="\${pair%:*}"
              local long_flag="\${pair#*:}"
              for used_flag in "\${used_flags[@]}"; do
                if [[ "$flag" == "$short_flag" && "$used_flag" == "$long_flag" ]] || [[ "$flag" == "$long_flag" && "$used_flag" == "$short_flag" ]]; then
                  flag_found=true
                  break 2
                fi
              done
            done
          fi
        fi
        
        if [[ "$flag_found" == false ]]; then
          available_flags+=("$flag")
        fi
      done
      
      echo "flag_pairs: \${flag_pairs[@]}" >> /tmp/sf_completion_debug.log
      echo "available_flags: \${available_flags[@]}" >> /tmp/sf_completion_debug.log
      opts=$(printf "%s " "\${available_flags[@]}")
    else
      echo "No cmd_line found for: $normalizedCommand" >> /tmp/sf_completion_debug.log
      opts=""
    fi
    
    echo "final opts: $opts" >> /tmp/sf_completion_debug.log
  fi

  COMPREPLY=($(compgen -W "$opts" -- "\${cur}"))
}

complete -F _${this.config.bin}_autocomplete ${this.config.bin}
${this.config.binAliases?.map((alias) => `complete -F _${this.config.bin}_autocomplete ${alias}`).join('\n') ?? ''}
`
  }

  private genCmdPublicFlags(command: CommandCompletion): string {
    const flags = Object.keys(command.flags)
      .filter((flag) => !command.flags[flag].hidden)
      .map((flag) => {
        const f = command.flags[flag]
        const flagStr = f.char ? `-${f.char} --${flag}` : `--${flag}`
        return flagStr
      })
    
    return flags.join(' ')
  }

  private generateCommandsWithFlags(): string {
    return this.commands
      .map((c) => {
        const publicFlags = this.genCmdPublicFlags(c).trim()
        // Keep colon-separated format for internal bash completion logic
        return `${c.id} ${publicFlags}`
      })
      .join('\n')
  }

  private generateFlagCompletionCases(): string {
    const cases: string[] = []
    
    for (const cmd of this.commands) {
      const flagCases: string[] = []
      
      for (const [flagName, flag] of Object.entries(cmd.flags)) {
        if (flag.hidden) continue
        
        if (flag.type === 'option' && flag.options) {
          const options = flag.options.join(' ')

          // Handle both long and short flag forms
          if (flag.char) {
            flagCases.push(
              `        if [[ "$prev" == "--${flagName}" || "$prev" == "-${flag.char}" ]]; then`,
              `          opts="${options}"`,
              `          has_flag_values=true`,
              `        fi`,
            )
          } else {
            flagCases.push(
              `        if [[ "$prev" == "--${flagName}" ]]; then`,
              `          opts="${options}"`,
              `          has_flag_values=true`,
              `        fi`,
            )
          }
        }
      }
      
      if (flagCases.length > 0) {
        // Convert colon-separated command IDs to space-separated for SF CLI format
        const spaceId = cmd.id.replaceAll(':', ' ')
        cases.push(`      "${spaceId}")`, ...flagCases, `        ;;`)
      }
    }
    
    return cases.join('\n')
  }

  private generateMultipleFlagsCases(): string {
    const cases: string[] = []
    
    for (const cmd of this.commands) {
      const multipleFlags: string[] = []
      
      for (const [flagName, flag] of Object.entries(cmd.flags)) {
        if (flag.hidden) continue
        
        if ((flag as any).multiple) {
          // Handle both long and short flag forms
          if (flag.char) {
            multipleFlags.push(`"--${flagName}"`, `"-${flag.char}"`)
          } else {
            multipleFlags.push(`"--${flagName}"`)
          }
        }
      }
      
      if (multipleFlags.length > 0) {
        // Use colon-separated command IDs to match how normalizedCommand is built in flag completion
        const flagChecks = multipleFlags.map(flag => `[[ "$flag" == ${flag} ]]`).join(' || ')
        cases.push(`      "${cmd.id}")`, `        if ${flagChecks}; then return 0; fi`, `        return 1`, `        ;;`)
      }
    }
    
    return cases.join('\n')
  }

  private getCommands(): CommandCompletion[] {
    const cmds: CommandCompletion[] = []

    for (const p of this.config.getPluginsList()) {
      // For testing: only include commands from @salesforce/plugin-auth
      // if (p.name !== '@salesforce/plugin-auth') continue
      
      for (const c of p.commands) {
        if (c.hidden) continue
        const summary = this.sanitizeSummary(c.summary ?? c.description)
        const {flags} = c
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

          // Add missing topics for aliases
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
