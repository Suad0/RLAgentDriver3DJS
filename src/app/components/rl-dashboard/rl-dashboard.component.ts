import {Component, OnInit, OnDestroy} from '@angular/core';
import {RLQLearningService, TrainingMetrics} from '../../services/rlqlearning.service';
import {Subscription} from 'rxjs';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-rl-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rl-dashboard">
      <h2>Reinforcement Learning Dashboard</h2>

      <div class="metrics-container">
        <div class="metric-card">
          <h3>Current Training Metrics</h3>
          <table *ngIf="latestMetrics">
            <tr>
              <td>Episode:</td>
              <td>{{ latestMetrics.episodeNumber }}</td>
            </tr>
            <tr>
              <td>Total Reward:</td>
              <td>{{ latestMetrics.totalReward | number:'1.2-2' }}</td>
            </tr>
            <tr>
              <td>Avg Reward:</td>
              <td>{{ latestMetrics.averageReward | number:'1.2-2' }}</td>
            </tr>
            <tr>
              <td>Exploration Rate:</td>
              <td>{{ latestMetrics.explorationRate | number:'1.3-3' }}</td>
            </tr>
            <tr>
              <td>Training Loss:</td>
              <td>{{ latestMetrics.loss | number:'1.4-4' }}</td>
            </tr>
          </table>
        </div>

        <div class="action-distribution">
          <h3>Action Distribution</h3>
          <div *ngIf="latestMetrics" class="distribution-bars">
            <div
              *ngFor="let dist of latestMetrics.actionDistribution; let i = index"
              class="distribution-bar"
              [style.width.%]="dist * 100"
            >
              Action {{ i }}: {{ (dist * 100) | number:'1.1-1' }}%
            </div>
          </div>
        </div>
      </div>

      <div class="training-controls">
        <button (click)="rlService.saveModel()">Save Model</button>
        <button (click)="resetLearning()">Reset Learning</button>
        <button (click)="startTraining()">Start Training</button>
      </div>

      <div class="training-report">
        <h3>Training Report</h3>
        <pre>{{ trainingReport }}</pre>
      </div>

      <div class="training-log">
        <h3>Training Logs</h3>
        <div class="log-container">
          <div *ngFor="let log of trainingLogs" class="log-entry">
            {{ log }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rl-dashboard {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }

    .metrics-container {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }

    .metric-card, .action-distribution {
      background-color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      flex: 1;
    }

    .distribution-bars {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .distribution-bar {
      background-color: #4CAF50;
      height: 20px;
      transition: width 0.3s ease;
    }

    .training-controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .training-log, .training-report {
      margin-top: 20px;
      max-height: 200px;
      overflow-y: auto;
      background-color: white;
      padding: 15px;
      border-radius: 8px;
    }

    .log-entry {
      padding: 5px;
      border-bottom: 1px solid #eee;
    }
  `]
})
export class RLDashboardComponent implements OnInit, OnDestroy {

  latestMetrics: TrainingMetrics | null = null;
  trainingLogs: string[] = [];
  trainingReport: string = '';

  private metricsSub: Subscription | any;
  private loggerSub: Subscription | any;

  constructor(protected rlService: RLQLearningService) {
  }

  ngOnInit() {
    this.metricsSub = this.rlService.metricsLogger.subscribe(metrics => {
      if (metrics) {
        this.latestMetrics = metrics;
        this.trainingReport = this.rlService.generateTrainingReport();
      }
    });

    this.loggerSub = this.rlService.logger.subscribe(log => {
      this.trainingLogs.unshift(log);
      this.trainingLogs = this.trainingLogs.slice(0, 50);
    });
  }

  ngOnDestroy() {
    this.metricsSub?.unsubscribe();
    this.loggerSub?.unsubscribe();
  }

  saveModel() {
    this.rlService.saveModel();
  }

  resetLearning() {
    this.rlService.resetLearning();
  }

  startTraining() {
    this.rlService.trainModelWithEarlyStopping().then(() => {
      this.loggerSub = this.rlService.logger.subscribe(log => {
        this.trainingLogs.unshift(log);
        this.trainingLogs = this.trainingLogs.slice(0, 50);
      });
    });
  }
}
