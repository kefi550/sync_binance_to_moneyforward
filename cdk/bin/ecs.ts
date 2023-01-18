#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcsClusterStack,} from '../lib/ecs-stack';
import { SyncBinanceToMoneyforwardTaskStack } from '../lib/ecs-task-stack';

const app = new cdk.App();

const vpcStackName = 'vpc';
const ecsClusterStack =  new EcsClusterStack(app, 'EcsClusterStack', {
  vpcStackName: vpcStackName,
  ecsClusterName: 'kefi-cluster',
});

new SyncBinanceToMoneyforwardTaskStack(app, 'SyncBinanceToMoneyforwardTaskStack', {
  taskName: 'SyncBinanceToMoneyforward',
  vpcStackName: vpcStackName,
  ecsClusterName: ecsClusterStack.ecsClusterName,
  ecrRepositoryName: 'sync_binance_to_moneyforward',
  ecrImageTag: '0.1.3',
});
