#!/usr/bin/env node

import inquirer from 'inquirer';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

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

function writeOutput(outputDir, filename, content) {
  writeFileSync(join(outputDir, filename), content, 'utf-8');
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
      type: 'input',
      name: 'guildId',
      message: '서버 ID:',
      validate: (v) => /^\d+$/.test(v.trim()) ? true : '숫자만 입력해주세요.',
    }]);

    const { requireMention } = await inquirer.prompt([{
      type: 'list',
      name: 'requireMention',
      message: `이 서버에서 멘션 필요?`,
      choices: [
        { name: '아니오 — 모든 메시지에 반응', value: false },
        { name: '예 — 멘션(@봇)할 때만 반응', value: true },
      ],
    }]);

    const channels = [];
    let addChannels = true;

    while (addChannels) {
      const { channelId } = await inquirer.prompt([{
        type: 'input',
        name: 'channelId',
        message: '채널 ID (비워두면 서버 전체):',
        default: '',
      }]);

      if (channelId.trim()) {
        channels.push(channelId.trim());
        const { more } = await inquirer.prompt([{
          type: 'confirm',
          name: 'more',
          message: '채널 더 추가?',
          default: false,
        }]);
        addChannels = more;
      } else {
        addChannels = false;
      }
    }

    servers.push({ guildId: guildId.trim(), requireMention, channels });

    const { more } = await inquirer.prompt([{
      type: 'confirm',
      name: 'more',
      message: '서버 더 추가?',
      default: false,
    }]);
    addMore = more;
  }

  return servers;
}

async function main() {
  console.log('\n🎭 OpenClaw Persona Creator\n');
  console.log('나만의 AI 캐릭터를 만들어보세요!\n');

  // ─── 1. 캐릭터 기본 정보 ───
  console.log('━━━ 1/5: 캐릭터 정보 ━━━\n');

  const charAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '캐릭터 이름:',
      validate: (v) => v.trim() ? true : '이름을 입력해주세요.',
    },
    {
      type: 'list',
      name: 'gender',
      message: '성별:',
      choices: ['여성', '남성', '중성', '기타'],
    },
    {
      type: 'list',
      name: 'speechStyleKey',
      message: '말투 스타일:',
      choices: Object.keys(SPEECH_STYLES),
    },
    {
      type: 'input',
      name: 'personality',
      message: '성격 키워드 (자유 입력):',
      default: '밝고 유쾌함, 호기심 많음',
    },
    {
      type: 'input',
      name: 'likes',
      message: '좋아하는 것:',
      default: '음악, 게임, 새로운 것 배우기',
    },
    {
      type: 'input',
      name: 'dislikes',
      message: '싫어하는 것:',
      default: '지루한 것, 거짓말',
    },
    {
      type: 'input',
      name: 'creator',
      message: '만든 사람 이름:',
      validate: (v) => v.trim() ? true : '이름을 입력해주세요.',
    },
    {
      type: 'list',
      name: 'presetKey',
      message: '프리셋 베이스:',
      choices: Object.keys(PRESET_NAMES),
    },
    {
      type: 'checkbox',
      name: 'moduleKeys',
      message: '모듈 선택 (스페이스바로 선택):',
      choices: Object.keys(MODULE_MAP),
    },
  ]);

  // ─── 2. AI 모델 설정 ───
  console.log('\n━━━ 2/5: AI 모델 설정 ━━━\n');

  const modelAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'modelKey',
      message: 'AI 모델 선택:',
      choices: Object.keys(AI_MODELS),
    },
  ]);

  // ─── 3. API 키 설정 ───
  console.log('\n━━━ 3/5: API 키 설정 ━━━\n');
  console.log('💡 빈칸으로 넘기면 나중에 openclaw.json에서 수동 설정 가능\n');

  const apiAnswers = await inquirer.prompt([
    {
      type: 'password',
      name: 'anthropicKey',
      message: 'Anthropic API 키 (sk-ant-...):',
      mask: '*',
      default: '',
    },
    {
      type: 'password',
      name: 'openaiKey',
      message: 'OpenAI API 키 (메모리 검색용, sk-...):',
      mask: '*',
      default: '',
    },
    {
      type: 'password',
      name: 'braveKey',
      message: 'Brave Search API 키 (웹 검색용):',
      mask: '*',
      default: '',
    },
    {
      type: 'password',
      name: 'elevenlabsKey',
      message: 'ElevenLabs API 키 (음성 TTS용, 선택):',
      mask: '*',
      default: '',
    },
    {
      type: 'password',
      name: 'deepgramKey',
      message: 'Deepgram API 키 (음성 STT용, 선택):',
      mask: '*',
      default: '',
    },
  ]);

  // ─── 4. 디스코드 설정 ───
  console.log('\n━━━ 4/5: 디스코드 설정 ━━━\n');

  const discordAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'discordId',
      message: 'Discord 사용자 ID (숫자, 주인):',
      validate: (v) => {
        if (!v.trim()) return '디스코드 ID를 입력해주세요.';
        if (!/^\d+$/.test(v.trim())) return '숫자만 입력해주세요.';
        return true;
      },
    },
    {
      type: 'password',
      name: 'discordToken',
      message: 'Discord 봇 토큰:',
      mask: '*',
      default: '',
    },
    {
      type: 'list',
      name: 'discordPolicyKey',
      message: '디스코드 서버 정책:',
      choices: Object.keys(DISCORD_POLICIES),
    },
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
    {
      type: 'input',
      name: 'outputDir',
      message: '출력 디렉토리:',
      default: `./output/${charAnswers.name.trim()}`,
    },
    {
      type: 'input',
      name: 'gatewayPort',
      message: '게이트웨이 포트 (기본 18789, 다른 봇 있으면 변경):',
      default: '18789',
      validate: (v) => /^\d+$/.test(v.trim()) ? true : '숫자만 입력해주세요.',
    },
  ]);

  // ─── Build ───

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
  const outputDir = outputAnswers.outputDir;

  // Create output directories
  mkdirSync(join(outputDir, 'memory'), { recursive: true });
  mkdirSync(join(outputDir, 'modules'), { recursive: true });

  // Generate character files
  if (preset) {
    const presetDir = join(ROOT, 'presets', preset);
    writeOutput(outputDir, 'SOUL.md', replaceVars(readTemplate(join(presetDir, 'SOUL.md')), vars));
    writeOutput(outputDir, 'AGENTS.md', readTemplate(join(presetDir, 'AGENTS.md')));
    writeOutput(outputDir, 'IDENTITY.md', replaceVars(readTemplate(join(presetDir, 'IDENTITY.md')), vars));
  } else {
    writeOutput(outputDir, 'SOUL.md', replaceVars(readTemplate(join(ROOT, 'templates', 'SOUL.template.md')), vars));
    writeOutput(outputDir, 'AGENTS.md', readTemplate(join(ROOT, 'templates', 'AGENTS.template.md')));
    writeOutput(outputDir, 'IDENTITY.md', replaceVars(readTemplate(join(ROOT, 'templates', 'IDENTITY.template.md')), vars));
  }

  writeOutput(outputDir, 'USER.md', replaceVars(readTemplate(join(ROOT, 'templates', 'USER.template.md')), vars));
  writeOutput(outputDir, 'MEMORY.md', replaceVars(readTemplate(join(ROOT, 'templates', 'MEMORY.template.md')), vars));

  // Copy selected modules
  let hasProactiveChat = false;
  for (const moduleKey of charAnswers.moduleKeys) {
    const moduleFile = MODULE_MAP[moduleKey];
    copyFileSync(join(ROOT, 'modules', moduleFile), join(outputDir, 'modules', moduleFile));
    if (moduleFile === 'proactive-chat.md') hasProactiveChat = true;
  }

  if (hasProactiveChat) {
    writeOutput(outputDir, 'HEARTBEAT.md', `# HEARTBEAT.md

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
`);
  }

  // ─── Build openclaw.json ───

  const config = JSON.parse(readFileSync(join(ROOT, 'config', 'openclaw.template.json'), 'utf-8'));
  const discordId = discordAnswers.discordId.trim();
  const port = parseInt(outputAnswers.gatewayPort.trim());

  // Model
  config.agents.defaults.model.primary = AI_MODELS[modelAnswers.modelKey];

  // Anthropic auth
  if (apiAnswers.anthropicKey.trim()) {
    config.auth.profiles['anthropic:default'].token = apiAnswers.anthropicKey.trim();
  }

  // OpenAI (memory search)
  if (apiAnswers.openaiKey.trim()) {
    config.agents.defaults.memorySearch.remote = { apiKey: apiAnswers.openaiKey.trim() };
  }

  // Brave Search
  if (apiAnswers.braveKey.trim()) {
    if (!config.plugins) config.plugins = { entries: {} };
    config.plugins.entries = config.plugins.entries || {};
    config.plugins.entries.brave = {
      enabled: true,
      config: { webSearch: { apiKey: apiAnswers.braveKey.trim() } },
    };
    if (!config.tools) config.tools = {};
    config.tools.web = { search: { provider: 'brave' } };
  }

  // ElevenLabs
  if (apiAnswers.elevenlabsKey.trim()) {
    if (!config.env) config.env = {};
    if (!config.env.vars) config.env.vars = {};
    config.env.vars.ELEVENLABS_API_KEY = apiAnswers.elevenlabsKey.trim();
  }

  // Deepgram
  if (apiAnswers.deepgramKey.trim()) {
    if (!config.env) config.env = {};
    if (!config.env.vars) config.env.vars = {};
    config.env.vars.DEEPGRAM_API_KEY = apiAnswers.deepgramKey.trim();
    config.env.vars.DEEPGRAM_MODEL = 'nova-3';
    config.env.vars.DEEPGRAM_LANGUAGE = 'ko';
  }

  // Discord
  config.channels.discord.token = discordAnswers.discordToken.trim() || '';
  config.channels.discord.dmPolicy = 'allowlist';
  config.channels.discord.allowFrom = [discordId];
  config.commands = {
    native: 'auto',
    nativeSkills: 'auto',
    debug: true,
    restart: true,
    ownerAllowFrom: [discordId],
    ownerDisplay: 'raw',
  };

  // Discord server policy
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

  // Gateway
  config.gateway.port = port;

  // Discord plugin
  if (!config.plugins) config.plugins = { entries: {} };
  config.plugins.entries.discord = { enabled: true, config: {} };

  // Streaming
  config.channels.discord.streaming = 'partial';
  config.channels.discord.historyLimit = 16;
  config.channels.discord.intents = { presence: true };
  config.channels.discord.actions = {
    reactions: true, stickers: true, emojiUploads: true, stickerUploads: true,
    polls: true, permissions: true, messages: true, threads: true, pins: true,
    search: true, memberInfo: true, roleInfo: true, roles: true, channelInfo: true,
    voiceStatus: true, events: true, moderation: true, channels: true, presence: true,
  };

  writeOutput(outputDir, 'openclaw.json', JSON.stringify(config, null, 2) + '\n');
  writeFileSync(join(outputDir, 'memory', '.gitkeep'), '', 'utf-8');

  // ─── Summary ───

  const configured = [];
  const notConfigured = [];

  if (apiAnswers.anthropicKey.trim()) configured.push('Anthropic (AI 모델)');
  else notConfigured.push('Anthropic API 키');

  if (apiAnswers.openaiKey.trim()) configured.push('OpenAI (메모리 검색)');
  else notConfigured.push('OpenAI API 키 (메모리 검색)');

  if (apiAnswers.braveKey.trim()) configured.push('Brave Search (웹 검색)');
  else notConfigured.push('Brave Search API 키 (웹 검색)');

  if (apiAnswers.elevenlabsKey.trim()) configured.push('ElevenLabs (음성 TTS)');
  if (apiAnswers.deepgramKey.trim()) configured.push('Deepgram (음성 STT)');

  if (discordAnswers.discordToken.trim()) configured.push('Discord 봇 토큰');
  else notConfigured.push('Discord 봇 토큰');

  console.log(`\n✅ ${vars.name} 생성 완료!`);
  console.log(`📁 위치: ${outputDir}`);

  console.log('\n📋 생성된 파일:');
  console.log('  SOUL.md / AGENTS.md / IDENTITY.md / USER.md / MEMORY.md / openclaw.json');
  if (charAnswers.moduleKeys.length > 0) console.log('  modules/ (선택한 시스템 모듈)');
  if (hasProactiveChat) console.log('  HEARTBEAT.md (선제 대화)');

  console.log('\n🔑 API 설정 현황:');
  if (configured.length > 0) console.log('  ✅ ' + configured.join(', '));
  if (notConfigured.length > 0) console.log('  ❌ 미설정: ' + notConfigured.join(', '));

  console.log(`\n🤖 모델: ${AI_MODELS[modelAnswers.modelKey]}`);

  if (discordPolicy === 'mention') console.log('🏠 서버 정책: 멘션(@봇) 시에만 반응');
  else if (discordPolicy === 'all') console.log('🏠 서버 정책: 모든 서버에서 항상 반응');
  else console.log(`🏠 서버 정책: ${serverConfigs.length}개 서버 허용목록`);

  console.log(`🌐 게이트웨이 포트: ${port}`);

  console.log('\n🚀 구동 방법:');
  console.log(`  $env:OPENCLAW_HOME = "${outputDir}"`);
  console.log('  openclaw gateway run');

  if (notConfigured.length > 0) {
    console.log('\n⚠️  미설정 항목은 openclaw.json에서 직접 수정하세요.');
  }
  console.log('');
}

main().catch((err) => {
  console.error('오류 발생:', err.message);
  process.exit(1);
});
