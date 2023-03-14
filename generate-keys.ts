import { addToEnvFile } from "./util";
import keyPair from "node-genrsa";

(async () => {
  const keys = await keyPair({
    bits: 2048,
    exponent: 65537,
  });
  const publicKey = keys.public.replace(/\n/g, "\\n");
  const privateKey = keys.private.replace(/\n/g, "\\n");
  await addToEnvFile("PUBLIC_KEY", publicKey);
  await addToEnvFile("PRIVATE_KEY", privateKey);
  process.exit(0);
})();
