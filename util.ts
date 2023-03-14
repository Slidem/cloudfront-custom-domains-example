import * as fs from "fs";

export async function addToEnvFile(key: string, value: string) {
  await createEnvFileIfNotExists();
  return new Promise((resolve, reject) => {
    fs.readFile(".env", "utf-8", (readErr, contents) => {
      if (readErr) {
        return reject(readErr);
      }

      const alreadyExistingValue = new RegExp(`${key} *=.+`, "gi");

      if (contents.match(alreadyExistingValue)) {
        console.info(`Value ${key} already exists... not adding`);
        resolve("Env var skipped");
        return;
      }

      const contentWithNewValue = contents + `${key}="${value}"\n`;
      fs.writeFile(".env", contentWithNewValue, "utf-8", (writeError) => {
        if (writeError) {
          reject(writeError);
        } else {
          resolve("Env var added !");
        }
      });
    });
  });
}

async function createEnvFileIfNotExists() {
  await fs.promises
    .readFile(".env")
    .catch(() => fs.promises.writeFile(".env", ""));
}
