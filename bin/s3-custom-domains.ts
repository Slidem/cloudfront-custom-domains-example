#!/usr/bin/env node

import "source-map-support/register";

import * as cdk from "aws-cdk-lib";

import { S3CustomDomainsStack } from "../lib/s3-custom-domains-stack";

const app = new cdk.App();

new S3CustomDomainsStack(app, "S3CustomDomainsStack", {
  env: {
    region: "us-east-1",
    account: "000000000000", // your account goes here
  },
});
