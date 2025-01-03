import {Injectable} from '@angular/core';
import * as tf from '@tensorflow/tfjs';

@Injectable({
  providedIn: 'root'
})
export class RlServiceService {
  private model!: tf.Sequential | tf.LayersModel | any;
  private learningRate = 0.01;
  private gamma = 0.99;

  constructor() {
    this.initializeModel();
  }

  // Initialize a simple Neural Network for Q-learning
  private initializeModel(): void {
    this.model = tf.sequential();

    this.model.add(tf.layers.dense({units: 24, inputShape: [4], activation: 'relu'}));
    this.model.add(tf.layers.dense({units: 24, activation: 'relu'}));
    this.model.add(tf.layers.dense({units: 2, activation: 'linear'})); // 2 actions: left or right

    this.model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'meanSquaredError'
    });

    console.log('Model initialized');
  }

  // Predict action based on the current state
  public async predictAction(state: number[]): Promise<number> {
    const stateTensor = tf.tensor2d([state]);
    const prediction: any = this.model.predict(stateTensor) as tf.Tensor;
    const action = (await prediction.array())[0];
    prediction.dispose();
    stateTensor.dispose();

    // Return index of the max value as the action
    return action.indexOf(Math.max(...action));
  }

  // Train the model using a single experience tuple
  public async trainModel(state: number[], action: number, reward: number, nextState: number[], done: boolean): Promise<void> {
    let target = reward;
    const nextStateTensor = tf.tensor2d([nextState]);
    const stateTensor = tf.tensor2d([state]);

    if (!done) {
      const nextPrediction: any = this.model.predict(nextStateTensor) as tf.Tensor;
      const nextMax = Math.max(...(await nextPrediction.array())[0]);
      nextPrediction.dispose();
      target += this.gamma * nextMax;
    }

    const targetTensor = tf.tensor2d([target]);
    const actionTensor = tf.tensor1d([action]);

    const outputs = this.model.predict(stateTensor) as tf.Tensor;
    const outputsArray: any = await outputs.array();
    outputsArray[0][action] = target; // Update Q-value for the action

    // @ts-ignore
    const labels = tf.tensor2d(outputsArray);

    // Train the model
    await this.model.fit(stateTensor, labels, {epochs: 1, verbose: 0});

    // Dispose tensors
    nextStateTensor.dispose();
    stateTensor.dispose();
    targetTensor.dispose();
    actionTensor.dispose();
    labels.dispose();
    outputs.dispose();
  }

  // Reset or start a new episode
  public resetEnvironment(): number[] {
    // Return the initial state of the environment
    return [0, 0, 0, 0]; // Replace with actual state initialization
  }

  // Generate rewards based on actions and outcomes
  public getReward(state: number[], action: number): number {
    // Define the reward function based on the environment
    // Positive reward for avoiding obstacles, negative for collisions
    const reward = Math.random() > 0.5 ? 1 : -1; // Placeholder logic
    return reward;
  }

  // Save the trained model
  public async saveModel(): Promise<void> {
    await this.model.save('localstorage://my-reinforcement-learning-model');
    console.log('Model saved');
  }

  // Load a pre-trained model
  public async loadModel(): Promise<void> {
    this.model = await tf.loadLayersModel('localstorage://my-reinforcement-learning-model');
    console.log('Model loaded');
  }
}
