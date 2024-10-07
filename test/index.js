import { toObj, toStr } from "../index.js";
import fs from "node:fs";
import path from "node:path";
import beautify from "js-beautify";

function beautifyHTML(str) {
  return beautify.html(str, {
    indent_size: 2,
  });
}

const html = fs.readFileSync("./test/index.html", "utf-8");

const obj = toObj(html);

fs.writeFileSync("./test/to-obj.json", JSON.stringify(obj, null, 2), "utf-8");

const str = beautifyHTML(obj.map(item => toStr(item)).join(""));

fs.writeFileSync("./test/to-str.html", str, "utf-8");

// const html = `
// <!DOCTYPE html>
// <html>
//   <head>
//     <meta charset="utf-8" />
//     <title>index.html</title>
//   </head>
//   <body>
//     TEXT
//     <p>BODY</p>
//   </body>
// </html>`;

// const obj = toObj(html);
// console.log(obj);
// // console.log(obj[1].children[1]);

// const str = obj.map(item => toStr(item)).join("");
// console.log(str);
