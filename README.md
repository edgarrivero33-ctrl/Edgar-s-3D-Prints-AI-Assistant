# Edgar's 3D Prints

A Cloudflare Worker prototype for a 3D helmet sales assistant, tailored to the custom cosplay builds listed on Facebook Marketplace.

## Live app

The customer-facing app is public at [edgars3dprints.com](https://edgars3dprints.com). Anyone with the link can open it. The original hosted URL, [edgar3d.plucky-chub-6701.chatgpt.site](https://edgar3d.plucky-chub-6701.chatgpt.site), remains available as a fallback. Updates to this GitHub repository do not deploy automatically; publish source changes to the Cloudflare Site to put them online.

## Product catalog

Product details live in [`src/catalog.json`](src/catalog.json). Add or edit a product there: give it a unique `id`, a display `name`, a filter `category` (`comic`, `team`, `music`, or `other`), a `price`, and short `details`. Set `image` to `null` until you add a photo.

To add product photos, upload `.webp`, `.jpg`, `.jpeg`, or `.png` files to the `public/products/` directory in the repository. Keep each image under 400 KB. Then set that product's `image` value in `src/catalog.json` to a path such as `products/spider-man-bnd.webp`. The build embeds referenced images in the Worker so the published Site stays self-contained.

## Project layout

- `src/catalog.json` — product data used by both the UI and AI prompt.
- `src/index.html` — storefront markup.
- `src/app.js` — browser interactions, chat UI, and local quote state.
- `src/styles.css` — storefront styles.
- `public/products/` — product images.
- `public/products/edgars-3d-prints-logo.png` — storefront logo embedded in the published app.
- `worker/index.js` — Worker routes and assistant logic.
- `scripts/build.mjs` — assembles the source files into the single Worker artifact Cloudflare Sites expects.
- `.openai/hosting.json` — Cloudflare Site project and deployment configuration.

## Build and check

```bash
npm run build
node --check dist/server/index.js
```

The assistant uses Llama 3.3 on Workers AI when the Worker has an `AI` binding or Cloudflare AI credentials configured. Without them, it returns catalog-aware preview responses. To use the model through the Cloudflare API, configure `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN` as Worker secrets. Never commit secrets.

Conversation history and quote details are stored in the visitor's browser local storage.

Marketplace profile: https://www.facebook.com/marketplace/profile/100002822624353/

Customer inquiries and pricing: edgarrivero33@gmail.com

## Security

No API keys, access tokens, passwords, or payment credentials are stored in this repository. Cloudflare AI credentials, when used, must be configured as Worker secrets (`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN`). Local `.env` files, `.dev.vars`, and build output are excluded by `.gitignore`.
