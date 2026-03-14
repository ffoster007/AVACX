Use the helper script for quick local scans:

- `./avago -? <target>` runs the existing Go scanner with the `--path` flag pre-wired.
- Run `chmod +x avago` once if the script is not yet executable.

You can still fall back to the raw Go command when needed:

- `go run ./cmd --path <target>` validates heuristics and rule updates.

Future work: expose the scanner via HTTP or gRPC so the Next.js layer can consume findings directly.