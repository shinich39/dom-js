// index.js
var ENTITIES = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&apos;"]
];
function normalizeLineBreakers(str) {
  return str.replace(/\r\n/g, "\n");
}
function normalizeTag(str) {
  return str.replace(/^\</, "").replace(/([^\<][!?/])?\>$/, "").replace(/\s+/g, " ").trim();
}
function isText(node) {
  return node.tag === null;
}
function findLastIndex(arr, func) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (func(arr[i], i, arr)) {
      return i;
    }
  }
  return -1;
}
function encodeFunc(str) {
  return encodeURIComponent(str);
}
function decodeFunc(str) {
  return decodeURIComponent(str);
}
function escapeFunc(str) {
  for (let i = 0; i < ENTITIES.length; i++) {
    str = str.replace(new RegExp(ENTITIES[i][0], "g"), ENTITIES[i][1]);
  }
  return str;
}
function unescapeFunc(str) {
  for (let i = ENTITIES.length - 1; i >= 0; i--) {
    str = str.replace(new RegExp(ENTITIES[i][1], "g"), ENTITIES[i][0]);
  }
  return str;
}
function convertComments(str) {
  return str.replace(/<!--([\s\S]*?)-->/g, function(...args) {
    return `<!-->${encodeFunc(args[1])}</!-->`;
  });
}
function encodeScripts(str) {
  return str.replace(/(<script(?:[\s\S]*?)>)([\s\S]*?)(<\/script>)/g, function(...args) {
    return `${args[1]}${encodeFunc(args[2])}${args[3]}`;
  });
}
function encodeContents(str) {
  return str.replace(/(>)([\s\S]*?)(<)/g, function(...args) {
    return `${args[1]}${escapeFunc(args[2])}${args[3]}`;
  });
}
function encodeAttributes(str) {
  function func(...args) {
    return `=${encodeFunc(args[1])} `;
  }
  return str.replace(/\='([^'>]*?)'/g, func).replace(/\="([^">]*?)"/g, func);
}
function parseTag(str) {
  let arr = normalizeTag(str).split(/\s/);
  let result = {};
  result.tag = arr[0] || "";
  result.closer = null;
  result.content = null;
  result.attributes = {};
  result.children = [];
  result.isClosing = /^\//.test(result.tag);
  result.isClosed = result.isClosing;
  result.tag = result.tag.replace(/^\//, "");
  for (let i = 1; i < arr.length; i++) {
    let [key, value] = arr[i].split("=");
    if (key.length > 0) {
      if (typeof value === "string" && value.length > 0) {
        result.attributes[key] = decodeFunc(value);
      } else {
        result.attributes[key] = true;
      }
    }
  }
  return result;
}
function strToObj(str) {
  str = encodeAttributes(
    encodeContents(
      encodeScripts(
        convertComments(
          normalizeLineBreakers(
            str
          )
        )
      )
    )
  );
  let offset = 0, re = /<[^>]*?>/g, match, result = [], nodes = [], obj;
  while (match = re.exec(str)) {
    let content = str.substring(offset, match.index).trim();
    if (content.length > 0) {
      obj = {
        // isClosed: true,
        // isClosing: false,
        tag: null,
        closer: null,
        content: unescapeFunc(content),
        attributes: {},
        children: []
      };
      result.push(obj);
    }
    obj = parseTag(match[0]);
    if (!obj.isClosing) {
      result.push(obj);
      nodes.push(obj);
    } else {
      let i = findLastIndex(result, function(item) {
        return !item.isClosed && item.tag === obj.tag;
      });
      if (i > -1) {
        result[i].isClosed = true;
        result[i].children = result.splice(i + 1, result.length - i + 1);
        if (["script", "!--"].indexOf(result[i].tag) > -1) {
          for (let j = 0; j < result[i].children.length; j++) {
            if (isText(result[i].children[j])) {
              result[i].children[j].content = decodeFunc(result[i].children[j].content);
            }
          }
        }
      }
    }
    offset = re.lastIndex;
  }
  for (let node of nodes) {
    if (node.tag.toUpperCase() === "!DOCTYPE") {
      node.closer = "";
    } else if (node.tag.toLowerCase() === "?xml") {
      node.closer = "?";
    } else if (node.tag === "!--") {
      node.closer = "--";
    } else if (!node.isClosed) {
      node.closer = " /";
    }
    delete node.isClosed;
    delete node.isClosing;
  }
  return result;
}
function objToAttr(obj) {
  let result = "";
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") {
      result += ` ${k}="${escapeFunc(v)}"`;
    } else if (v === true) {
      result += ` ${k}`;
    }
  }
  return result;
}
function objToStr(obj) {
  const { tag, closer, attributes, content, children } = obj;
  let result = "";
  if (typeof tag === "string") {
    result += `<${tag}`;
    if (typeof attributes === "object") {
      result += objToAttr(attributes);
    }
    if (typeof closer !== "string") {
      result += ">";
    }
    if (Array.isArray(children)) {
      for (const child of children) {
        result += objToStr(child);
      }
    }
    if (typeof closer === "string") {
      result += `${closer}>`;
    } else {
      result += `</${tag}>`;
    }
  } else if (typeof content === "string") {
    result = content;
  }
  return result;
}
export {
  strToObj as toObj,
  objToStr as toStr
};
