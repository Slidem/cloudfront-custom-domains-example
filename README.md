# Serving & uploading public and private content from s3 using a single custom domain in a secure manner

Suppose you have a web application that stores static content on S3. This content is publicly accessible to anyone on the internet. However, certain content that is specific to users should only be accessible to a select few authorized users.

As an additional security measure, only authorized users should be able to upload public content, even though it is accessible to anyone.

## Solution

To achieve our desired outcome and satisfy the use case mentioned above, we can use AWS CloudFront with custom domains. Here's a brief summary of what this examples consists of

- First, we need an S3 bucket.
- Next, we create a CloudFront distribution that points to the S3 bucket as the origin.
- Then, we need to create a CloudFront Origin Access Identity (OAI) and modify the S3 bucket policy to allow access only from the OAI.
- Because we're using CloudFront together with signed URLs for both GET and PUT requests, we need to:
  - Store public content under the /public key inside the S3 bucket.
  - Store private content under the /private key inside the S3 bucket.
  - Create separate CloudFront behaviors for the /private and /public paths.
    - For /public paths, don't restrict viewer access, and only allow GET methods.
    - For /private paths, restrict viewer access by only allowing CloudFront signed URLs with GET methods.
  - Create a separate CloudFront behavior for the /upload path and:
    - Restrict viewer access by only allowing signed URLs to access /upload.
    - Create a Cloudfront function for this behavior for "Origin request," which will remove the /upload from the S3 key path, so that uploads will go to either /private or /public.
  - Create a CloudFront signer key group for signed URLs.
- Finally, create ACM certificates for our custom domains and create CNAME records to point to them.

![diagram](S3%20custom%20domains.png)
