# Geração de áudio narrado (pipeline)

Pré-requisitos (uma vez):
1. Criar bucket no Cloudflare R2 (ex. `biblecomment-audio`).
2. Criar R2 API Token (S3) → Account ID, Access Key ID, Secret Access Key.
3. Tornar o bucket público (r2.dev ou domínio custom) para o app servir os MP3.
4. **Python 3 + `edge-tts`** (a síntese usa o pacote Python mantido `edge-tts`,
   pois o endpoint grátis da Microsoft exige um handshake `Sec-MS-GEC` rotativo
   que as libs Node desatualizadas não satisfazem):
   `pip install edge-tts` (testado com `edge-tts 7.2.8`, Python 3.13).
   Em Windows, o `npm` pode resolver `python` para o atalho da Microsoft Store;
   nesse caso aponte `PYTHON_BIN` para o executável real (ver abaixo).

Variáveis de ambiente (podem ir no `nextjs/.env` — o `gen:audio` carrega via
`--env-file-if-exists=.env`):
- `AUDIO_GEN_BASE_URL` — origem que serve **`/api/books`**, ou seja o **app**
  (ex. `https://biblecomment.com.br` em produção, ou `http://localhost:3000` com
  o dev server rodando). **Não** é o endpoint do R2.
- `AUDIO_VOICE_ID` (default `pt-BR-AntonioNeural`), `AUDIO_VOICE_LABEL` (default `Antonio`)
- `AUDIO_GAP_MS` (default `250`) — pausa entre versículos
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — as
  credenciais **S3** do R2 (Access Key ID + Secret, geradas em "Manage R2 API
  Tokens"). O token `cfat_…` da API geral da Cloudflare **não** é usado aqui.
- `PYTHON_BIN` (opcional, default `python`) — caminho do interpretador Python
  que tem o `edge-tts`. Em Windows com pyenv, algo como
  `C:\Users\<voce>\.pyenv\pyenv-win\versions\3.13.5\python.exe`.

Rodar:
- Smoke (1 capítulo): `npm run gen:audio -- --book=gn --limit=1`
- Um livro: `npm run gen:audio -- --book=gn`
- Tudo: `npm run gen:audio`

É resumível: pula capítulos já no `manifest.json` da mesma `version`. O manifest
é regravado após cada capítulo.

## Player: config no app

O player no app lê os assets direto do R2 público:
- `NEXT_PUBLIC_AUDIO_BASE_URL` — domínio público do bucket (ex. `https://pub-xxxx.r2.dev`
  ou domínio custom). **Sem ela o botão "Ouvir" não aparece.** Exige o bucket R2
  **público** (R2 → Settings → Public access / r2.dev, ou um domínio custom).
- `NEXT_PUBLIC_AUDIO_VOICE_ID` — voz default (default `pt-BR-AntonioNeural`).

O app busca `${NEXT_PUBLIC_AUDIO_BASE_URL}/audio/{voiceId}/manifest.json` uma vez e
mostra "Ouvir" só nos capítulos presentes no manifest. CORS: garantir que o bucket
público sirva os assets para a origem do app (R2 r2.dev já serve com CORS aberto;
domínio custom → configurar CORS allow-origin).
