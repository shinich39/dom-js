# dom-js

The parser of document object model\(DOM\) with javascript.

## Usage

```js
import { toStr, toObj } from "./dist/dom.mjs";

const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>index.html</title>
  </head>
  <body>
    TEXT
    <p>BODY</p>
  </body>
</html>`;

const obj = toObj(html);
// {
//   tag: null,
//   closer: null,
//   content: null,
//   attributes: {},
//   children: [
//     {
//       tag: '!DOCTYPE',
//       closer: '',
//       content: null,
//       attributes: [Object],
//       children: []
//     },
//     {
//       tag: 'html',
//       closer: null,
//       content: null,
//       attributes: {},
//       children: [Array]
//     }
//   ]
// }

const str = toStr(obj);
// <!DOCTYPE html><html><head><meta charset="utf-8" /><title>index.html</title></head><body>TEXT<p>BODY</p></body></html>
```

## References

- [esbuild](https://esbuild.github.io/)
- [prettier](https://prettier.io/docs/en/)
