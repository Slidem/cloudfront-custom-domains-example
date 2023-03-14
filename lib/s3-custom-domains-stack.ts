import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

import { Construct } from "constructs";
import { FunctionEventType } from "aws-cdk-lib/aws-cloudfront";

const dotenv = require("dotenv");

const CUSTOM_DOMAIN = "your.customdomain.com"; // replace with your custom domain

export class S3CustomDomainsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    dotenv.config();
    /**
     * Our test bucket
     */
    const bucket = new s3.Bucket(this, `example-bucket`, {
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      bucketName: `example-bucket-jjfkas77dld`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    /**
     * Create oai
     */
    const oai = new cloudfront.OriginAccessIdentity(this, `example-oai`, {
      comment: "Distribution oai",
    });

    /**
     * Add bucket policy to allow access to the bucket only through the oai
     */
    const oaiPolicy = new iam.PolicyStatement();
    oaiPolicy.addActions(
      "s3:GetBucket*",
      "s3:GetObject*",
      "s3:List*",
      "s3:PutObject*"
    );
    oaiPolicy.addResources(bucket.bucketArn, `${bucket.bucketArn}/*`);
    oaiPolicy.addCanonicalUserPrincipal(
      oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
    );
    bucket.addToResourcePolicy(oaiPolicy);

    /**
     * Create the cloudfront function used to rewrite /upload/.* urls to /.*
     */
    const viewerRequestFunction = new cloudfront.Function(
      this,
      `example-origin-request-function`,
      {
        code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          request.uri = request.uri.replace(/^\/upload\//, "/");
          return request;
        }
      `),
        functionName: `example-origin-request-function`,
      }
    );

    /**
     * Create the ACM for the origin custom domain
     */
    const certificate = new acm.Certificate(this, `example-certificate`, {
      domainName: "example.customdomain.com",
      validation: acm.CertificateValidation.fromDns(),
    });

    /**
     * Create aws cloudfront signing keys use to sign cloudfront urls
     * Will be used for private content and uploads
     */
    const publicKey = new cloudfront.PublicKey(
      this,
      `example-cloudfront-public-key`,
      {
        encodedKey: `${process.env.PUBLIC_KEY}`,
      }
    );

    const keyGroup = new cloudfront.KeyGroup(
      this,
      `example-cloudfront-signing-group`,
      {
        items: [publicKey],
      }
    );

    /**
     * Finally, create the cloudfront distribution
     */
    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      `example-distribution`,
      {
        viewerCertificate: {
          aliases: [CUSTOM_DOMAIN],
          props: {
            acmCertificateArn: certificate.certificateArn,
            sslSupportMethod: "sni-only",
            minimumProtocolVersion: "TLSv1.1_2016",
          },
        },
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: bucket,
              originAccessIdentity: oai,
            },
            behaviors: [
              {
                pathPattern: "/public/*",
                allowedMethods:
                  cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
              },
              {
                pathPattern: "/private/*",
                allowedMethods:
                  cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
                trustedKeyGroups: [keyGroup],
              },
              {
                pathPattern: "/upload/public/*",
                allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                trustedKeyGroups: [keyGroup],
                functionAssociations: [
                  {
                    function: viewerRequestFunction,
                    eventType: FunctionEventType.VIEWER_REQUEST,
                  },
                ],
              },
              {
                pathPattern: "/upload/private/*",
                allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                trustedKeyGroups: [keyGroup],
                functionAssociations: [
                  {
                    function: viewerRequestFunction,
                    eventType: FunctionEventType.VIEWER_REQUEST,
                  },
                ],
              },
              {
                isDefaultBehavior: true,
                trustedKeyGroups: [keyGroup],
                allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD,
              },
            ],
          },
        ],
      }
    );

    new cdk.CfnOutput(this, "KEY_PAIR_ID", { value: publicKey.publicKeyId });
  }
}
