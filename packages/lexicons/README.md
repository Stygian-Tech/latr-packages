# L@tr — ATProto lexicons

Schemas for read-later data stored on the user’s PDS.

| Lexicon | Role |
|---------|------|
| `link.latr.saved.external` | Wrapper for an external URL (deterministic rkey per normalized URL) |
| `link.latr.saved.item` | Saved edge: points at an AT URI (wrapper or native record); optional `linkedWebUrl` + `preview*` cache OG metadata for native subjects |

Legacy `com.latr.saved.*` collections were registered before `latr.link` DNS was authoritative; clients migrate existing repo records to `link.latr.*`.

Record keys are **application-chosen** (deterministic hashes), so lexicons declare `"key": "any"`.

See the product spec in Notion: **L@tr — Lexicons + Web Client (No Backend) + Social Wire Integration**.
