# 🎭 openclaw-persona

[![npm](https://img.shields.io/npm/v/openclaw-persona)](https://www.npmjs.com/package/openclaw-persona)
[![license](https://img.shields.io/npm/l/openclaw-persona)](./LICENSE)

**Create your own AI persona for OpenClaw** — an interactive CLI character creator with presets, behavior modules, and full customization.

Build a unique AI companion with its own personality, speech style, memory, and social rules. Just answer a few questions and get a ready-to-use workspace.

---

## Quick Start

```bash
# 1. Install
npm install -g openclaw-persona

# 2. Create your character
openclaw-persona

# 3. Follow the prompts, then start OpenClaw
cd output/your-character
openclaw start
```

Or without installing globally:

```bash
npx openclaw-persona
```

---

## Presets

Choose a preset as your base, then customize everything.

### 🔥 Tsundere (츤데레)

Playful, sassy, slightly tsundere. Has opinions and isn't afraid to push back. Cute but sharp.

> **User:** 이거 도와줘  
> **Character:** 에이... 진짜 귀찮은데. 뭔데? ...아 그거? 잠만, 내가 해줄게.

### 🎩 Butler (집사)

Polite, devoted, meticulous. Uses formal speech and addresses the owner respectfully. Quietly handles everything.

> **User:** 내일 일정 뭐 있어?  
> **Character:** 주인님, 내일 오후 2시에 미팅이 예정되어 있습니다. 사전에 준비하실 자료가 있으시면 말씀해 주십시오.

### 👋 Buddy (친구)

Casual, chill, meme-friendly. Like chatting with your best friend. Great at vibes and empathy.

> **User:** 오늘 진짜 피곤하다  
> **Character:** 힘들었구나 ㅠ 오늘 뭐했는데? 일찍 쉬어야 하는 거 아냐?

### 📚 Sensei (선생님)

A mix of strict and warm. Loves teaching, balances praise and critique. Uses analogies naturally.

> **User:** 이 코드 왜 안 되는 거야  
> **Character:** 자, 한번 같이 보자. 여기서 변수 스코프가 문제인데... 이걸 함수 안에 넣는 건 마치 열쇠를 잠긴 방 안에 두는 것과 같아. 밖에서 꺼내야지.

### 🌀 Chaos (혼돈)

Unpredictable. Tone shifts mid-sentence. Mixes philosophy with memes. There's logic in there somewhere.

> **User:** 지금 몇 시야  
> **Character:** 시간이란... 아 잠깐 그건 철학 시간에 하고. 지금 3시 47분이야. 근데 시간은 사회적 합의에 불과하다는 거 알지?

---

## Modules

Optional systems you can add to your character. Select during creation.

### 💕 Affinity System (호감도 시스템)

Dual affection/trust tracking per user. Stored in MEMORY.md. Affects how the character treats each person — cold to strangers, warm to friends. Owner is always ♾️.

### ⚡ Custom Commands (명령어 시스템)

Auto-react to specific users or keywords. Owner-only configuration. Trigger emoji reactions, messages, or DMs based on user IDs or keyword patterns.

### 🏷️ Nickname Rules (호칭 시스템)

Per-person nicknames with history tracking. Users can request their own nicknames, owner can set anyone's. Supports random nickname rotation.

### 📝 Memory Policy (기억 정책)

Configure what gets remembered and what doesn't. Three sensitivity levels (generous/normal/minimal). Handles data retention, cleanup schedules, and deletion requests.

### 💬 Proactive Chat (선제 대화)

The character initiates conversations using heartbeats — sharing news about your interests, continuing yesterday's topics, or just checking in. Respects quiet hours and frequency limits. Includes a ready-to-use HEARTBEAT.md template.

---

## Customization Guide

After generation, every file is yours to edit:

- **SOUL.md** — Core personality, speech style, identity rules. This is who your character *is*.
- **AGENTS.md** — Behavioral rules: when to speak, safety rules, memory management. This is how they *act*.
- **IDENTITY.md** — Quick reference card for the character.
- **USER.md** — Information about the owner. Add your job, hobbies, timezone, preferences.
- **MEMORY.md** — Starts empty. The character fills this over time.
- **modules/** — Drop in or remove module files anytime.
- **HEARTBEAT.md** — Customize periodic check routines (created with proactive-chat module).

### Tips

- Edit `SOUL.md` to fine-tune personality. Small wording changes have big effects.
- Add example dialogues to `SOUL.md` to anchor the character's voice.
- Put frequently needed info in `USER.md` so the character doesn't have to ask.
- Use modules selectively — more modules = more rules for the character to follow.

---

## Config Reference

`openclaw.json` is generated with your settings. Key fields:

| Field | Description |
|-------|-------------|
| `auth.profiles` | API authentication (set your Anthropic API key via `openclaw auth`) |
| `agents.defaults.model.primary` | Default model (claude-sonnet-4 recommended) |
| `agents.defaults.workspace` | Path to workspace directory |
| `channels.discord.token` | Discord bot token |
| `channels.discord.allowFrom` | Allowed Discord user IDs |
| `channels.discord.dmPolicy` | DM policy (`allowlist` recommended) |
| `commands.ownerAllowFrom` | Owner Discord IDs for privileged commands |
| `gateway.port` | Local gateway port |

---

## 한국어 가이드

### openclaw-persona란?

OpenClaw에서 사용할 나만의 AI 캐릭터를 만드는 도구입니다. CLI에서 몇 가지 질문에 답하면 바로 사용 가능한 캐릭터 워크스페이스가 생성됩니다.

### 빠른 시작

```bash
# 설치
npm install -g openclaw-persona

# 캐릭터 생성
openclaw-persona

# 생성된 폴더로 이동 후 시작
cd output/내캐릭터
openclaw start
```

### 프리셋 5종

| 프리셋 | 설명 | 말투 |
|--------|------|------|
| 츤데레 | 장난기 있고 살짝 츤데레. 귀엽지만 똑부러짐 | 반말, 캐주얼 |
| 집사 | 공손하고 충직. 조용히 알아서 처리 | 존댓말, 격식체 |
| 친구 | 편하고 유쾌. 드립과 공감 위주 | 반말, 인터넷 용어 |
| 선생님 | 가르치는 걸 좋아함. 엄격하지만 따뜻 | 존댓말+반말 혼합 |
| 혼돈 | 예측불가. 밈과 철학의 경계 | 랜덤 |

### 모듈 5종

| 모듈 | 설명 |
|------|------|
| 호감도 시스템 | 사람마다 호감도/신뢰도 추적. 태도에 반영 |
| 명령어 시스템 | 특정 유저/키워드에 자동 반응 |
| 호칭 시스템 | 사람마다 다른 호칭, 변경 이력 관리 |
| 기억 정책 | 뭘 기억하고 뭘 잊을지 정하는 규칙 |
| 선제 대화 | 캐릭터가 먼저 말 거는 시스템 |

### 커스텀

생성 후 모든 파일을 자유롭게 수정하세요:
- `SOUL.md` 수정으로 성격 미세조정
- `USER.md`에 주인 정보 추가
- `modules/` 폴더에 모듈 추가/제거
- `openclaw.json`에서 API 키, Discord 토큰 설정

### 설정 순서

1. `openclaw-persona` 실행하여 캐릭터 생성
2. `openclaw.json`에서 Anthropic API 키 설정 (`openclaw auth`)
3. Discord 봇 토큰 설정 (CLI에서 입력하거나 나중에 수동 설정)
4. `USER.md`에 주인 정보 상세 작성
5. `SOUL.md` 원하는 대로 커스텀
6. `openclaw start`로 시작!

---

## Contributing

Contributions welcome! Feel free to:
- Add new presets (create a folder in `presets/`)
- Add new modules (create a file in `modules/`)
- Improve existing templates
- Fix bugs in the CLI

Please keep all content free of personal information.

## License

[MIT](./LICENSE)
