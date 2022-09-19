import React, { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import {
  blockService,
  exampleState,
  initialState,
} from './services/blockService';
import { animationService } from './services/animationService';
import { after } from '../../src/after';
import { Viz } from './components/Viz';
import { concat } from 'rxjs';

const viz = document.getElementById('viz') as HTMLElement;
const reqBtn = document.getElementById('request') as HTMLButtonElement;
const demoBtn = document.getElementById('demo') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel') as HTMLButtonElement;
const resetBtn = document.getElementById('reset') as HTMLButtonElement;
const vizRoot = createRoot(viz);

//const q = document.location.search.substring(1);
window.addEventListener('DOMContentLoaded', () => {
  let i = 0;
  reqBtn.addEventListener('click', () => blockService(i++));
  demoBtn.addEventListener('click', () => {
    concat(
      after(0, () => blockService(i++)),
      after(1200, () => blockService(i++))
    ).subscribe();
  });
  resetBtn.addEventListener('click', () => {
    document.location.reload();
    // blockService.cancelCurrentAndQueued();
    // blockService.bus.trigger(blockService.actions.next({ subtype: 'Reset' }));

    // animationService.cancelCurrent();
  });
  cancelBtn.addEventListener('click', () => {
    blockService.cancelCurrentAndQueued();
    animationService.cancelCurrent(); // singleton - has no queue
  });
  vizRoot.render(createElement(Viz, { blocks: initialState.blocks }));
});
