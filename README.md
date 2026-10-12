# Edgar's 3D Prints AI Assistant

A Cloudflare Worker prototype for a 3D helmet sales assistant, tailored to the custom cosplay builds listed on Facebook Marketplace.

## Features

- Helmet catalog with comic, team-color, and music filters.
- Chat for product, head-measurement, and customization questions.
- Quote draft saved in the browser and copied to message the seller.
- Direct link to the Marketplace profile: https://www.facebook.com/marketplace/profile/100002822624353/
- Worker chat endpoint uses Llama 3.3 on Workers AI when the Worker has an `AI` binding or Cloudflare AI credentials configured. Without them, it returns catalog-aware preview responses.

## Cloudflare setup

The original app is hosted as a private Cloudflare Site. This GitHub repository stores a copy of the source; pushing here does not deploy changes to that Site.

To enable live model responses in another Cloudflare Worker deployment, provide either:

- A Workers AI binding named `AI`, or
- Worker secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN`.

The code uses model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Never commit API tokens or other secrets. Conversation history and quote details are stored in the visitor's browser local storage.

## Source layout

- `worker/index.js` — app UI and Worker API.
- `.openai/hosting.json` — Sites project configuration for the original private deployment.

## Routes

- `GET /` — storefront and chat.
- `GET /api/health` — reports whether the AI integration is configured.
- `GET /api/catalog` — product catalog.
- `POST /api/chat` — assistant reply.
