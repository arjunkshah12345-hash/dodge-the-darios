# Dodge the Darios

A webcam game where your face is the controller. Dario Amodeis fly at you; move your head to dodge them.

**▶ Play: https://arjunkshah12345-hash.github.io/dodge-the-darios/**

- **Move your head** to dodge. Red-tinted Darios home in on you.
- **Open your mouth wide** to fire a scaling-law shockwave that vaporizes nearby Darios.
- **Grab ✳** for a 6s constitutional shield, **❚❚** for slow-mo.
- **Close calls** and kills build a combo multiplier (up to x8).
- **Mega Dario** shows up every ~45s. It takes 3 blasts and splits when it dies.
- Every hit makes *you* look more like Dario: glasses, then the curls, then the headset mic.
- **Global leaderboard**: enter your name after a run to post your score to the world top 10.

No webcam? It falls back to mouse + spacebar.

## How it works

One `index.html`, no build step. Face tracking is [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) running fully in the browser. The webcam feed never leaves your machine. The face bounding box drives the hitbox, the `jawOpen` blendshape fires the blast, and eye/forehead landmarks place the Dario-fication overlay. Sound effects are synthesized with WebAudio.

The MediaPipe bundle, WASM and model are vendored in `vendor/` so the game loads fast without CDN round-trips.

## Leaderboard backend

`leaderboard/` is a Cloudflare Worker with a D1 (SQLite) database. `GET /scores` returns the top 10 (best score per name); `POST /scores` takes `{name, score, seconds, kills}`.

Names are sanitized, scores are checked against run length, and each IP is limited to 5 submissions a minute (IPs are stored only as salted hashes). Scores are reported by the browser, so a determined cheater can still fake one. It's a fun board, not an esports ladder.

```sh
cd leaderboard
npx wrangler d1 execute dodge-the-darios --remote --file schema.sql   # first time only
npx wrangler deploy
```

## Run locally

Camera access needs `localhost` or HTTPS:

```sh
python3 -m http.server 8787
# open http://localhost:8787
```

Append `#debug` to the URL to get `window.__dario` (`boss()`, `power()`, `hit(n)`, `state()`).

## Credits

- Dario Amodei photo: [TechCrunch](https://www.flickr.com/photos/techcrunch/53202070940/), TechCrunch Disrupt 2023, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0), cropped and tinted.
- [MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe) (Apache 2.0), vendored in `vendor/`.
- Fan-made parody. Not affiliated with or endorsed by Anthropic or Dario Amodei.

Game code: MIT.
