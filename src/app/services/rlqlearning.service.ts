import {Injectable} from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import {Subject, BehaviorSubject} from 'rxjs';
//import * as path from 'node:path';
//import * as fs from 'node:fs';

export interface CarState {
  position: { x: number, z: number };
  velocity: number;
  obstacleDistances: number[];
  trackPosition: number;
}

export interface LearningConfig {
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
}

export interface TrainingMetrics {
  episodeNumber: number;
  totalReward: number;
  averageReward: number;
  explorationRate: number;
  loss: number;
  actionDistribution: number[];
  timestamp: number;
}

export interface Experience {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
}

@Injectable({
  providedIn: 'root'
})
export class RLQLearningService {
  // Model and Configuration
  private model: tf.Sequential | any;
  private config: LearningConfig;

  // Experience Replay
  private replayBuffer: Experience[] = [];
  private readonly MAX_REPLAY_BUFFER_SIZE = 10000;
  private readonly BATCH_SIZE = 64;

  // Logging and Metrics
  public trainingMetrics: TrainingMetrics[] = [];
  public logger: Subject<string> = new Subject<string>();
  public metricsLogger: BehaviorSubject<TrainingMetrics | null> = new BehaviorSubject<TrainingMetrics | null>(null);
  public actionLogger: Subject<number> = new Subject<number>();

  constructor() {
    this.config = {
      learningRate: 0.001,
      discountFactor: 0.99,
      explorationRate: 0.1
    };
    this.initializeModel();
    this.initializeLogging();
  }

  // Model Initialization
  private initializeModel(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [6],
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 4,
          activation: 'linear'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError'
    });
  }

  // State Preprocessing
  preprocessState(state: CarState): number[] {
    return [
      state.position.x,
      state.position.z,
      state.velocity,
      ...state.obstacleDistances,
      state.trackPosition
    ];
  }

  // Action Selection
  selectAction(state: number[]): number {
    // Epsilon-greedy action selection
    if (Math.random() < this.config.explorationRate) {
      const randomAction = Math.floor(Math.random() * 4);
      this.actionLogger.next(randomAction);
      return randomAction;
    }

    const stateTensor = tf.tensor2d([state]);
    const predictions = this.model.predict(stateTensor) as tf.Tensor;
    const action = predictions.argMax(-1).dataSync()[0];

    // Log selected action
    this.actionLogger.next(action);

    // Cleanup
    stateTensor.dispose();
    predictions.dispose();

    return action;
  }

  // Experience Management
  addExperience(
    state: number[],
    action: number,
    reward: number,
    nextState: number[]
  ): void {
    const experience: Experience = {state, action, reward, nextState};

    this.replayBuffer.push(experience);

    // Manage replay buffer size
    if (this.replayBuffer.length > this.MAX_REPLAY_BUFFER_SIZE) {
      this.replayBuffer.shift();
    }
  }

  // Model Training
  async trainModel(): Promise<TrainingMetrics | null> {
    // Ensure sufficient experiences
    if (this.replayBuffer.length < this.BATCH_SIZE) return null;

    // Sample random batch
    const batch = this.getRandomBatch(this.BATCH_SIZE);

    try {
      const stateTensor = tf.tensor2d(batch.map(exp => exp.state));
      const nextStateTensor = tf.tensor2d(batch.map(exp => exp.nextState));

      const currentQ: tf.Tensor<tf.Rank> | any = this.model.predict(stateTensor) as tf.Tensor;
      const nextQ: tf.Tensor<tf.Rank> | any = this.model.predict(nextStateTensor) as tf.Tensor;

      // Calculate target Q-values
      const targets = batch.map((exp, idx) => {
        const target = currentQ.arraySync()[idx].slice();
        const maxNextQ = Math.max(...nextQ.arraySync()[idx]);

        target[exp.action] = exp.reward +
          this.config.discountFactor * maxNextQ;

        return target;
      });

      const targetTensor = tf.tensor2d(targets);

      // Train the model
      const history = await this.model.fit(stateTensor, targetTensor, {
        epochs: 1,
        batchSize: this.BATCH_SIZE
      });

      // Compile metrics
      const metrics: TrainingMetrics = {
        episodeNumber: this.trainingMetrics.length + 1,
        totalReward: batch.reduce((sum, exp) => sum + exp.reward, 0),
        averageReward: batch.reduce((sum, exp) => sum + exp.reward, 0) / batch.length,
        explorationRate: this.config.explorationRate,
        loss: history.history['loss'][0] as number,
        actionDistribution: this.calculateActionDistribution(batch),
        timestamp: Date.now()
      };

      // Store and log metrics
      this.trainingMetrics.push(metrics);
      this.metricsLogger.next(metrics);
      this.logger.next(`Training Episode ${metrics.episodeNumber} Complete`);

      // Cleanup
      stateTensor.dispose();
      nextStateTensor.dispose();
      currentQ.dispose();
      nextQ.dispose();
      targetTensor.dispose();

      return metrics;
    } catch (error) {
      console.error('Training failed:', error);
      return null;
    }
  }

  // Utility Methods
  private getRandomBatch(batchSize: number): Experience[] {
    const shuffled = this.replayBuffer
      .sort(() => 0.5 - Math.random());
    return shuffled.slice(0, batchSize);
  }

  private calculateActionDistribution(batch: Experience[]): number[] {
    const actionCounts = [0, 0, 0, 0];
    batch.forEach(exp => actionCounts[exp.action]++);
    return actionCounts.map(count => count / batch.length);
  }

  // Exploration Strategy
  dynamicExplorationRate(): void {
    this.config.explorationRate = Math.max(
      0.01,
      this.config.explorationRate * 0.99
    );
    this.logger.next(`Exploration Rate: ${this.config.explorationRate.toFixed(4)}`);
  }

  // Logging Initialization
  private initializeLogging(): void {
    this.logger.subscribe(message => {
      console.log(`[RL Logger] ${message}`);
    });
  }

  /*

  // Enhanced Model Persistence
  async saveModel(basePath: string): Promise<void> {
    try {
      // Ensure directory exists
      const modelDir = path.join(basePath, `model_${Date.now()}`);
      fs.mkdirSync(modelDir, {recursive: true});

      // Save model
      await this.model.save(`file://${modelDir}`);

      // Save additional metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        trainingEpisodes: this.trainingMetrics.length,
        config: this.config,
        lastMetrics: this.trainingMetrics[this.trainingMetrics.length - 1]
      };

      fs.writeFileSync(
        path.join(modelDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      this.logger.next(`Model saved to ${modelDir}`);
    } catch (error: any) {
      console.error('Model save failed:', error);
      this.logger.next(`Model save failed: ${error.message}`);
    }
  }

  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`) as tf.Sequential;
    this.model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError'
    });
    this.logger.next(`Model loaded from ${path}`);
  }

   */

  public async saveModel(): Promise<void> {
    await this.model.save('localstorage://my-reinforcement-learning-model');
    console.log('Model saved');
  }

  public async loadModel(): Promise<void> {
    try {
      this.model = await tf.loadLayersModel('localstorage://my-reinforcement-learning-model') as tf.Sequential;
      this.model.compile({
        optimizer: tf.train.adam(this.config.learningRate),
        loss: 'meanSquaredError'
      });
      console.log('Model loaded');
    } catch (error) {
      console.error('Error loading model:', error);
      // Handle error, e.g., initialize a new model if loading fails
    }
  }


  // Reset Learning Process
  resetLearning(): void {
    this.replayBuffer = [];
    this.trainingMetrics = [];
    this.config.explorationRate = 0.1;
    this.initializeModel();
    this.logger.next('Learning Process Reset');
  }

  // Get Current Learning Configuration
  getLearningConfig(): LearningConfig {
    return {...this.config};
  }

  // Update Learning Configuration
  updateLearningConfig(config: Partial<LearningConfig>): void {
    this.config = {...this.config, ...config};
    if (config.learningRate) {
      this.model.compile({
        optimizer: tf.train.adam(this.config.learningRate),
        loss: 'meanSquaredError'
      });
    }
    this.logger.next('Learning Configuration Updated');
  }

  // Export Replay Buffer
  exportReplayBuffer(): Experience[] {
    return [...this.replayBuffer];
  }

  // Get Training History
  getTrainingHistory(): TrainingMetrics[] {
    return this.trainingMetrics;
  }

  // Advanced Training Method
  async trainModelWithEarlyStopping(
    maxEpisodes: number = 1000,
    targetReward: number = 100
  ): Promise<void> {
    let episode = 0;
    while (episode < maxEpisodes) {
      const metrics = await this.trainModel();

      if (!metrics) {
        await this.delay(100); // Small delay if no training occurred
        continue;
      }

      // Dynamic learning rate adjustment
      if (metrics.averageReward > targetReward) {
        this.logger.next(`Target reward reached in episode ${episode}`);
        break;
      }

      // Adjust exploration rate
      this.dynamicExplorationRate();

      episode++;
    }
  }

  // Utility delay method
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Advanced Reward Tracking
  calculateRunningAverage(windowSize: number = 10): number[] {
    if (this.trainingMetrics.length < windowSize) {
      return [];
    }

    const rewardWindow = this.trainingMetrics
      .slice(-windowSize)
      .map(m => m.averageReward);

    return rewardWindow;
  }

  // Advanced Diagnostics
  generateTrainingReport(): string {
    if (this.trainingMetrics.length === 0) {
      return 'No training data available';
    }

    const lastMetrics = this.trainingMetrics[this.trainingMetrics.length - 1];
    const runningAverage = this.calculateRunningAverage();

    return `
Training Report
---------------
Total Episodes: ${this.trainingMetrics.length}
Last Episode Metrics:
  - Total Reward: ${lastMetrics.totalReward.toFixed(2)}
  - Average Reward: ${lastMetrics.averageReward.toFixed(2)}
  - Exploration Rate: ${lastMetrics.explorationRate.toFixed(4)}
  - Training Loss: ${lastMetrics.loss.toFixed(4)}

Running Average (Last 10 Episodes):
  ${runningAverage.map((r, i) => `Episode ${i + 1}: ${r.toFixed(2)}`).join('\n  ')}
    `;
  }
}
