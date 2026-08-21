# Dashboard Visual, Upload, and Connection QA Contract

## Unified Dashboard Brand System

All member dashboards and the Super Admin panel use the same four core colours. Evergreen is the primary action and navigation colour; Harvest Gold is reserved for controlled emphasis and status chips; Rice Canvas is the page background; Slate Leaf is the main text colour. Status colours remain semantic only: red for destructive/error states and green for confirmed success. Role identity must be communicated by **copy and iconography**, not unrelated blue, purple, or green role palettes.

| Surface | Required treatment |
| --- | --- |
| Page background | Rice Canvas `#F6F7F3` |
| Card and input surface | White on a visible Evergreen-gray outline `#D8E0D8` |
| Main action | Evergreen `#0F5132` with white copy |
| Accent / controlled emphasis | Harvest Gold `#D98B1D` with Slate Leaf copy where contrast is required |
| Body copy | Slate Leaf `#20322E`; subdued copy `#5D6D67` |
| Keyboard focus | Evergreen focus ring plus visible outline offset |

Controls must never rely only on a white fill to communicate an input or button boundary. Inputs use a tinted Rice Canvas fill, a visible outline, and focus state. Secondary buttons use Rice Canvas or white only when paired with a distinct outline and Slate Leaf copy.

## Avatar Upload Contract

The profile editor accepts local JPEG, PNG, WebP, and AVIF files up to 5 MB. The browser validates the file before upload, then stores it in the existing public Supabase `avatars` bucket at:

```text
{authenticated-profile-id}/avatar-{random-uuid}.{safe-extension}
```

The existing storage policy grants writes only to an authenticated user’s own first-level folder. The resulting public object URL is saved to `profiles.avatar_url` only after a successful upload. The editor no longer accepts arbitrary external image URLs. A failed upload must show an explicit error and leave the previous profile photo unchanged.

## Two-Account Connection Test Protocol

The complete test requires a staging database with Migrations 09, 10, and 11 already applied, two confirmed non-admin accounts, and each account’s own opted-in contact settings.

| Step | Account A | Account B | Expected verified result |
| --- | --- | --- | --- |
| 1 | Enables share-email and/or share-phone in profile settings. | Keeps own selections independent. | The choices update `profile_private` and remain private. |
| 2 | Opens B’s directory profile and sends a request. | — | `connection_requests` has one pending row and B receives an in-app notification. |
| 3 | — | Opens Dashboard → Connections. | B sees the incoming request with A’s public identity only, not contact details. |
| 4 | — | Accepts the request. | Request status becomes `accepted`; both accounts receive the appropriate notification. |
| 5 | Reloads B’s public profile. | Reloads A’s public profile. | Each side sees only the other’s opted-in email/phone via `get_accepted_connection_contact`. |
| 6 | Attempts an unrelated or pending connection contact query. | — | Function returns no contact details/rejects the call. |

> **Current deployment gate:** the connected staging preview still lacks Migrations 09–11. The UI correctly displays safe setup errors rather than sample data. Applying the migrations is necessary before real two-account persistence and contact-sharing tests can run.
