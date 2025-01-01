import {Injectable} from '@angular/core';
import * as tf from '@tensorflow/tfjs'

@Injectable({
  providedIn: 'root'
})
export class RlServiceService {

  private model: tf.Sequential;
  private learningRate = 0.01

  constructor() {
    this.model = this.createModel();
  }

  private createModel(): tf.Sequential {

    const model: tf.Sequential = tf.sequential();

    model.add(tf.layers.dense({inputShape: [4], units: 24, activation: 'relu'})); // Observation space size
    model.add(tf.layers.dense({units: 24, activation: 'relu'}));
    model.add(tf.layers.dense({units: 4, activation: 'softmax'})); // Action space size

    model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'meanSquaredError'
    });

    return model;
  }

  async predictAction(observation: number[]): Promise<number> {

    console.log('predict action is called with' + observation);

    const inputTensor: tf.Tensor2D = tf.tensor2d([observation]);
    const prediction: tf.Tensor<tf.Rank> = this.model.predict(inputTensor) as tf.Tensor;
    const action: number = (await prediction.argMax(1).data())[0];
    inputTensor.dispose();
    prediction.dispose();
    return action;
  }

  async trainModel(observations: number[][], actions: number[], rewards: number[]): Promise<void> {

    console.log('train modeal is called')
    console.log(observations)
    console.log(actions)
    console.log(rewards)



    const observationTensor: tf.Tensor2D = tf.tensor2d(observations);
    const actionTensor: tf.Tensor1D = tf.tensor1d(actions, 'int32');
    const rewardTensor: tf.Tensor1D = tf.tensor1d(rewards);

    const oneHotActions: tf.Tensor<tf.Rank> = tf.oneHot(actionTensor, 4);
    const scaledRewards: tf.Tensor<tf.Rank> = tf.scalar(1).add(rewardTensor);

    const xs: tf.Tensor2D = observationTensor;
    const ys: tf.Tensor<tf.Rank> = oneHotActions.mul(scaledRewards.expandDims(1));

    await this.model.fit(xs, ys, {
      epochs: 10,
      shuffle: true
    });

    observationTensor.dispose();
    actionTensor.dispose();
    rewardTensor.dispose();
    oneHotActions.dispose();
    scaledRewards.dispose();
    xs.dispose();
    ys.dispose();
  }


}
