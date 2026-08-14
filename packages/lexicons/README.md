# L@tr — ATProto lexicons

Schemas for read-later data stored on the user’s PDS.

| Lexicon | Role |
|---------|------|
| `community.lexicon.bookmarks.bookmark` | Authoritative community-owned bookmark schema (referenced, not republished here) |
| `link.latr.bookmarks.metadata` | User-owned L@tr state sidecar keyed by the bookmark TID |
| `link.latr.bookmarks.*` | XRPC bookmark save/list/get/state/delete/migration methods |
| `link.latr.saved.external` | **Deprecated history only:** legacy external URL wrapper |
| `link.latr.saved.item` | **Deprecated history only:** legacy saved edge |

Legacy `com.latr.saved.*` and `link.latr.saved.*` records migrate to the community bookmark plus L@tr metadata sidecar. The old schemas remain published for history and one-release delete adapters; new code must not write them.

Record keys are **application-chosen** (deterministic hashes), so lexicons declare `"key": "any"`.

See the product spec in Notion: **L@tr — Lexicons + Web Client (No Backend) + Social Wire Integration**.
