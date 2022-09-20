import React, { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import {
  blockService,
  exampleState,
  initialState,
} from './services/blockService';
import { animationService } from './services/animationService';
import { bus } from './services/bus';
import { after } from '../../src/after';
import { Viz } from './components/Viz';
import { concat, takeUntil } from 'rxjs';

const viz = document.getElementById('viz') as HTMLElement;
const reqBtn = document.getElementById('request') as HTMLButtonElement;
const demoBtn = document.getElementById('demo') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel') as HTMLButtonElement;
const resetBtn = document.getElementById('reset') as HTMLButtonElement;
const vizRoot = createRoot(viz);

window.addEventListener('DOMContentLoaded', () => {
  let i = 0;
  reqBtn.addEventListener('click', () => blockService(i++));
  demoBtn.addEventListener('click', () => {
    concat(
      after(0, () => blockService(i++)),
      after(1200, () => blockService(i++))
    )
      .pipe(takeUntil(bus.query(blockService.actions.cancel.match)))
      .subscribe();
  });
  resetBtn.addEventListener('click', () => {
    document.location.reload();
  });
  cancelBtn.addEventListener('click', () => {
    blockService.cancelCurrentAndQueued();
    animationService.cancelCurrent(); // singleton - has no queue
  });
  vizRoot.render(createElement(Viz, { blocks: initialState.blocks }));
});
