declare module 'synaptic' {
  export class Neuron {
    constructor();
    ID: number;
    bias: number;
    activate(input?: number): number;
    propagate(rate: number, target?: number): void;
    project(neuron: Neuron | Layer, weight?: number): Connection;
    gate(connection: Connection): void;
    selfconnected(): boolean;
    connected(neuron: Neuron): { type: string } | null;
    optimize(optimized: object, layer: string | number): object;
    connections: {
      inputs: Record<string, Connection>;
      projected: Record<string, Connection>;
      gated: Record<string, Connection>;
    };
    trace: {
      elegibility: Record<string, number>;
      extended: Record<string, Record<string, number>>;
    };
  }

  export class Layer {
    static connectionType: {
      ALL_TO_ALL: string;
      ONE_TO_ONE: string;
      ALL_TO_ELSE: string;
    };
    static gateType: {
      INPUT: string;
      OUTPUT: string;
      ONE_TO_ONE: string;
    };

    constructor(size: number);
    size: number;
    list: Neuron[];
    connectedTo: Array<{ layer: Layer; type: string }>;

    activate(input?: number[]): number[];
    propagate(rate: number, target?: number[]): void;
    project(layer: Layer | Network, type?: string, weights?: number[]): LayerConnection | undefined;
    gate(connection: LayerConnection, type: string): void;
    selfconnected(): boolean;
    connected(layer: Layer): string | undefined;
    clear(): void;
    reset(): void;
    neurons(): Neuron[];
    set(options: object): void;
  }

  export class LayerConnection {
    constructor(from: Layer, to: Layer, type?: string, weights?: number[]);
    from: Layer;
    to: Layer;
    type: string;
    size: number;
    connections: Record<string, Connection>;
    list: Connection[];
    gatedfrom: Array<{ layer: Layer; type: string }>;
  }

  export class Connection {
    constructor(from: Neuron, to: Neuron, weight?: number);
    ID: number;
    from: Neuron;
    to: Neuron;
    weight: number;
    gain: number;
    gater?: Neuron;
  }

  export class Network {
    constructor(layers?: { input?: Layer; hidden?: Layer[]; output?: Layer });
    layers: { input: Layer; hidden: Layer[]; output: Layer };
    optimized: {
      activate: (input: number[]) => number[];
      propagate: (rate: number, target: number[]) => void;
      memory: Float64Array | number[];
      reset: () => void;
      data?: object;
    } | null;

    activate(input: number[]): number[];
    propagate(rate: number, target: number[]): void;
    project(unit: Layer | Network, type?: string, weights?: number[]): LayerConnection | undefined;
    gate(connection: LayerConnection, type: string): void;
    clear(): void;
    reset(): void;
    optimize(): void;
    restore(): void;
    setOptimize(bool: boolean): void;
    neurons(): Array<{ neuron: Neuron; layer: string | number }>;
    inputs(): number;
    outputs(): number;
    set(layers: { input?: Layer; hidden?: Layer[]; output?: Layer }): void;
    toJSON(ignoreTraces?: boolean): object;
    static fromJSON(json: object): Network;
    clone(): Network;
  }

  export namespace Architect {
    function Perceptron(...args: number[]): Network;
    function LSTM(...args: number[]): Network;
    function Liquid(...args: number[]): Network;
    function Hopfield(neurons: number): Network;
  }

  export class Trainer {
    constructor(network: Network);
    train(
      set: Array<{ input: number[]; output: number[] }>,
      options?: {
        rate?: number;
        iterations?: number;
        error?: number;
        shuffle?: boolean;
        log?: number;
        cost?: (target: number[], output: number[]) => number;
        crossValidate?: {
          testSize: number;
          error: number;
          iterations: number;
        };
      }
    ): { error: number; iterations: number; time: number };
    trainAsync(
      set: Array<{ input: number[]; output: number[] }>,
      options: object,
      callback: (result: object) => void
    ): void;
    XOR(): { error: number; iterations: number };
    DSR(): { error: number; iterations: number };
    ER(): { error: number; iterations: number };
  }

  namespace cost {
    const MSE: (target: number[], output: number[]) => number;
    const CROSS_ENTROPY: (target: number[], output: number[]) => number;
    const BINARY: (target: number[], output: number[]) => number;
  }

  namespace methods {
    namespace activation {
      const LOGISTIC: (x: number, derivative?: boolean) => number;
      const TANH: (x: number, derivative?: boolean) => number;
      const IDENTITY: (x: number, derivative?: boolean) => number;
      const HLIM: (x: number, derivative?: boolean) => number;
      const RELU: (x: number, derivative?: boolean) => number;
    }
    namespace loss {
      const MSE: (target: number[], output: number[]) => number;
      const CROSS_ENTROPY: (target: number[], output: number[]) => number;
      const BINARY: (target: number[], output: number[]) => number;
    }
    namespace gating {
      const ONE_TO_ONE: string;
      const OUTPUT: string;
      const INPUT: string;
    }
    namespace connection {
      const ALL_TO_ALL: string;
      const ALL_TO_ELSE: string;
      const ONE_TO_ONE: string;
    }
  }
}
