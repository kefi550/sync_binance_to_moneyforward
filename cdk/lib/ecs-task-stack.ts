import * as cdk from 'aws-cdk-lib';
import * as applicationautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface SyncBinanceToMoneyforwardEcsStackParams extends cdk.StackProps {
  readonly taskName: string;
  readonly vpcStackName: string;
  readonly ecsClusterName: string;
  readonly ecrRepositoryName: string;
  readonly ecrImageTag: string;
  readonly mountEfsFileSystemId?: string;
  readonly secretName?: string;
  readonly cpu?: number;
  readonly memoryLimitMiB?: number;
}

export class SyncBinanceToMoneyforwardTaskStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SyncBinanceToMoneyforwardEcsStackParams) {
    super(scope, id, props);

    const taskName = props.taskName;
    const vpcStackName = props.vpcStackName;
    const ecsClusterName = props.ecsClusterName;
    const ecrRepositoryName = props.ecrRepositoryName;
    const ecrImageTag = props.ecrImageTag;
    const mountEfsFileSystemId = props.mountEfsFileSystemId ??  ssm.StringParameter.valueForStringParameter(this, '/cdk/SyncBinanceToMoneyforwardTaskStack/mountEfsFileSystemId');
    const secretName = props.secretName ?? `/ecs/${taskName}`;
    const cpu = props.cpu ?? 256;
    const memoryLimitMiB = props.memoryLimitMiB ?? 512;

    const efsMountPath = `/mnt/efs/${taskName}`;

    const syncBinanceToMoneyforwardLogGroup = new logs.LogGroup(this, `${taskName}LogGroup`, {
      logGroupName: `/ecs/${taskName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const syncBinanceToMoneyforwardVolume: ecs.Volume = {
      name: `${taskName}Volume`,
      efsVolumeConfiguration: {
        fileSystemId: mountEfsFileSystemId,
        rootDirectory: '/',
      },
    };
    const syncBinanceToMoneyforwardTaskDefinition = new ecs.FargateTaskDefinition(this, `${taskName}TaskDefinition`, {
      cpu: cpu,
      memoryLimitMiB: memoryLimitMiB,
      volumes: [syncBinanceToMoneyforwardVolume],
    });
    const syncBinanceToMoneyforwardContainer = syncBinanceToMoneyforwardTaskDefinition.addContainer(`${taskName}Container`, {
      image: ecs.ContainerImage.fromEcrRepository(
        ecr.Repository.fromRepositoryName(this, `${taskName}EcrRepository`, ecrRepositoryName),
        ecrImageTag,
      ),
      secrets: {
        'MONEYFORWARD_USER': ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, `${taskName}MoneyforwardUser`, secretName),
          'MONEYFORWARD_USER',
        ),
        'MONEYFORWARD_PASSWORD': ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, `${taskName}MoneyforwardPassword`, secretName),
          'MONEYFORWARD_PASSWORD',
        ),
        'BINANCE_API_KEY': ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, `${taskName}BinanceApiKey`, secretName),
          'BINANCE_API_KEY',
        ),
        'BINANCE_API_SECRET': ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, `${taskName}BinanceApiSecret`, secretName),
          'BINANCE_API_SECRET',
        ),
      },
      environment: {
        'CHROME_PROFILE_PATH': efsMountPath,
      },
      essential: true,
      logging: new ecs.AwsLogDriver({
        streamPrefix: taskName,
        logGroup: syncBinanceToMoneyforwardLogGroup,
      }),
    });
    const mountPoint: ecs.MountPoint = {
      containerPath: efsMountPath,
      readOnly: false,
      sourceVolume: syncBinanceToMoneyforwardVolume.name,
    };
    syncBinanceToMoneyforwardContainer.addMountPoints(mountPoint);

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: cdk.Fn.importValue(`${vpcStackName}::VpcId`),
      availabilityZones: cdk.Fn.split(',', cdk.Fn.importValue(`${vpcStackName}::VpcAzs`)),
      publicSubnetIds: cdk.Fn.split(',', cdk.Fn.importValue(`${vpcStackName}::VpcPublicSubnetIds`)),
    });
    const vpcInternalSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'VpcInternalSg', cdk.Fn.importValue(`${vpcStackName}::VpcInternalSg`));
    const ecsCluster = ecs.Cluster.fromClusterAttributes(this, 'EcsCluster', {
      vpc: vpc,
      clusterName: ecsClusterName,
      securityGroups: [vpcInternalSg],
    });

    const syncBinanceToMoneyforwardTask = new ecs_patterns.ScheduledFargateTask(this, `${taskName}Task`, {
      schedule: applicationautoscaling.Schedule.cron({
        // JST 23:00
        hour: '14',
        minute: '0',
      }),
      cluster: ecsCluster,
      cpu: cpu,
      enabled: true,
      memoryLimitMiB: memoryLimitMiB,
      securityGroups: [vpcInternalSg],
      scheduledFargateTaskDefinitionOptions: {
        taskDefinition: syncBinanceToMoneyforwardTaskDefinition,
      },
      taskDefinition: syncBinanceToMoneyforwardTaskDefinition,
      subnetSelection: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      vpc: vpc,
    });
  }
}
