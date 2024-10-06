import { toObj, toStr } from "../index.js";
import fs from "node:fs";
import path from "node:path";
import beautify from "js-beautify";

function beautifyHTML(str) {
  return beautify.html(str, {
    indent_size: 2,
  });
}

// const html = fs.readFileSync("./test/index.html", "utf-8");

// const obj = toObj(html);

// const str = beautifyHTML(obj.map(item => toStr(item)).join(""));

// fs.writeFileSync("./test/output.html", str, "utf-8");

const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>index.html</title>
  </head>
  <body>
    TEXT
    <p>BODY</p>
  </body>
</html>`;

const obj = toObj(html);
// console.log(obj);
console.log(obj[1].children);

const str = obj.map(item => toStr(item)).join("");
console.log(str);
