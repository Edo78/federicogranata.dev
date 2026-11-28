# Repository instructions

## Vendored third-party dependencies

The following files are vendored third-party assets:

- `src/public/js/goatcounter.js`
- `src/public/js/goatcounter.LICENSE.txt`

Their version, upstream URL and integrity checksum are
recorded in `vendor/goatcounter.json`.

### Maintenance rules

- Never modify, patch, refactor, minify or reformat
  vendored third-party code.
- Report defects in vendored code to the upstream project.
- Preserve upstream copyright notices and licenses.
- Never change integrity checksums to accommodate local
  modifications.
- Update vendored dependencies only by replacing them with
  official upstream releases.
- Verify the published upstream checksum before updating
  the dependency manifest.
- Keep dependency updates separate from unrelated changes.
- Never disable or weaken integrity tests to make a
  modified dependency pass.
- Do not introduce network requests during the build
  to download or update vendored dependencies.
