const script = `# sf Autocomplete
Register-ArgumentCompleter -Native -CommandName sf -ScriptBlock {
  (sf powershellautocomplete).Split(',') | ForEach-Object {
    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
  }
}
`

export default script
