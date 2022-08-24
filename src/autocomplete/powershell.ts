const script = `# <CLI_BIN> Autocomplete
Register-ArgumentCompleter -Native -CommandName <CLI_BIN> -ScriptBlock {
  $commands = "<POWERSHELL_COMMANDS_WITH_FLAGS_LIST>"
  ($commands).Split(",") | ForEach-Object {
    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
  }
}
`
export default script
