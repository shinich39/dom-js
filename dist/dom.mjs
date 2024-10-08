// index.js
var HTML_ENTITIES = [
  ["&", "&amp;"],
  [" ", "&nbsp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&apos;"],
  ["\xA2", "&cent;"],
  ["\xA3", "&pound;"],
  ["\xA5", "&yen;"],
  ["\u20AC", "&euro;"],
  ["\xA9", "&copy;"],
  ["\xAE", "&reg;"]
];
var ATTR_ENTITIES = [
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
function encodeStr(str) {
  return encodeURIComponent(str);
}
function decodeStr(str) {
  return decodeURIComponent(str);
}
function escapeStr(str) {
  for (let i = 0; i < HTML_ENTITIES.length; i++) {
    str = str.replace(new RegExp(HTML_ENTITIES[i][0], "g"), HTML_ENTITIES[i][1]);
  }
  return str;
}
function unescapeStr(str) {
  for (let i = HTML_ENTITIES.length - 1; i >= 0; i--) {
    str = str.replace(new RegExp(HTML_ENTITIES[i][1], "g"), HTML_ENTITIES[i][0]);
  }
  return str;
}
function escapeAttr(str) {
  for (let i = 0; i < ATTR_ENTITIES.length; i++) {
    str = str.replace(new RegExp(ATTR_ENTITIES[i][0], "g"), ATTR_ENTITIES[i][1]);
  }
  return str;
}
function convertComments(str) {
  return str.replace(/<!--([\s\S]*?)-->/g, function(...args) {
    return `<!-->${encodeStr(args[1])}</!-->`;
  });
}
function encodeScripts(str) {
  return str.replace(/(<script(?:[\s\S]*?)>)([\s\S]*?)(<\/script>)/g, function(...args) {
    return `${args[1]}${encodeStr(args[2])}${args[3]}`;
  });
}
function encodeContents(str) {
  return str.replace(/(>)([\s\S]*?)(<)/g, function(...args) {
    return `${args[1]}${escapeStr(args[2])}${args[3]}`;
  });
}
function encodeAttributes(str) {
  function func(...args) {
    return `=${encodeStr(args[1])} `;
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
        result.attributes[key] = decodeStr(value);
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
  let offset = 0, re = /<[^>]*?>/g, match, children = [], nodes = [], obj;
  while (match = re.exec(str)) {
    let content = str.substring(offset, match.index).trim();
    if (content.length > 0) {
      obj = {
        // isClosed: true,
        // isClosing: false,
        tag: null,
        closer: null,
        content: unescapeStr(content),
        attributes: {},
        children: []
      };
      children.push(obj);
    }
    obj = parseTag(match[0]);
    if (!obj.isClosing) {
      children.push(obj);
      nodes.push(obj);
    } else {
      let i = findLastIndex(children, function(item) {
        return !item.isClosed && item.tag === obj.tag;
      });
      if (i > -1) {
        children[i].isClosed = true;
        children[i].children = children.splice(i + 1, children.length - i + 1);
        if (["script", "!--"].indexOf(children[i].tag) > -1) {
          for (let j = 0; j < children[i].children.length; j++) {
            if (isText(children[i].children[j])) {
              children[i].children[j].content = decodeStr(children[i].children[j].content);
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
  return {
    tag: null,
    closer: null,
    content: null,
    attributes: {},
    children
  };
}
function objToAttr(obj) {
  let result = "";
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") {
      result += ` ${k}="${escapeAttr(v)}"`;
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
  } else {
    if (Array.isArray(children)) {
      for (const child of children) {
        result += objToStr(child);
      }
    }
  }
  return result;
}
export {
  strToObj as toObj,
  objToStr as toStr
};
