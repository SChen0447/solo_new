import { Architect, Network } from 'synaptic';
import type { PerceptionInput, DecisionOutput, INeuralNetwork } from '../types';

const INPUT_NEURONS = 8;
const HIDDEN_NEURONS = 12;
const OUTPUT_NEURONS = 3;

export class NeuralNetwork implements INeuralNetwork {
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

  clone(): NeuralNetwork {
    const clonedNetwork = Network.fromJSON(this.network.toJSON());
    return new NeuralNetwork(clonedNetwork);
  }

  crossover(other: INeuralNetwork): NeuralNetwork {
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
    const json = this.network.toJSON() as { neurons?: Array<{ connections?: Array<{ weight: number }> }> };
    
    if (json.neurons) {
      json.neurons.forEach((neuron) => {
        if (neuron.connections) {
          neuron.connections.forEach((conn) => {
            weights.push(conn.weight);
          });
        }
      });
    }

    const layers = this.network.layers;
    if (layers.hidden) {
      layers.hidden.forEach((layer) => {
        layer.neurons.forEach((neuron) => {
          weights.push(neuron.bias);
        });
      });
    }
    if (layers.output) {
      layers.output.neurons.forEach((neuron) => {
        weights.push(neuron.bias);
      });
    }

    return weights;
  }

  setWeights(weights: number[]): void {
    let weightIndex = 0;
    const json = this.network.toJSON() as { neurons?: Array<{ connections?: Array<{ weight: number }> }> };

    if (json.neurons) {
      json.neurons.forEach((neuron) => {
        if (neuron.connections) {
          neuron.connections.forEach((conn) => {
            if (weightIndex < weights.length) {
              conn.weight = weights[weightIndex++];
            }
          });
        }
      });
    }

    const layers = this.network.layers;
    if (layers.hidden) {
      layers.hidden.forEach((layer) => {
        layer.neurons.forEach((neuron) => {
          if (weightIndex < weights.length) {
            neuron.bias = weights[weightIndex++];
          }
        });
      });
    }
    if (layers.output) {
      layers.output.neurons.forEach((neuron) => {
        if (weightIndex < weights.length) {
          neuron.bias = weights[weightIndex++];
        }
      });
    }

    this.network = Network.fromJSON(json);
    this.network.setOptimize(true);
  }

  getNeuronActivations(): { input: number[]; hidden: number[]; output: number[] } {
    const layers = this.network.layers;
    return {
      input: layers.input.neurons.map((n) => n.activate()),
      hidden: layers.hidden ? layers.hidden.flatMap((l) => l.neurons.map((n) => n.activate())) : [],
      output: layers.output.neurons.map((n) => n.activate()),
    };
  }

  getWeightMatrix(): { inputToHidden: number[][]; hiddenToOutput: number[][] } {
    const layers = this.network.layers;
    const inputToHidden: number[][] = [];
    const hiddenToOutput: number[][] = [];

    if (layers.hidden && layers.hidden.length > 0) {
      const hiddenLayer = layers.hidden[0];
      hiddenLayer.neurons.forEach((_, i) => {
        inputToHidden[i] = [];
        layers.input.neurons.forEach((_, j) => {
          const conn = hiddenLayer.neurons[i].project(layers.input.neurons[j]);
          inputToHidden[i][j] = conn ? conn.weight : 0;
        });
      });

      layers.output.neurons.forEach((_, i) => {
        hiddenToOutput[i] = [];
        hiddenLayer.neurons.forEach((_, j) => {
          const conn = layers.output.neurons[i].project(hiddenLayer.neurons[j]);
          hiddenToOutput[i][j] = conn ? conn.weight : 0;
        });
      });
    }

    return { inputToHidden, hiddenToOutput };
  }
}

export default NeuralNetwork;
