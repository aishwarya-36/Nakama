// Next's `output: "standalone"` build doesn't copy static assets into the
// standalone folder itself (see Next.js docs on standalone deployment) —
// this does that, so electron/main.js can run .next/standalone/server.js
// as a fully self-contained app.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
fs.cpSync(path.join(root, ".next/static"), path.join(root, ".next/standalone/.next/static"), {
  recursive: true,
});
if (fs.existsSync(path.join(root, "public"))) {
  fs.cpSync(path.join(root, "public"), path.join(root, ".next/standalone/public"), {
    recursive: true,
  });
}
console.log("Copied .next/static and public/ into .next/standalone");
