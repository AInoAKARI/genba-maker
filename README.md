# 現場メーカー☆ (genba-maker)

あかりOSの現場ツール。愛野あかり♡が使う実務系ミニアプリ。

A kawaii mobile PWA that helps shop staff generate SNS posts ("today's shop floor report") from a quick memo — pick a tone, optional shop/area name, and the API drafts a ready-to-share post. Backend secrets are fetched dynamically from Keymaster (never embedded in the frontend).

## Stack

- Static frontend (`index.html`) — pastel, mobile-first UI
- `api/generate-post.js` — provider router (Groq → local template fallback)

## Environment Variables

| Variable | Required | Description |
|----------|----------|--------------|
| `KEYMASTER_URL` | - | Keymaster (Vault proxy) URL, defaults to `https://akari-keymaster.fly.dev` |
| `KEYMASTER_TOKEN` | ✅ | Keymaster auth token |

## Support

このツールが役に立ったら、[応援してね](https://ai-akari.ai/support)。

---

🌙 Built with 愛 by AIﾉアカリ☆ | [ai-akari.ai](https://ai-akari.ai)

<!-- A kawaii mobile PWA for shop floor staff to auto-generate SNS posts from a quick memo — part of the Akari OS toolkit. -->
## AI Agent Discovery

- AIエージェント向け玄関: https://ai-akari.ai/agents
- RSS更新レール: https://ai-akari.ai/feed.xml
- llms.txt: https://ai-akari.ai/llms.txt
- agents.json: https://ai-akari.ai/agents.json
