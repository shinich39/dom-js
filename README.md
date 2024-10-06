# dom-js

The parser of document object model\(DOM\) with javascript.

## Usage

```js
import { toStr, toObj } from "./dist/dom.mjs";

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
// [
//   {
//     tag: '!doctype',
//     closer: '',
//     attributes: { html: true },
//     children: []
//   },
//   {
//     tag: 'html',
//     closer: null,
//     attributes: {},
//     children: [ [Object], [Object] ]
//   }
// ]

// console.log(obj[1].children);
// [
//   {
//     tag: 'head',
//     closer: null,
//     attributes: {},
//     children: [ [Object], [Object], [Object] ]
//   },
//   {
//     tag: 'body',
//     closer: null,
//     attributes: {},
//     children: [ 'TEXT', [Object] ]
//   }
// ]

const str = toStr(obj);
// <!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>index.html</title></head><body><p>BODY</p></body></html>
```

## References

- [esbuild](https://esbuild.github.io/)
- [prettier](https://prettier.io/docs/en/)
