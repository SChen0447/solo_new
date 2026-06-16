import { SimulationEngine } from './core/SimulationEngine';

let engine: SimulationEngine;

function init() {
  engine = new SimulationEngine('canvas-container');
}

window.addEventListener('DOMContentLoaded', init);

export {};
