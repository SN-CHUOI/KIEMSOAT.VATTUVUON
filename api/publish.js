// Vercel serverless function: nhan du lieu 1 xi nghiep da parse san tren trinh duyet,
// ghi/de vao data.js trong repo GitHub theo dung "label" (ten xi nghiep) - cap nhat lai
// thi tu dong de len ban cu cung ten, khong tao ban moi.

const OWNER = 'SN-CHUOI';
const REPO = 'KIEMSOAT.VATTUVUON';
const FILE_PATH = 'data.js';
const BRANCH = 'main';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'Thieu GITHUB_TOKEN tren server' });
    return;
  }

  try {
    const { label, source } = req.body || {};
    if (!label || !source) {
      res.status(400).json({ error: 'Thieu label hoac source trong request' });
      return;
    }

    const ghHeaders = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    };

    // 1) Doc data.js hien tai (neu co) de biet sha + noi dung cu
    const getUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const getResp = await fetch(getUrl, { headers: ghHeaders });

    let sources = [];
    let sha;
    if (getResp.status === 200) {
      const getJson = await getResp.json();
      sha = getJson.sha;
      const raw = Buffer.from(getJson.content, 'base64').toString('utf-8');
      const match = raw.match(/const DASHBOARD_DATA_SOURCES\s*=\s*(\[[\s\S]*\]);?\s*$/);
      if (match) {
        try { sources = JSON.parse(match[1]); } catch { sources = []; }
      }
    } else if (getResp.status !== 404) {
      const t = await getResp.text();
      res.status(502).json({ error: `Loi doc data.js tu GitHub: ${getResp.status} ${t}` });
      return;
    }

    // 2) Thay the / them moi dung "label" (khong phan biet hoa thuong, bo khoang trang thua)
    const norm = s => String(s).trim().toLowerCase();
    const idx = sources.findIndex(s => norm(s.label) === norm(label));
    const entry = { label, generatedAt: new Date().toISOString(), ...source };
    if (idx >= 0) sources[idx] = entry; else sources.push(entry);

    // 3) Ghi lai data.js
    const newContent = `const DASHBOARD_DATA_SOURCES = ${JSON.stringify(sources)};\n`;
    const putUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const putResp = await fetch(putUrl, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Cap nhat du lieu qua cong cu web: ${label}`,
        content: Buffer.from(newContent, 'utf-8').toString('base64'),
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      }),
    });

    if (!putResp.ok) {
      const t = await putResp.text();
      res.status(502).json({ error: `Loi ghi data.js len GitHub: ${putResp.status} ${t}` });
      return;
    }

    res.status(200).json({ ok: true, label, totalSources: sources.length });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
