declare module 'synaptic' {
  export class Neuron {
    constructor();
    activate(input?: number): number;
    propagate(rate: number, target?: number): void;
    project(neuron: Neuron | Layer, weight?: number): Connection;
    bias: number;
  }

  export class Layer {
    constructor(neuronCount: number);
    activate(input?: number[]): number[];
    propagate(rate: number, target?: number[]): void;
    project(layer: Layer, type?: string): Connection[];
    neurons: Neuron[];
    size: number;
  }

  export class Network {
    constructor(layers?: Layer[]);
    activate(input: number[]): number[];
    propagate(rate: number, target: number[]): void;
    setOptimize(optimize: boolean): void;
    toJSON(): object;
    static fromJSON(json: object): Network;
    clone(): Network;
    layers: { input: Layer; hidden?: Layer[]; output: Layer };
  }

  export class Architect {
    static Perceptron(...args: number[]): Network;
    static LSTM(...args: number[]): Network;
    static Liquid(...args: number[]): Network;
    static Hopfield(neurons: number): Network;
  }

  export class Connection {
    constructor(from: Neuron, to: Neuron, weight?: number);
    weight: number;
    from: Neuron;
    to: Neuron;
    id: number;
  }

  export const Trainer: {
    new (network: Network): {
      train(
        set: { input: number[]; output: number[] }[],
        options?: {
          rate?: number;
          iterations?: number;
          error?: number;
          shuffle?: boolean;
          log?: number;
          cost?: (target: number[], output: number[]) => number;
        }
      ): { error: number; iterations: number; time: number };
    };
  };
}
