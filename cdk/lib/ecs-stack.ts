import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export interface EcsClusterStackProps extends cdk.StackProps {
  readonly vpcStackName: string;
  readonly ecsClusterName?: string;
}

export class EcsClusterStack extends cdk.Stack {
  readonly ecsClusterName: string;

  constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: cdk.Fn.importValue(`${props.vpcStackName}::VpcId`),
      availabilityZones: cdk.Fn.importValue(`${props.vpcStackName}::VpcAzs`).split(','),
      publicSubnetIds: cdk.Fn.importValue(`${props.vpcStackName}::VpcPublicSubnetIds`).split(','),
    });

    const ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc: vpc,
      clusterName: props.ecsClusterName,
    });
    this.ecsClusterName = ecsCluster.clusterName;
  }
}
