# Security Rules

## Authentication

Passwords must be securely hashed.

Never store plaintext passwords.

Never expose password hashes to the client.

## Sessions

Keep authentication state server-controlled where possible.

Do not expose privileged credentials to client-side JavaScript.

## Sync Key

The sync key is a secret.

Never:

- log it
- commit it
- display it unnecessarily
- include it in client bundles
- store it in source code

## Authorization

Enforce authorization server-side.

Do not rely on hiding UI controls.

Owner-only operations must be checked on the server.

Admin-dev capabilities must not be accessible merely because a UI button is hidden.

## Sensitive Data

Do not include:

- passwords
- sync keys
- credentials

in logs, screenshots, test fixtures, or error messages.