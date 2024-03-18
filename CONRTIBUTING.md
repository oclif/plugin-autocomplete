# Contributing

## Development

**1. Clone this repository...**

```bash
$ git clone git@github.com:oclif/plugin-autocomplete.git
```

**2. Navigate into project & install development-specific dependencies...**

```bash
$ cd ./plugin-autocomplete && yarn
```

**3. Write some code &/or add some tests...**

```bash
...
```

**4. Test changes locally**

To test using local dev script:

```
./bin/dev.js <command>
```

To test inside an existing oclif CLI (must have [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins) installed):

```
<CLI> plugins link --no-install
<CLI> <command>
```

See `plugins link` [documentation](https://github.com/oclif/plugin-plugins?tab=readme-ov-file#mycli-pluginslink-plugin)

**5. Run tests & ensure they pass...**

```
$ yarn test
```

**6. Open a [Pull Request](https://github.com/oclif/plugin-autocomplete/pulls) for your work & become the newest contributor to `@oclif/plugin-autocomplete`! 🎉**

## Pull Request Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). When opening a pull request, please be sure that either the pull request title, or each commit in the pull request, has one of the following prefixes:

- `feat`: For when introducing a new feature. The result will be a new semver minor version of the package when it is next published.
- `fix`: For bug fixes. The result will be a new semver patch version of the package when it is next published.
- `docs`: For documentation updates. The result will be a new semver patch version of the package when it is next published.
- `chore`: For changes that do not affect the published module. Often these are changes to tests. The result will be _no_ change to the version of the package when it is next published (as the commit does not affect the published version).

## What _not_ to contribute?

### Dependencies

It should be noted that our team does not accept third-party dependency updates/PRs. We use dependabot to ensure dependencies are staying up-to-date & will ship security patches for CVEs as they occur. If you submit a PR trying to update our dependencies we will close it with or without a reference to these contribution guidelines.

### Tools/Automation

Our core team is responsible for the maintenance of the tooling/automation in this project & we ask collaborators to kindly not make changes to these when contributing (ex. `.github/*`, `.eslintrc.json`, package.json `scripts`, etc.)
