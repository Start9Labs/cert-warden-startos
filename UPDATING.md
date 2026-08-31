# Updating the upstream version

Upstream is the prebuilt image `ghcr.io/gregtwallace/certwarden`, pinned by tag.
Nothing is built from source, and there is no submodule.

## Determining the upstream version

The pin lives in `startos/manifest/index.ts`, at
`images['cert-warden'].source.dockerTag`. The image tag is the release tag
verbatim, in `vX.Y.Z` form.

**`gh release view` does not work on this repository.** Upstream marks every
release a prerelease, so the "latest release" endpoint has nothing to return and
the command fails with `release not found`. List instead:

```bash
gh release list -R gregtwallace/certwarden --limit 1 --json tagName -q '.[0].tagName'
```

Upstream also publishes `version.json` at the root of that repository, which
carries the same version alongside the schema versions the release expects:

```bash
curl -s https://raw.githubusercontent.com/gregtwallace/certwarden/master/version.json \
  | jq -r '.[0] | "\(.version) config=\(.config_version) db=\(.database_version)"'
```

Confirm the tag is published for both architectures before pinning it:

```bash
docker manifest inspect ghcr.io/gregtwallace/certwarden:<tag> \
  | jq -r '.manifests[].platform | "\(.os)/\(.architecture)"'
```

## Applying the bump

1. Set `dockerTag` in `startos/manifest/index.ts` to `ghcr.io/gregtwallace/certwarden:<tag>`.
2. Compare `config_version` in `version.json` against the `config_version` default
   in `startos/fileModels/config.yaml.ts`. That default only seeds a file that does
   not exist yet — the application migrates an existing file itself — so it needs
   changing only when the new value would be wrong for a **fresh** install.
3. Bump the version in `startos/versions/current.ts` and write its release notes.
