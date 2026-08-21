# SECURITY

Account/session cookies should be treated like passwords.

Design:
- Encryption/decryption happens in the browser.
- The master password is never persisted.
- The online backend stores only ciphertext.
- AES-GCM provides confidentiality and integrity.
- PBKDF2 derives a 256-bit key from the master password.

For production:
- Use a long, unique master password.
- Host only over HTTPS.
- Do not share encrypted backups publicly.
- Do not put a Supabase service_role key in frontend code.
- Prefer V3 with Supabase Auth + RLS per user.
