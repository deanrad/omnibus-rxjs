import React, { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import {
  blockService,
  exampleState,
  initialState,
} from './services/blockService';
import { Viz } from './components/Viz';

const viz = document.getElementById('viz') as HTMLElement;
const reqBtn = document.getElementById('request') as HTMLButtonElement;
const vizRoot = createRoot(viz);

window.addEventListener('DOMContentLoaded', () => {
  let i = 1;
  reqBtn.addEventListener('click', () => blockService(i++));

  vizRoot.render(createElement(Viz, { blocks: initialState.blocks }));
});
