# Cloudflare Worker deployment

The repository includes a GitHub Actions deployment workflow at `.github/workflows/deploy-cloudflare-worker.yml`.

## One-time account authorization

GitHub Actions cannot deploy into a Cloudflare account until the repository owner adds two GitHub Actions secrets. Do not paste tokens into chat or commit them to source code.

1. Sign in at https://dash.cloudflare.com/
2. Copy your Cloudflare Account ID from the account overview.
3. Create a Cloudflare API token with **Account / Workers Scripts / Edit** permission, scoped to the account that will host this Worker.
4. Open this GitHub page: https://github.com/nitsgohel1/XAUUSD-AI-BOT/settings/secrets/actions
5. Add repository secret `CLOUDFLARE_API_TOKEN` with the token value.
6. Add repository secret `CLOUDFLARE_ACCOUNT_ID` with the Account ID.
7. Open Actions → **Deploy Cloudflare market-data Worker** → **Run workflow**.

After successful deployment, Cloudflare Workers will show the URL:
`https://xauusd-market-feed.<your-workers-subdomain>.workers.dev`

Then in the app, choose Data feed → Custom XAUUSD endpoint and set:
`https://xauusd-market-feed.<your-workers-subdomain>.workers.dev/?tf={tf}&limit={limit}`

Leave optional headers blank and press Save and load.

Security: never share the API token in ChatGPT, screenshots, or public repository files. If exposed, revoke it and create a new one.
