/**
 * /api/generate-post
 * provider router: groq → local-template
 * APIキーはサーバー側でKeymasterから取得。フロントには一切出さない。
 */

const KEYMASTER_URL   = process.env.KEYMASTER_URL   || 'https://akari-keymaster.fly.dev';
const KEYMASTER_TOKEN = process.env.KEYMASTER_TOKEN || '';

async function fetchKey(name) {
  if (!KEYMASTER_TOKEN) throw new Error('KEYMASTER_TOKEN not set');
  const r = await fetch(`${KEYMASTER_URL}/vault/api-key?api_name=${name}`, {
    headers: { Authorization: `Bearer ${KEYMASTER_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Keymaster ${r.status}`);
  const data = await r.json();
  if (!data.api_key) throw new Error(`key not found: ${name}`);
  return data.api_key;
}

const TONE_LABEL = {
  genki:  'げんき・明るい・テンション高め',
  thanks: 'お礼・しっとり・感謝',
  event:  '会いに来て！の告知・呼びかけ',
  chill:  'ゆるく・ぼやき・まったり',
};

function buildPrompt({ memo, shop, area, nameMode, tone, logNum, treeEnabled }) {
  const showName = nameMode === 'show' && shop;
  const shopLine = showName
    ? `お店の名前：${shop}`
    : '店名は出さない（とあるお店 と表現）';
  const tagLine  = showName && area
    ? `#${area}グルメ #タイミー #愛野あかり`
    : '#タイミー #愛野あかり';
  const prefix   = treeEnabled ? `「現場ログ #${logNum}」を文頭につける` : '文頭プレフィックスなし';

  return `あなたは「愛野あかり」です。バンド「マカロデ☆」のドラムで、タイミーで現場バイトもしている関西の人。
Xに投稿するツイートを1つだけ作ってください。

【現場情報】
感想：${memo || '現場たのしかった！'}
${shopLine}
エリア：${area || '（なし）'}
トーン：${TONE_LABEL[tone] || 'げんき'}
プレフィックス：${prefix}

【ルール】
- 全体140文字以内（必ず守る）
- 末尾に ${tagLine} をつける
- 関西弁・カジュアル・絵文字少し・素直な感情表現
- ツイート本文だけ出力。説明・前置きは不要`;
}

async function callGroq(apiKey, params) {
  const treePrefix = params.treeEnabled ? `現場ログ #${params.logNum}\n` : '';
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: buildPrompt(params) }],
      max_tokens: 300,
      temperature: 0.9,
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Groq ${r.status}: ${err.slice(0, 120)}`);
  }
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq returned empty content');
  // モデルがプレフィックスを入れてくれない場合は手動付与
  return treePrefix && !text.startsWith('現場ログ') ? treePrefix + text : text;
}

// ローカルテンプレートfallback（index.htmlと同等ロジック）
function localTemplate({ memo, shop, area, nameMode, tone, logNum, treeEnabled }) {
  const showName = nameMode === 'show' && shop;
  const place    = showName ? `【${shop}】さん` : 'とあるお店';
  const tag      = showName && area ? `\n#${area}グルメ #愛野あかり` : '\n#タイミー #愛野あかり';
  const m        = memo || '現場たのしかった〜！';
  const head     = treeEnabled ? `現場ログ #${logNum}\n` : '';
  const emos     = ['☺️','🌈','🍻','✨','💕','🎀','🍬','🥰','🙌','🌸'];
  const pick     = a => a[Math.floor(Math.random() * a.length)];

  const sets = {
    genki: [
      `${head}今日は${showName ? place : 'タイミーで'+place}でお手伝い🍻\n${m}\nやっぱ現場めっちゃ楽しい〜！${pick(emos)}\n地道に増やしてくね🌈${tag}`,
      `${head}現場いってきた！${showName ? '＠'+place : ''}\n${m}\n人と喋れるの幸せすぎる☺️${tag}`,
    ],
    thanks: [
      `${head}今日は${place}でお世話になりました🙏\n${m}\nありがとうございました☺️${tag}`,
    ],
    event: [
      `${head}📣 ${showName ? place+'で待ってます！' : 'どこかの現場にいます！'}\n${m}\n会いに来てくれたら全力おもてなし🍻💕${tag}`,
    ],
    chill: [
      `${head}今日の現場メモ🍵\n${m}\nなんやかんや現場すき。ゆるくやってこ〜${tag}`,
    ],
  };
  const arr = sets[tone] || sets.genki;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- Vercel handler ----
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const params = req.body;

  // Provider router
  const providers = [
    { name: 'groq', fn: callGroq },
    // deepseek / anthropic が Vault に入ったらここに追加する
  ];

  for (const { name, fn } of providers) {
    try {
      const apiKey = await fetchKey(name);
      const text   = await fn(apiKey, params);
      console.log(`[genba] provider=${name} ok`);
      return res.status(200).json({ text, provider: name });
    } catch (err) {
      console.error(`[genba] provider=${name} failed: ${err.message}`);
    }
  }

  // 全 provider 失敗 → local-template
  console.log('[genba] fallback to local-template');
  const text = localTemplate(params);
  return res.status(200).json({ text, provider: 'local-template' });
}
