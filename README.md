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
// [
//   {
//     tag: '!DOCTYPE',
//     closer: '',
//     content: null,
//     attributes: { html: true },
//     children: []
//   },
//   {
//     tag: 'html',
//     closer: null,
//     content: null,
//     attributes: {},
//     children: [ [Object], [Object] ]
//   }
// ]

const str = toStr(obj);
// <!DOCTYPE html><html><head><meta charset="utf-8" /><title>index.html</title></head><body>TEXT<p>BODY</p></body></html>
```

## References

- [esbuild](https://esbuild.github.io/)
- [prettier](https://prettier.io/docs/en/)
