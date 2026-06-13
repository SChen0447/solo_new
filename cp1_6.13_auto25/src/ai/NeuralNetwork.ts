import { Architect, Network } from 'synaptic';
import type { PerceptionInput, DecisionOutput } from '../types';

const INPUT_NEURONS = 8;
const HIDDEN_NEURONS = 12;
const OUTPUT_NEURONS = 3;

export class NeuralNetworkAI {
  private network: Network;

  constructor(network?: Network) {
    if (network) {
      this.network = network;
    } else {
      this.network = new Architect.Perceptron(INPUT_NEURONS, HIDDEN_NEURONS, OUTPUT_NEURONS);
      this.network.setOptimize(true);
    }
  }

  predict(input: PerceptionInput): DecisionOutput {
    const inputArray = [
      input.nearestFoodDirection,
      input.nearestFoodDistance,
      input.nearestObstacleDirection,
      input.nearestObstacleDistance,
      input.nearestOrganismDirection,
      input.nearestOrganismDistance,
      input.energyLevel,
      input.temperature,
    ];

    const startTime = performance.now();
    const output = this.network.activate(inputArray);
    const elapsed = performance.now() - startTime;

    if (elapsed > 5) {
      console.warn(`Neural network inference took ${elapsed.toFixed(2)}ms, exceeds 5ms target`);
    }

    return {
      movement: output[0] * 2 - 1,
      rotation: output[1] * 2 - 1,
      action: output[2],
    };
  }

  mutate(rate: number): void {
    const weights = this.getWeights();
    for (let i = 0; i < weights.length; i++) {
      if (Math.random() < rate) {
        const mutation = (Math.random() - 0.5) * 0.3;
        weights[i] = Math.max(-1, Math.min(1, weights[i] + mutation));
      }
    }
    this.setWeights(weights);
  }

  clone(): NeuralNetworkAI {
    const clonedNetwork = Network.fromJSON(this.network.toJSON());
    return new NeuralNetworkAI(clonedNetwork);
  }

  crossover(other: NeuralNetworkAI): NeuralNetworkAI {
    const parent1Weights = this.getWeights();
    const parent2Weights = other.getWeights();
    const childWeights: number[] = [];

    const crossoverPoint = Math.floor(Math.random() * parent1Weights.length);

    for (let i = 0; i < parent1Weights.length; i++) {
      if (i < crossoverPoint) {
        childWeights.push(parent1Weights[i]);
      } else {
        childWeights.push(parent2Weights[i]);
      }
    }

    const childNetwork = this.clone();
    childNetwork.setWeights(childWeights);
    return childNetwork;
  }

  getWeights(): number[] {
    const weights: number[] = [];
    this.network.restore();

    const neurons = this.network.neurons();
    for (const item of neurons) {
      const neuron = item.neuron;
      for (const conn of Object.values(neuron.connections.projected)) {
        weights.push(conn.weight);
      }
      weights.push(neuron.bias);
    }

    return weights;
  }

  setWeights(weights: number[]): void {
    this.network.restore();

    let weightIndex = 0;
    const neurons = this.network.neurons();

    for (const item of neurons) {
      const neuron = item.neuron;
      for (const conn of Object.values(neuron.connections.projected)) {
        if (weightIndex < weights.length) {
          conn.weight = weights[weightIndex++];
        }
      }
      if (weightIndex < weights.length) {
        neuron.bias = weights[weightIndex++];
      }
    }

    this.network.setOptimize(true);
  }

  getNeuronCount(): { input: number; hidden: number; output: number } {
    return {
      input: this.network.layers.input.size,
      hidden: this.network.layers.hidden.reduce((sum, layer) => sum + layer.size, 0),
      output: this.network.layers.output.size,
    };
  }

  getActivations(): { input: number[]; hidden: number[]; output: number[] } {
    this.network.restore();
    const input = this.network.layers.input.list.map(n => n.activate());
    const hidden = this.network.layers.hidden.flatMap(layer => layer.list.map(n => n.activate()));
    const output = this.network.layers.output.list.map(n => n.activate());
    return { input, hidden, output };
  }

  toJSON(): object {
    return this.network.toJSON();
  }

  static fromJSON(json: object): NeuralNetworkAI {
    const network = Network.fromJSON(json);
    return new NeuralNetworkAI(network);
  }
}

export default NeuralNetworkAI;
