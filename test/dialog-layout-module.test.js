import test from 'node:test';
import assert from 'node:assert/strict';

import { GAME_HEIGHT, GAME_WIDTH } from '../src/game/constants.js';
import { DialogLayoutModule } from '../src/game/ui/DialogLayoutModule.js';

test('DialogLayoutModule computes centered layout bounds for default and compact modes', () => {
  const module = new DialogLayoutModule();
  const standard = module.compute();
  const compact = module.compute({ compact: true });
  const turn = module.compute({ type: 'turn' });
  const compactTurn = module.compute({ compact: true, type: 'turn' });

  assert.equal(standard.panel.x, GAME_WIDTH * 0.5);
  assert.equal(standard.panel.y, GAME_HEIGHT * 0.5);
  assert.ok(standard.panel.width < GAME_WIDTH);
  assert.ok(standard.panel.height < GAME_HEIGHT);
  assert.ok(compact.panel.width > standard.panel.width);
  assert.ok(compact.panel.height > standard.panel.height);
  assert.ok(standard.scrollbar.x > standard.text.x);
  assert.ok(standard.footer.promptY < standard.panel.top + standard.panel.height);
  assert.ok(turn.panel.width < standard.panel.width);
  assert.ok(turn.panel.height < standard.panel.height);
  assert.ok(compactTurn.panel.width > turn.panel.width);
  assert.ok(compactTurn.panel.height > turn.panel.height);
  assert.ok(turn.text.height >= 96);
  assert.ok(turn.footer.promptY < turn.panel.top + turn.panel.height);
});
