"use strict";

// XML entities
// https://www.w3schools.com/xml/xml_syntax.asp
const XML_ENTITIES = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['\"', "&quot;"],
  ["\'", "&apos;"],
];

// HTML entities
// https://www.w3schools.com/html/html_entities.asp
const HTML_ENTITIES = [
  ["&", "&amp;"],
  [" ", "&nbsp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['\"', "&quot;"],
  ["\'", "&apos;"],
  ["¢", "&cent;"],
  ["£", "&pound;"],
  ["¥", "&yen;"],
  ["€", "&euro;"],
  ["©", "&copy;"],
  ["®", "&reg;"],
];

const ATTR_ENTITIES = [
  ["<", "&lt;"],
  [">", "&gt;"],
  ['\"', "&quot;"],
  ["\'", "&apos;"],
];

function normalizeLineBreakers(str) {
  return str.replace(/\r\n/g, "\n");
}

function normalizeTag(str) {
  return str.replace(/^\</, "")
            .replace(/([^\<][!?/])?\>$/, "")
            .replace(/\s+/g, " ")
            .trim();
}

function isText(node) {
  return node.tag === null;
}

function isNode(node) {
  return typeof node.tag === "string";
}

function findLast(arr, func) {
  for (let i = arr.length - 1; i >= 0; i --) {
    if (func(arr[i], i, arr)) {
      return arr[i];
    }
  }
}

function findLastIndex(arr, func) {
  for (let i = arr.length - 1; i >= 0; i --) {
    if (func(arr[i], i, arr)) {
      return i;
    }
  }
  return -1;
}

function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
    return "%" + c.charCodeAt(0).toString(16);
  });
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

function unescapeAttr(str) {
  for (let i = ATTR_ENTITIES.length - 1; i >= 0; i--) {
    str = str.replace(new RegExp(ATTR_ENTITIES[i][1], "g"), ATTR_ENTITIES[i][0]);
  }
  return str;
}

function escapeQuotes(str) {
  return str.replace(/"/g, "&quot;");
}

function escapeApostrophe(str) {
  return str.replace(/'/g, "&apos;");
}

function convertComments(str) {
  return str.replace(/<!--([\s\S]*?)-->/g, function(...args) {
    return `<!-->${encodeStr(args[1])}</!-->`;
  });
}

function encodeComments(str) {
  return str.replace(/(<!--)([\s\S]*?)(-->)/g, function(...args) {
    return `${args[1]}${encodeStr(args[2])}${args[3]}`;
  });
}

function decodeComments(str) {
  return str.replace(/(<!--)([\s\S]*?)(-->)/g, function(...args) {
    return `${args[1]}${decodeStr(args[2])}${args[3]}`;
  });
}

function encodeScripts(str) {
  return str.replace(/(<script(?:[\s\S]*?)>)([\s\S]*?)(<\/script>)/g, function(...args) {
    return `${args[1]}${encodeStr(args[2])}${args[3]}`;
  });
}

function decodeScripts(str) {
  return str.replace(/(<script(?:[\s\S]*?)>)([\s\S]*?)(<\/script>)/g, function(...args) {
    return `${args[1]}${decodeStr(args[2])}${args[3]}`;
  });
}

function encodeContents(str) {
  return str.replace(/(>)([\s\S]*?)(<)/g, function(...args) {
    return `${args[1]}${escapeStr(args[2])}${args[3]}`;
  });
}

function decodeContents(str) {
  return str.replace(/(>)([\s\S]*?)(<)/g, function(...args) {
    return `${args[1]}${unescapeStr(args[2])}${args[3]}`;
  });
}

function encodeAttributes(str) {
  function func(...args) {
    return `=${encodeStr(args[1])} `;
  }
  return str.replace(/\='([^'>]*?)'/g, func)
            .replace(/\="([^">]*?)"/g, func)
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
        // Escape quotation marks in attribute value
        result.attributes[key] = decodeStr(value);
      } else {
        // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes
        // The values "true" and "false" are not allowed on boolean attributes. To represent a false value, the attribute has to be omitted altogether.
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

  let offset = 0,
      re = /<[^>]*?>/g,
      match,
      children = [],
      nodes = [],
      obj;

  while(match = re.exec(str)) {
    // Read content
    let content = str.substring(offset, match.index).trim();
    if (content.length > 0) {
      // Deprecated: Convert to node
      // children.push(unescapeStr(content));

      obj = {
        // isClosed: true,
        // isClosing: false,
        tag: null,
        closer: null,
        content: unescapeStr(content),
        attributes: {},
        children: [],
      }

      children.push(obj);
    }

    // Read tag
    obj = parseTag(match[0]);
    if (!obj.isClosing) {
      // Tag is opening tag
      children.push(obj);
      nodes.push(obj);
    } else {
      // Tag is closing tag
      // Add children to tag
      let i = findLastIndex(children, function(item) {
        return !item.isClosed && item.tag === obj.tag;
      });

      if (i > -1) {
        children[i].isClosed = true;
        children[i].children = children.splice(i+1, children.length-i+1);

        // Decode contents of the scripts and comments
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
      // HTML doctype declaration
      // https://www.w3schools.com/tags/tag_doctype.ASP
      node.closer = "";
    } else if (node.tag.toLowerCase() === "?xml") {
      // XML Prolog
      // <?xml version="1.0" encoding="utf-8"?>
      // https://www.w3schools.com/xml/xml_syntax.asp
      node.closer = "?";
    } else if (node.tag === "!--") {
      // Comment
      // https://www.w3schools.com/tags/tag_comment.asp
      node.closer = "--";
    } else if (!node.isClosed) {
      // Self-closing tag, Empty tag
      // Requirements for XHTML
      node.closer = " /";
    }

    // Remove unused attributes
    delete node.isClosed;
    delete node.isClosing;
  }

  return {
    tag: null,
    closer: null,
    content: null,
    attributes: {},
    children: children,
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
  
  // Node
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
  } // TextContent
  else if (typeof content === "string") {
    result = content;
  } // Root Node
  else {
    if (Array.isArray(children)) {
      for (const child of children) {
        result += objToStr(child);
      }
    }
  }
  
  return result;
}

export {
  objToStr as toStr,
  strToObj as toObj,
};
