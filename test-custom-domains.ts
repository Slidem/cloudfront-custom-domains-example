import * as FormData from "form-data";
import * as dotenv from "dotenv";

import _yargs from "yargs";
import axios from "axios";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { hideBin } from "yargs/helpers";

const yargs = _yargs(hideBin(process.argv));

(async () => {
  dotenv.config();
  const argv = await yargs
    .option("customDomainName", {
      alias: "b",
      type: "string",
      require: true,
      description: "Your distribution's custom domain name",
    })
    .option("uploadContent", {
      alias: "u",
      type: "string",
      require: false,
      description:
        "If present will be considered an upload, and will upload the content to a .txt file with a generated name.",
    })
    .option("fileKey", {
      alias: "k",
      type: "string",
      require: true,
      description:
        "The file key. Should not contains /private /public /upload; these path prefixes will be resolved based on isPublic flag & uploadContent arg",
    })
    .option("isPublic", {
      alias: "p",
      type: "boolean",
      description:
        "If the requested file path is public or not. If public, the cloudfront url will not be signed. Default false",
    }).argv;

  const { customDomainName, uploadContent, fileKey, isPublic } = argv;

  if (uploadContent) {
    await uploadUsingSignedUrl(customDomainName, uploadContent, isPublic);
  } else {
    console.log(getUrl(customDomainName, fileKey, isPublic));
  }
})();

async function uploadUsingSignedUrl(
  customDomain: string,
  uploadcontent: string,
  isPublic: boolean | undefined
) {
  const formData = new FormData();
  const fileKey = `${generateRandomString()}-test.txt`;
  formData.append("file", Buffer.from(uploadcontent, "utf-8"), fileKey);
  let uploadUrl = `https://${customDomain}/upload/`;
  uploadUrl += isPublic ? "public/" : "private/";
  uploadUrl += fileKey;
  uploadUrl = signUrl(uploadUrl);

  console.log(
    `Signed upload url ${uploadUrl}. Uploading ${fileKey} with content [${uploadcontent}]`
  );

  await axios
    .put(uploadUrl, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((response) => {
      console.log("Uploaded file !");
    })
    .catch((error) => {
      console.error(error);
    });

  console.log(`File available at ${getUrl(customDomain, fileKey, isPublic)}`);
}

function getUrl(
  customDomain: string,
  fileKey: string,
  isPublic: boolean | undefined
) {
  if (isPublic) {
    return `https://${customDomain}/public/${fileKey}`;
  } else {
    return signUrl(`https://${customDomain}/private/${fileKey}`);
  }
}

function generateRandomString(): string {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  const randomStringLength = 10;
  for (var i = 0; i < randomStringLength; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function signUrl(url: string) {
  return getSignedUrl({
    dateLessThan: fiveMinutesFromNow(),
    url: url,
    keyPairId: process.env.KEY_PAIR_ID || "",
    privateKey: process.env.PRIVATE_KEY || "",
  });
}

function fiveMinutesFromNow() {
  const now = new Date();
  return new Date(now.getTime() + 5 * 60000).toISOString();
}
