import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = path.resolve('.');
const outputDir = path.join(rootDir, 'output', 'live-smoke');
const serverUrl = 'http://127.0.0.1:4173';
const browserChannel = process.env.WEB_GAME_BROWSER_CHANNEL || 'msedge';

const scenarios = [
  {
    name: 'boot',
    steps: [{ buttons: [], frames: 45 }],
    assert(state, files) {
      if (!state.bootActive) {
        throw new Error(`Boot scenario expected bootActive=true, got ${JSON.stringify(state)}`);
      }
      ensureScreenshot(files.screenshotPath, 'boot');
    }
  },
  {
    name: 'start-overlay',
    steps: [
      { buttons: ['enter'], frames: 2 },
      { buttons: [], frames: 120 }
    ],
    assert(state, files) {
      if (state.overlay?.type !== 'start') {
        throw new Error(`Start overlay expected overlay.type=start, got ${JSON.stringify(state)}`);
      }
      if (state.overlay?.prompt !== 'PRESS BUTTON TO START GAME') {
        throw new Error(`Unexpected start overlay prompt: ${state.overlay?.prompt ?? 'missing'}`);
      }
      ensureScreenshot(files.screenshotPath, 'start overlay');
    }
  },
  {
    name: 'gameplay',
    steps: [
      { buttons: ['enter'], frames: 2 },
      { buttons: [], frames: 120 },
      { buttons: ['enter'], frames: 2 },
      { buttons: [], frames: 20 },
      { buttons: ['enter'], frames: 2 },
      { buttons: [], frames: 12 },
      { buttons: ['right'], frames: 20 },
      { buttons: [], frames: 8 },
      { buttons: ['space'], frames: 2 },
      { buttons: [], frames: 8 },
      { buttons: ['e'], frames: 2 },
      { buttons: [], frames: 6 },
      { buttons: ['up'], frames: 10 },
      { buttons: [], frames: 4 },
      { buttons: ['right'], frames: 10 },
      { buttons: [], frames: 4 },
      { buttons: ['space'], frames: 2 },
      { buttons: [], frames: 220 }
    ],
    assert(state, files) {
      if (!Array.isArray(state.players) || state.players.length !== 2) {
        throw new Error(`Gameplay scenario expected two players, got ${JSON.stringify(state)}`);
      }
      if (!state.turn || typeof state.turn.number !== 'number' || state.turn.number < 1) {
        throw new Error(`Gameplay scenario missing turn state: ${JSON.stringify(state)}`);
      }
      if (state.overlay?.type === 'start') {
        throw new Error(`Gameplay scenario should have left start overlay: ${JSON.stringify(state)}`);
      }
      if (!Array.isArray(state.hud?.players) || state.hud.players.length !== 2) {
        throw new Error(`Gameplay scenario missing HUD player state: ${JSON.stringify(state)}`);
      }
      ensureScreenshot(files.screenshotPath, 'gameplay');
    }
  }
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function ensureScreenshot(filePath, label) {
  const stat = fs.statSync(filePath, { throwIfNoEntry: false });
  if (!stat || stat.size <= 0) {
    throw new Error(`Missing ${label} screenshot at ${filePath}`);
  }
}

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    cwd: rootDir,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });
}

function getNodeCommand(args) {
  return {
    command: process.execPath,
    args
  };
}

function getNpmRunCommand(scriptName) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', `npm run ${scriptName}`]
    };
  }

  return {
    command: 'npm',
    args: ['run', scriptName]
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `Command failed (${command} ${args.join(' ')}): exit ${code}\n${stdout}\n${stderr}`.trim()
        )
      );
    });
  });
}

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function runScenario(scenario) {
  const scenarioDir = path.join(outputDir, scenario.name);
  ensureDir(scenarioDir);

  const browserCommand = getNodeCommand([
    'tools/web_game_playwright_client.js',
    '--url',
    serverUrl,
    '--browser-channel',
    browserChannel,
    '--iterations',
    '1',
    '--pause-ms',
    '250',
    '--screenshot-dir',
    scenarioDir,
    '--actions-json',
    JSON.stringify({ steps: scenario.steps })
  ]);
  await runCommand(browserCommand.command, browserCommand.args);

  const errorPath = path.join(scenarioDir, 'errors-0.json');
  if (fs.existsSync(errorPath)) {
    throw new Error(`Browser errors in ${scenario.name}: ${fs.readFileSync(errorPath, 'utf8')}`);
  }

  const statePath = path.join(scenarioDir, 'state-0.json');
  const screenshotPath = path.join(scenarioDir, 'shot-0.png');
  const rawState = fs.readFileSync(statePath, 'utf8');
  const state = JSON.parse(rawState);
  scenario.assert(state, { statePath, screenshotPath });

  return { scenarioDir, statePath, screenshotPath, state };
}

async function main() {
  removeDir(outputDir);
  ensureDir(outputDir);

  const buildCommand = getNpmRunCommand('build');
  await runCommand(buildCommand.command, buildCommand.args);

  const serverCommand = getNodeCommand(['serve-dist.js']);
  const server = spawnProcess(serverCommand.command, serverCommand.args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverStdout = '';
  let serverStderr = '';
  server.stdout.on('data', (chunk) => {
    serverStdout += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverStderr += chunk.toString();
  });

  try {
    await waitForServer(serverUrl);
    const results = [];
    for (const scenario of scenarios) {
      results.push(await runScenario(scenario));
    }

    const summary = {
      url: serverUrl,
      scenarios: results.map((result) => ({
        name: path.basename(result.scenarioDir),
        screenshot: path.relative(rootDir, result.screenshotPath),
        state: path.relative(rootDir, result.statePath),
        overlay: result.state.overlay?.type ?? null,
        turn: result.state.turn?.number ?? null
      }))
    };

    fs.writeFileSync(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    server.kill();
    if (serverStdout || serverStderr) {
      fs.writeFileSync(path.join(outputDir, 'server.log'), `${serverStdout}\n${serverStderr}`.trim());
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
