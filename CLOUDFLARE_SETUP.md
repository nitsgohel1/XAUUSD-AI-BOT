# Connect the XAUUSD AI Bot to a read-only candle feed

This repository includes a Cloudflare Worker that proxies Yahoo Finance candle data so the GitHub Pages app can request it without browser CORS failures.

## Important market-data limitation

The free source in this setup is Yahoo Finance **GC=F (COMEX gold futures)**. It is a gold-market reference, **not the exact Octa XAUUSD spot/CFD quote**. Futures and broker spot prices can differ. Provider timing/delay is not guaranteed. Do not use it to execute trades or treat its levels as exact Octa entries.

## 1. Deploy the Worker (Android / Chrome)

1. Open https://dash.cloudflare.com/ and sign in or create a free account.
2. In the Cloudflare dashboard, open **Workers & Pages**.
3. Choose **Create application** → **Create Worker**.
4. Give it a name such as `xauusd-market-feed`, then deploy the starter Worker.
5. Open **Edit code** for that Worker.
6. Replace all starter code with the complete contents of `cloudflare/worker.js` in this repository:
   https://github.com/nitsgohel1/XAUUSD-AI-BOT/blob/main/cloudflare/worker.js
7. Save and deploy. Cloudflare will show a URL similar to `https://xauusd-market-feed.<your-subdomain>.workers.dev`.

No API key or broker login is needed for this read-only public data proxy. Do not add broker passwords or trading keys.

## 2. Test the Worker

Open this URL in Chrome, replacing it with your actual Worker URL:

```
https://YOUR-WORKER.workers.dev/?tf=15m&limit=300
```

A successful response is JSON with a `candles` array. Each candle is:
`[unix_time_seconds, open, high, low, close, volume]`.

You can also test `tf=5m`, `tf=1h`, and `tf=4h`.

## 3. Connect it to the app

1. Open https://nitsgohel1.github.io/XAUUSD-AI-BOT/
2. Scroll to **Data feed** → expand **Custom XAUUSD endpoint**.
3. In URL template, enter:
   `https://YOUR-WORKER.workers.dev/?tf={tf}&limit={limit}`
4. In Symbol label, enter: `GC=F gold futures reference`.
5. Leave optional header name and value blank.
6. Tap **Save and load**.
7. Check **Data source**. It should show the custom feed and candle count if the Worker returned enough data.

The app requests fresh candles every 30 seconds while the page is visible. The Worker caches upstream responses for up to 15 seconds.

## Troubleshooting

- If the Worker returns a JSON error, open that URL in Chrome and read the `error` field.
- If Cloudflare shows a deployment error, check that the Worker editor contains the full file and that it was deployed.
- If the app still says NO DATA, check **Data source → Feed errors** and compare the Worker URL test.
- A successful feed does not mean Octa prices match exactly. Compare the displayed GC=F value with your broker before interpreting any signal.
