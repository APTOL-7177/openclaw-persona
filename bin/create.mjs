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

  const answers = await inquirer.prompt([
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
      type: 'input',
      name: 'discordId',
      message: 'Discord 사용자 ID (숫자):',
      validate: (v) => {
        if (!v.trim()) return '디스코드 ID를 입력해주세요.';
        if (!/^\d+$/.test(v.trim())) return '숫자만 입력해주세요.';
        return true;
      },
    },
    {
      type: 'input',
      name: 'discordToken',
      message: 'Discord 봇 토큰 (나중에 설정하려면 빈칸):',
      default: '',
    },
    {
      type: 'list',
      name: 'discordPolicyKey',
      message: '디스코드 서버 정책:',
      choices: Object.keys(DISCORD_POLICIES),
    },
  ]);

  const discordPolicy = DISCORD_POLICIES[answers.discordPolicyKey];

  // If allowlist, ask for server/channel IDs
  let serverConfigs = [];
  if (discordPolicy === 'allowlist') {
    console.log('\n📋 활동할 서버와 채널을 설정합니다.\n');
    serverConfigs = await askServerChannels();
  }

  const answers2 = await inquirer.prompt([
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
    {
      type: 'input',
      name: 'outputDir',
      message: '출력 디렉토리:',
      default: `./output/${answers.name.trim()}`,
    },
  ]);

  const vars = {
    name: answers.name.trim(),
    gender: answers.gender,
    speechStyle: SPEECH_STYLES[answers.speechStyleKey],
    personality: answers.personality.trim(),
    likes: answers.likes.trim(),
    dislikes: answers.dislikes.trim(),
    creator: answers.creator.trim(),
  };

  const preset = PRESET_NAMES[answers2.presetKey];
  const outputDir = answers2.outputDir;

  // Create output directories
  mkdirSync(join(outputDir, 'memory'), { recursive: true });
  mkdirSync(join(outputDir, 'modules'), { recursive: true });

  // Generate files
  if (preset) {
    const presetDir = join(ROOT, 'presets', preset);
    const soulContent = replaceVars(readTemplate(join(presetDir, 'SOUL.md')), vars);
    const agentsContent = readTemplate(join(presetDir, 'AGENTS.md'));
    const identityContent = replaceVars(readTemplate(join(presetDir, 'IDENTITY.md')), vars);

    writeOutput(outputDir, 'SOUL.md', soulContent);
    writeOutput(outputDir, 'AGENTS.md', agentsContent);
    writeOutput(outputDir, 'IDENTITY.md', identityContent);
  } else {
    const soulContent = replaceVars(readTemplate(join(ROOT, 'templates', 'SOUL.template.md')), vars);
    const agentsContent = readTemplate(join(ROOT, 'templates', 'AGENTS.template.md'));
    const identityContent = replaceVars(readTemplate(join(ROOT, 'templates', 'IDENTITY.template.md')), vars);

    writeOutput(outputDir, 'SOUL.md', soulContent);
    writeOutput(outputDir, 'AGENTS.md', agentsContent);
    writeOutput(outputDir, 'IDENTITY.md', identityContent);
  }

  // USER.md
  const userContent = replaceVars(readTemplate(join(ROOT, 'templates', 'USER.template.md')), vars);
  writeOutput(outputDir, 'USER.md', userContent);

  // MEMORY.md
  const memoryContent = replaceVars(readTemplate(join(ROOT, 'templates', 'MEMORY.template.md')), vars);
  writeOutput(outputDir, 'MEMORY.md', memoryContent);

  // Copy selected modules
  let hasProactiveChat = false;
  for (const moduleKey of answers2.moduleKeys) {
    const moduleFile = MODULE_MAP[moduleKey];
    const src = join(ROOT, 'modules', moduleFile);
    const dest = join(outputDir, 'modules', moduleFile);
    copyFileSync(src, dest);
    if (moduleFile === 'proactive-chat.md') hasProactiveChat = true;
  }

  // If proactive-chat module selected, create HEARTBEAT.md
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

  // Build openclaw config
  const config = JSON.parse(readFileSync(join(ROOT, 'config', 'openclaw.template.json'), 'utf-8'));
  config.agents.defaults.workspace = outputDir;
  const discordId = answers.discordId.trim();
  const discordToken = answers.discordToken.trim();
  config.channels.discord.token = discordToken || '';
  config.channels.discord.dmPolicy = 'allowlist';
  config.channels.discord.allowFrom = [discordId];
  config.commands = { ownerAllowFrom: [discordId] };

  // Discord server policy
  if (discordPolicy === 'mention') {
    config.channels.discord.groupPolicy = 'mention';
  } else if (discordPolicy === 'all') {
    config.channels.discord.groupPolicy = 'all';
  } else {
    // allowlist with specific servers/channels
    config.channels.discord.groupPolicy = 'allowlist';
    const guilds = {};
    for (const server of serverConfigs) {
      const guild = {
        requireMention: server.requireMention,
        channels: {},
      };
      if (server.channels.length > 0) {
        for (const chId of server.channels) {
          guild.channels[chId] = {
            allow: true,
            requireMention: server.requireMention,
            enabled: true,
          };
        }
      } else {
        // No specific channels = server-wide (empty channels object means all channels)
        guild.channels = {};
      }
      guilds[server.guildId] = guild;
    }
    config.channels.discord.guilds = guilds;
  }

  writeOutput(outputDir, 'openclaw.json', JSON.stringify(config, null, 2) + '\n');

  // Create empty .gitkeep in memory folder
  writeFileSync(join(outputDir, 'memory', '.gitkeep'), '', 'utf-8');

  console.log(`\n✅ ${vars.name} 생성 완료!`);
  console.log(`📁 위치: ${outputDir}`);
  console.log('\n생성된 파일:');
  console.log('  - SOUL.md (캐릭터 영혼)');
  console.log('  - AGENTS.md (행동 규칙)');
  console.log('  - IDENTITY.md (정체성)');
  console.log('  - USER.md (주인 정보)');
  console.log('  - MEMORY.md (장기 기억)');
  console.log('  - openclaw.json (설정)');
  console.log('  - memory/ (일별 기억 폴더)');
  if (answers2.moduleKeys.length > 0) {
    console.log('  - modules/ (선택한 시스템 모듈)');
  }

  console.log('\n🚀 구동 방법:');
  if (discordPolicy === 'mention') {
    console.log('  서버 정책: 멘션(@봇) 시에만 반응');
  } else if (discordPolicy === 'all') {
    console.log('  서버 정책: 모든 서버에서 항상 반응');
  } else {
    console.log(`  서버 정책: ${serverConfigs.length}개 서버 허용목록`);
  }
  console.log('');
  console.log('  1. openclaw.json에서 API 키와 Discord 토큰을 설정하세요');
  console.log('  2. USER.md에 주인 정보를 추가하세요');
  console.log('  3. SOUL.md를 원하는 대로 커스텀하세요');
  console.log('  4. 구동:');
  console.log(`     $env:OPENCLAW_HOME = "${outputDir}"`);
  console.log('     openclaw gateway run');
  console.log('');
}

main().catch((err) => {
  console.error('오류 발생:', err.message);
  process.exit(1);
});
