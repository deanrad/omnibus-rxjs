import React, { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import {
  searchService,
  exampleState,
  initialState,
} from './services/searchService';
import { Viz } from './components/Viz';

const viz = document.getElementById('viz') as HTMLElement;
const reqBtn = document.getElementById('request') as HTMLButtonElement;
const vizRoot = createRoot(viz);

window.addEventListener('DOMContentLoaded', () => {
  let i = 1;
  reqBtn.addEventListener('click', () => searchService(i++));

  vizRoot.render(createElement(Viz, { blocks: initialState.blocks }));
});
