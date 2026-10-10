# Reelwright

A studio for characters, scenes, and stories that continue.

- Meet a cast and step into scenes without an account
- Sign in when you’re ready to shoot
- Characters that stay themselves across scenes
- Edit by talking — keep refining the next cut

## Dev

```bash
npm install
# set GEMINI_API_KEY (or GOOGLE_GENAI_API_KEY), Firebase, and Stripe env vars
npm run dev
```

## Key routes

- `/` — landing with cast + scenes
- `/studio` — create / shoot / edit
- `/login` — auth
- Stripe webhook — `/api/stripe/webhook`
