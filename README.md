# Silverback Vault V3

Dashboard-style encrypted account database for Android/tablet/desktop.

## New in V3
- Full dashboard layout
- Silverback dark/silver theme
- Sidebar navigation
- Account statistics
- Group count + group filter
- Responsive account table
- Mobile account cards
- Quick Actions panel
- Sync Status panel
- Vault Status panel
- Installable PWA
- Local encrypted storage
- Optional Supabase ciphertext sync

## Encryption
The vault is encrypted client-side using AES-GCM 256-bit.
The key is derived from the master password with PBKDF2 SHA-256.
The master password is never stored.

## Run locally
```bash
python -m http.server 8080
```

Then open:
```text
http://localhost:8080
```

## Install on Android
Host over HTTPS, open in Chrome, then use Install App / Add to Home Screen.

## Supabase
Use the included `supabase.sql`, then fill in:
- Project URL
- anon/public key
- Vault ID

Never place a Supabase service_role key in frontend code.
