# Secure Admin Portal Provisioning

The **Admin Portal** is a separate authentication path for existing platform administrators. It does not create administrator accounts, pre-fill credentials, or store a password in source code, environment variables, browser storage, database migrations, or documentation.

## Access Flow

1. A person selects **Admin Portal** at the bottom of the standard member login page.
2. They enter their own Supabase Auth email and password on `/admin-login`.
3. The portal signs in through Supabase Auth.
4. It reads the signed-in account’s database profile using the authenticated session.
5. Only `profiles.user_type = 'admin'` is redirected to `/admin/`.
6. Every non-admin account is immediately signed out and returned an access-denied message. The Super Admin route repeats the role check before loading governance data.

## Provisioning an Administrator

The database owner must create or confirm the Auth user through the Supabase Auth Dashboard or an approved server-side administrative workflow. Then, after the user has a `profiles` row, the database owner changes **that profile only** to the `admin` role in the protected SQL environment. Public member signup must never provide `admin` as a selectable role.

> Do not commit, pre-fill, paste into source files, or send passwords in project documentation. If an administrator password was shared in a message, rotate it in Supabase Auth after the portal is provisioned.

## Verification

Test with one intended administrator and one regular member. The administrator should reach `/admin/`; the regular member should be signed out and denied. Confirm that `/admin/` also rejects unauthenticated and non-admin sessions when entered directly.
