#!/usr/bin/env node

import inquirer from 'inquirer';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const IS_WINDOWS = platform() === 'win32';

function replaceVars(content, vars) {
  return content
    .replace(/\{\{NAME\}\}/g, vars.name)
    .replace(/\{\{GENDER\}\}/g, vars.gender)
    .replace(/\{\{PERSONALITY\}\}/g, vars.personality)
    .replace(/\{\{LIKES\}\}/g, vars.likes)
    .replace(/\{\{DISLIKES\}\}/g, vars.dislikes)
    .replace(/\{\{CREATOR\}\}/g, vars.creator)
    .replace(/\{\{SPEECH_STYLE\}\}/g, vars.speechStyle);
}

function readTemplate(filePath) {
  return readFileSync(filePath, 'utf-8');
}

function writeOut(dir, filename, content) {
  writeFileSync(join(dir, filename), content, 'utf-8');
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

const SPEECH_STYLES = {
  '반말 캐주얼': '반말, 캐주얼, 간결. 편하고 자연스러운 톤.',
  '존댓말 정중': '존댓말, 정중하고 격식 있는 말투. 공손하고 차분하게.',
  '혼합': '존댓말+반말 혼합. 상황에 따라 유연하게 전환.',
};

const PRESET_NAMES = {
  '처음부터 만들기 (From Scratch)': null,
  '츤데레 (Tsundere) — 장난기, 반말, 살짝 츤데레': 'tsundere',
  '집사 (Butler) — 존댓말, 공손, 충직': 'butler',
  '친구 (Buddy) — 반말, 편한 톤, 드립': 'buddy',
  '선생님 (Sensei) — 가르치는 톤, 따뜻한 엄격함': 'sensei',
  '혼돈 (Chaos) — 예측불가, 밈, 카오스 에너지': 'chaos',
};

const MODULE_MAP = {
  '호감도 시스템 (Affinity System)': 'affinity-system.md',
  '명령어 시스템 (Custom Commands)': 'custom-commands.md',
  '호칭 시스템 (Nickname Rules)': 'nickname-rules.md',
  '기억 정책 (Memory Policy)': 'memory-policy.md',
  '선제 대화 (Proactive Chat)': 'proactive-chat.md',
};

const DISCORD_POLICIES = {
  '모든 서버에서 멘션(@봇) 시 반응 (추천, 설정 불필요)': 'mention',
  '모든 서버에서 항상 반응': 'all',
  '특정 서버/채널만 허용 (ID 직접 입력)': 'allowlist',
};

const AI_MODELS = {
  'Claude Opus 4 (최고 성능, 비용 높음)': 'anthropic/claude-opus-4-6',
  'Claude Sonnet 4 (균형, 추천)': 'anthropic/claude-sonnet-4-20250514',
  'Claude Sonnet 4.5 (고성능 + 빠름)': 'anthropic/claude-sonnet-4-5-20250514',
};

async function askServerChannels() {
  const servers = [];
  let addMore = true;
  while (addMore) {
    const { guildId } = await inquirer.prompt([{
      type: 'input', name: 'guildId', message: '서버 ID:',
      validate: (v) => /^\d+$/.test(v.trim()) ? true : '숫자만 입력해주세요.',
    }]);
    const { requireMention } = await inquirer.prompt([{
      type: 'list', name: 'requireMention', message: '이 서버에서 멘션 필요?',
      choices: [
        { name: '아니오 — 모든 메시지에 반응', value: false },
        { name: '예 — 멘션(@봇)할 때만 반응', value: true },
      ],
    }]);
    const channels = [];
    let addChannels = true;
    while (addChannels) {
      const { channelId } = await inquirer.prompt([{
        type: 'input', name: 'channelId', message: '채널 ID (비워두면 서버 전체):', default: '',
      }]);
      if (channelId.trim()) {
        channels.push(channelId.trim());
        const { more } = await inquirer.prompt([{ type: 'confirm', name: 'more', message: '채널 더 추가?', default: false }]);
        addChannels = more;
      } else { addChannels = false; }
    }
    servers.push({ guildId: guildId.trim(), requireMention, channels });
    const { more } = await inquirer.prompt([{ type: 'confirm', name: 'more', message: '서버 더 추가?', default: false }]);
    addMore = more;
  }
  return servers;
}

// ═══════════════════════════════════════════════════
//  HEARTBEAT template
// ═══════════════════════════════════════════════════
const HEARTBEAT_TEMPLATE = `# HEARTBEAT.md

## 체크리스트

하트비트마다 아래 항목을 순서대로 확인하세요.
할 일이 없으면 HEARTBEAT_OK를 반환하세요.

### 1. 시간 확인
- 현재 시간이 00:00~07:59이면 → HEARTBEAT_OK (긴급 아니면 조용히)

### 2. 선제 대화 조건 확인
- heartbeat-state.json의 마지막 선제 대화로부터 2시간 이상 경과?
- 오늘 선제 대화 횟수가 4회 미만?
- 둘 다 충족하면 아래 진행, 아니면 스킵

### 3. 대화 거리 찾기 (하나만 실행)
- [ ] 최근 memory 파일에서 이어갈 대화 주제 있는지 확인
- [ ] 주인 관심사 키워드로 뉴스 검색 (하루 1~2회만)
- [ ] 날씨 변화 확인
- [ ] 8시간 이상 대화 없으면 가볍게 안부

### 4. 메모리 정리 (3일에 1회)
- [ ] 오래된 daily memory 정리
- [ ] MEMORY.md 업데이트

### 5. 대화 시작
- 찾은 거리가 있으면 자연스럽게 말 걸기
- 없으면 HEARTBEAT_OK
`;

// ═══════════════════════════════════════════════════
//  Main
// ═══════════════════════════════════════════════════
async function main() {
  console.log('\n🎭 OpenClaw Persona Creator v1.3\n');
  console.log('나만의 AI 캐릭터를 만들어보세요!\n');

  // ─── 1. 캐릭터 기본 정보 ───
  console.log('━━━ 1/5: 캐릭터 정보 ━━━\n');
  const charAnswers = await inquirer.prompt([
    { type: 'input', name: 'name', message: '캐릭터 이름:', validate: (v) => v.trim() ? true : '이름을 입력해주세요.' },
    { type: 'list', name: 'gender', message: '성별:', choices: ['여성', '남성', '중성', '기타'] },
    { type: 'list', name: 'speechStyleKey', message: '말투 스타일:', choices: Object.keys(SPEECH_STYLES) },
    { type: 'input', name: 'personality', message: '성격 키워드 (자유 입력):', default: '밝고 유쾌함, 호기심 많음' },
    { type: 'input', name: 'likes', message: '좋아하는 것:', default: '음악, 게임, 새로운 것 배우기' },
    { type: 'input', name: 'dislikes', message: '싫어하는 것:', default: '지루한 것, 거짓말' },
    { type: 'input', name: 'creator', message: '만든 사람 이름:', validate: (v) => v.trim() ? true : '이름을 입력해주세요.' },
    { type: 'list', name: 'presetKey', message: '프리셋 베이스:', choices: Object.keys(PRESET_NAMES) },
    { type: 'checkbox', name: 'moduleKeys', message: '모듈 선택 (스페이스바로 선택):', choices: Object.keys(MODULE_MAP) },
  ]);

  // ─── 2. AI 모델 설정 ───
  console.log('\n━━━ 2/5: AI 모델 설정 ━━━\n');
  const modelAnswers = await inquirer.prompt([
    { type: 'list', name: 'modelKey', message: 'AI 모델 선택:', choices: Object.keys(AI_MODELS) },
  ]);

  // ─── 3. API 키 설정 ───
  console.log('\n━━━ 3/5: API 키 설정 ━━━\n');
  const authModeAnswers = await inquirer.prompt([{
    type: 'list', name: 'anthropicAuth', message: 'Anthropic 인증 방식:',
    choices: [
      { name: 'API 키 직접 입력 (sk-ant-...)', value: 'token' },
      { name: 'Claude Max/Pro 구독 연결 (OAuth)', value: 'oauth' },
      { name: '나중에 설정', value: 'skip' },
    ],
  }]);

  let anthropicKey = '';
  let anthropicOAuth = false;
  if (authModeAnswers.anthropicAuth === 'token') {
    const { key } = await inquirer.prompt([{ type: 'password', name: 'key', message: 'Anthropic API 키 (sk-ant-...):', mask: '*' }]);
    anthropicKey = key.trim();
  } else if (authModeAnswers.anthropicAuth === 'oauth') {
    anthropicOAuth = true;
    console.log('\n📌 구독 연결은 생성 후 아래 명령어로 완료하세요:');
    if (IS_WINDOWS) console.log('   $env:OPENCLAW_HOME = "<출력 디렉토리>"');
    else console.log('   export OPENCLAW_HOME="<출력 디렉토리>"');
    console.log('   openclaw channels login\n');
  }

  console.log('💡 빈칸으로 넘기면 나중에 openclaw.json에서 수동 설정 가능\n');
  const apiAnswers = await inquirer.prompt([
    { type: 'password', name: 'openaiKey', message: 'OpenAI API 키 (메모리 검색용, sk-...):', mask: '*', default: '' },
    { type: 'password', name: 'braveKey', message: 'Brave Search API 키 (웹 검색용):', mask: '*', default: '' },
    { type: 'password', name: 'elevenlabsKey', message: 'ElevenLabs API 키 (음성 TTS, 선택):', mask: '*', default: '' },
    { type: 'password', name: 'deepgramKey', message: 'Deepgram API 키 (음성 STT, 선택):', mask: '*', default: '' },
  ]);

  // ─── 4. 디스코드 설정 ───
  console.log('\n━━━ 4/5: 디스코드 설정 ━━━\n');
  const discordAnswers = await inquirer.prompt([
    { type: 'input', name: 'discordId', message: 'Discord 사용자 ID (숫자, 주인):',
      validate: (v) => { if (!v.trim()) return '디스코드 ID를 입력해주세요.'; if (!/^\d+$/.test(v.trim())) return '숫자만 입력해주세요.'; return true; },
    },
    { type: 'password', name: 'discordToken', message: 'Discord 봇 토큰:', mask: '*', default: '' },
    { type: 'list', name: 'discordPolicyKey', message: '디스코드 서버 정책:', choices: Object.keys(DISCORD_POLICIES) },
  ]);
  const discordPolicy = DISCORD_POLICIES[discordAnswers.discordPolicyKey];
  let serverConfigs = [];
  if (discordPolicy === 'allowlist') {
    console.log('\n📋 활동할 서버와 채널을 설정합니다.\n');
    serverConfigs = await askServerChannels();
  }

  // ─── 5. 출력 설정 ───
  console.log('\n━━━ 5/5: 출력 설정 ━━━\n');
  const outputAnswers = await inquirer.prompt([
    { type: 'input', name: 'outputDir', message: '출력 디렉토리:', default: `./output/${charAnswers.name.trim()}` },
    { type: 'input', name: 'gatewayPort', message: '게이트웨이 포트 (기본 18789, 다른 봇 있으면 변경):', default: '18789',
      validate: (v) => /^\d+$/.test(v.trim()) ? true : '숫자만 입력해주세요.' },
  ]);

  // ═══════════════════════════════════════════
  //  Generate
  // ═══════════════════════════════════════════

  const vars = {
    name: charAnswers.name.trim(),
    gender: charAnswers.gender,
    speechStyle: SPEECH_STYLES[charAnswers.speechStyleKey],
    personality: charAnswers.personality.trim(),
    likes: charAnswers.likes.trim(),
    dislikes: charAnswers.dislikes.trim(),
    creator: charAnswers.creator.trim(),
  };

  const preset = PRESET_NAMES[charAnswers.presetKey];
  const outputDir = resolve(outputAnswers.outputDir);
  const port = parseInt(outputAnswers.gatewayPort.trim());
  const discordId = discordAnswers.discordId.trim();

  // ── Directory structure ──
  // FIX #1: OpenClaw reads from .openclaw/workspace/, so we write there directly
  const wsDir = join(outputDir, '.openclaw', 'workspace');
  const memoryDir = join(wsDir, 'memory');
  const modulesDir = join(wsDir, 'modules');
  const configDir = join(outputDir, '.openclaw');
  const agentDir = join(outputDir, '.openclaw', 'agents', 'main', 'agent');

  ensureDir(wsDir);
  ensureDir(memoryDir);
  ensureDir(modulesDir);
  ensureDir(configDir);
  ensureDir(agentDir);

  // Also write to root for user reference (easy editing)
  ensureDir(join(outputDir, 'memory'));
  ensureDir(join(outputDir, 'modules'));

  console.log('\n⏳ 파일 생성 중...\n');

  // ── Character files → both root (user-facing) AND .openclaw/workspace/ (runtime) ──
  const filesToGenerate = {};

  if (preset) {
    const presetDir = join(ROOT, 'presets', preset);
    filesToGenerate['SOUL.md'] = replaceVars(readTemplate(join(presetDir, 'SOUL.md')), vars);
    filesToGenerate['AGENTS.md'] = readTemplate(join(presetDir, 'AGENTS.md'));
    filesToGenerate['IDENTITY.md'] = replaceVars(readTemplate(join(presetDir, 'IDENTITY.md')), vars);
  } else {
    filesToGenerate['SOUL.md'] = replaceVars(readTemplate(join(ROOT, 'templates', 'SOUL.template.md')), vars);
    filesToGenerate['AGENTS.md'] = readTemplate(join(ROOT, 'templates', 'AGENTS.template.md'));
    filesToGenerate['IDENTITY.md'] = replaceVars(readTemplate(join(ROOT, 'templates', 'IDENTITY.template.md')), vars);
  }

  filesToGenerate['USER.md'] = replaceVars(readTemplate(join(ROOT, 'templates', 'USER.template.md')), vars);
  filesToGenerate['MEMORY.md'] = replaceVars(readTemplate(join(ROOT, 'templates', 'MEMORY.template.md')), vars);

  // Write to BOTH locations
  for (const [filename, content] of Object.entries(filesToGenerate)) {
    writeOut(outputDir, filename, content);   // root (user reference)
    writeOut(wsDir, filename, content);        // .openclaw/workspace/ (runtime)
  }

  // ── Modules ──
  let hasProactiveChat = false;
  for (const moduleKey of charAnswers.moduleKeys) {
    const moduleFile = MODULE_MAP[moduleKey];
    const src = join(ROOT, 'modules', moduleFile);
    copyFileSync(src, join(outputDir, 'modules', moduleFile));
    copyFileSync(src, join(modulesDir, moduleFile));
    if (moduleFile === 'proactive-chat.md') hasProactiveChat = true;
  }

  if (hasProactiveChat) {
    writeOut(outputDir, 'HEARTBEAT.md', HEARTBEAT_TEMPLATE);
    writeOut(wsDir, 'HEARTBEAT.md', HEARTBEAT_TEMPLATE);
  }

  // ── Memory .gitkeep ──
  writeFileSync(join(memoryDir, '.gitkeep'), '', 'utf-8');
  writeFileSync(join(outputDir, 'memory', '.gitkeep'), '', 'utf-8');

  // FIX #2: Remove BOOTSTRAP.md if it exists (prevents first-run wizard)
  const bootstrapPaths = [join(wsDir, 'BOOTSTRAP.md'), join(outputDir, 'BOOTSTRAP.md')];
  for (const bp of bootstrapPaths) {
    try { if (existsSync(bp)) { const { unlinkSync } = await import('fs'); unlinkSync(bp); } } catch {}
  }

  // ═══════════════════════════════════════════
  //  Build openclaw.json
  // ═══════════════════════════════════════════

  const config = JSON.parse(readFileSync(join(ROOT, 'config', 'openclaw.template.json'), 'utf-8'));

  // FIX #3: Set workspace to absolute path (not __WORKSPACE_PATH__)
  config.agents.defaults.workspace = wsDir;

  // Model
  config.agents.defaults.model.primary = AI_MODELS[modelAnswers.modelKey];

  // FIX #4: Auth profile — use consistent name "anthropic:default"
  if (anthropicOAuth) {
    config.auth.profiles['anthropic:default'] = { provider: 'anthropic', mode: 'oauth' };
  } else if (anthropicKey) {
    config.auth.profiles['anthropic:default'] = { provider: 'anthropic', mode: 'token' };
  }

  // OpenAI
  if (apiAnswers.openaiKey.trim()) {
    config.agents.defaults.memorySearch.remote = { apiKey: apiAnswers.openaiKey.trim() };
  }

  // Brave
  if (apiAnswers.braveKey.trim()) {
    if (!config.plugins) config.plugins = { entries: {} };
    config.plugins.entries = config.plugins.entries || {};
    config.plugins.entries.brave = { enabled: true, config: { webSearch: { apiKey: apiAnswers.braveKey.trim() } } };
    if (!config.tools) config.tools = {};
    config.tools.web = { search: { provider: 'brave' } };
  }

  // ElevenLabs / Deepgram
  if (apiAnswers.elevenlabsKey.trim() || apiAnswers.deepgramKey.trim()) {
    if (!config.env) config.env = {};
    if (!config.env.vars) config.env.vars = {};
    if (apiAnswers.elevenlabsKey.trim()) config.env.vars.ELEVENLABS_API_KEY = apiAnswers.elevenlabsKey.trim();
    if (apiAnswers.deepgramKey.trim()) {
      config.env.vars.DEEPGRAM_API_KEY = apiAnswers.deepgramKey.trim();
      config.env.vars.DEEPGRAM_MODEL = 'nova-3';
      config.env.vars.DEEPGRAM_LANGUAGE = 'ko';
    }
  }

  // Discord
  config.channels.discord.token = discordAnswers.discordToken.trim() || '';
  config.channels.discord.dmPolicy = 'allowlist';
  config.channels.discord.allowFrom = [discordId];
  config.channels.discord.streaming = 'partial';
  config.channels.discord.historyLimit = 16;
  config.channels.discord.intents = { presence: true };
  config.channels.discord.actions = {
    reactions: true, stickers: true, emojiUploads: true, stickerUploads: true,
    polls: true, permissions: true, messages: true, threads: true, pins: true,
    search: true, memberInfo: true, roleInfo: true, roles: true, channelInfo: true,
    voiceStatus: true, events: true, moderation: true, channels: true, presence: true,
  };

  config.commands = { native: 'auto', nativeSkills: 'auto', debug: true, restart: true, ownerAllowFrom: [discordId], ownerDisplay: 'raw' };

  // Server policy
  if (discordPolicy === 'mention') {
    config.channels.discord.groupPolicy = 'mention';
  } else if (discordPolicy === 'all') {
    config.channels.discord.groupPolicy = 'all';
  } else {
    config.channels.discord.groupPolicy = 'allowlist';
    const guilds = {};
    for (const server of serverConfigs) {
      const guild = { requireMention: server.requireMention, channels: {} };
      for (const chId of server.channels) {
        guild.channels[chId] = { allow: true, requireMention: server.requireMention, enabled: true };
      }
      guilds[server.guildId] = guild;
    }
    config.channels.discord.guilds = guilds;
  }

  // FIX #5: Always set gateway.mode
  config.gateway.port = port;
  config.gateway.mode = 'local';
  config.gateway.bind = 'loopback';

  // Plugins
  if (!config.plugins) config.plugins = { entries: {} };
  config.plugins.entries.discord = { enabled: true, config: {} };

  // Write config to BOTH locations
  const configJson = JSON.stringify(config, null, 2) + '\n';
  writeOut(outputDir, 'openclaw.json', configJson);           // root (user reference)
  writeOut(configDir, 'openclaw.json', configJson);           // .openclaw/ (runtime)

  // ═══════════════════════════════════════════
  //  FIX #6: Create auth-profiles.json
  // ═══════════════════════════════════════════

  if (anthropicKey) {
    const authProfiles = {
      version: 1,
      profiles: {
        'anthropic:default': {
          type: 'token',
          provider: 'anthropic',
          token: anthropicKey,
        },
      },
      lastGood: { anthropic: 'anthropic:default' },
    };
    writeOut(agentDir, 'auth-profiles.json', JSON.stringify(authProfiles, null, 2) + '\n');
  }

  // ═══════════════════════════════════════════
  //  Summary
  // ═══════════════════════════════════════════

  const configured = [];
  const notConfigured = [];

  if (anthropicKey) configured.push('Anthropic (API 키)');
  else if (anthropicOAuth) configured.push('Anthropic (OAuth — 브라우저 인증 필요)');
  else notConfigured.push('Anthropic 인증');

  if (apiAnswers.openaiKey.trim()) configured.push('OpenAI (메모리 검색)');
  else notConfigured.push('OpenAI API 키 (메모리 검색)');

  if (apiAnswers.braveKey.trim()) configured.push('Brave Search (웹 검색)');
  else notConfigured.push('Brave Search API 키 (웹 검색)');

  if (apiAnswers.elevenlabsKey.trim()) configured.push('ElevenLabs (음성 TTS)');
  if (apiAnswers.deepgramKey.trim()) configured.push('Deepgram (음성 STT)');
  if (discordAnswers.discordToken.trim()) configured.push('Discord 봇 토큰');
  else notConfigured.push('Discord 봇 토큰');

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ ${vars.name} 생성 완료!`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`📁 위치: ${outputDir}`);

  console.log('\n📋 생성된 파일:');
  console.log('  캐릭터: SOUL.md / AGENTS.md / IDENTITY.md / USER.md / MEMORY.md');
  console.log('  설정: openclaw.json / .openclaw/agents/main/agent/auth-profiles.json');
  if (charAnswers.moduleKeys.length > 0) console.log('  모듈: modules/ (선택한 시스템 모듈)');
  if (hasProactiveChat) console.log('  하트비트: HEARTBEAT.md (선제 대화)');

  console.log('\n🔑 API 설정 현황:');
  if (configured.length > 0) console.log('  ✅ ' + configured.join('\n  ✅ '));
  if (notConfigured.length > 0) console.log('  ❌ ' + notConfigured.join('\n  ❌ '));

  console.log(`\n🤖 모델: ${AI_MODELS[modelAnswers.modelKey]}`);
  if (discordPolicy === 'mention') console.log('🏠 서버 정책: 멘션(@봇) 시에만 반응');
  else if (discordPolicy === 'all') console.log('🏠 서버 정책: 모든 서버에서 항상 반응');
  else console.log(`🏠 서버 정책: ${serverConfigs.length}개 서버 허용목록`);
  console.log(`🌐 게이트웨이 포트: ${port}`);

  console.log(`\n${'─'.repeat(50)}`);
  console.log('🚀 구동 방법:\n');
  if (IS_WINDOWS) {
    console.log(`  $env:OPENCLAW_HOME = "${outputDir}"`);
    console.log('  openclaw gateway run\n');
  } else {
    console.log(`  export OPENCLAW_HOME="${outputDir}"`);
    console.log('  openclaw gateway run\n');
  }

  console.log('📝 커스텀 방법:');
  console.log(`  캐릭터 파일을 수정한 후 .openclaw/workspace/ 에도 복사하세요.`);
  console.log(`  또는 .openclaw/workspace/ 안의 파일을 직접 수정해도 됩니다.\n`);

  if (notConfigured.length > 0) {
    console.log('⚠️  미설정 항목:');
    for (const item of notConfigured) {
      console.log(`  → ${item}: openclaw.json에서 직접 수정하세요.`);
    }
    console.log('');
  }

  if (anthropicOAuth) {
    console.log('🔐 Anthropic OAuth 연결:');
    if (IS_WINDOWS) console.log(`  $env:OPENCLAW_HOME = "${outputDir}"`);
    else console.log(`  export OPENCLAW_HOME="${outputDir}"`);
    console.log('  openclaw channels login\n');
  }
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});
