# latr-packages

Public npm/Bun packages for L@tr.link: lexicons, deterministic record keys, gateway client headers, and OpenAPI/Bruno contracts.

## Packages

| Package | Description |
|---------|-------------|
| `@stygian/latr-record-keys` | SHA-256 base32 rkeys and fingerprints (golden-vector tested) |
| `@stygian/latr-gateway-client` | Gateway auth headers, route→XRPC mapping, upstream DPoP proof helpers |
| `@stygian/latr-lexicons` | `com.latr.saved.*` JSON schemas |

## Development

```bash
scripts/bootstrap.sh
scripts/check.sh
```

## License

MIT
