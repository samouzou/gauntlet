# Reelwright

AI video studio powered by **Arc**.

- Explore sample characters & scenes with no account
- Sign in only when you generate or edit (credits)
- Character references for continuity across scenes
- Conversational scene editing — keep refining by chat

## Dev

```bash
npm install
# set GEMINI_API_KEY (or GOOGLE_GENAI_API_KEY), Firebase, and Stripe env vars
npm run dev
```

## Key routes

- `/` — landing with sample cast + reels
- `/studio` — create / generate / edit
- `/login` — auth
- Stripe webhook — `/api/stripe/webhook`
