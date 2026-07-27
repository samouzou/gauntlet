# Outpost

Remote-only job search platform.

- **Seekers** browse free (aggregated Remotive feed + employer posts)
- **Employers** buy posting credits and publish roles
- Auth: Firebase (Google + email/password)
- Payments: Stripe Checkout credit packs

## Dev

```bash
npm install
npm run dev
```

## Notes

- Aggregated jobs come from the [Remotive public API](https://remotive.com/api/remote-jobs). Apply links point back to Remotive.
- Employer jobs live in Firestore `jobs` and cost 1 credit to publish.
