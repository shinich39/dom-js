"use strict";

// XML entities
// https://www.w3schools.com/xml/xml_syntax.asp
// const XML_ENTITIES = {
//   "<": "$lt;",
//   ">": "$gt;",
//   "&": "$amp;",
//   "\'": "$apos;",
//   '\"': "$quot;",
// }

// HTML entities
// https://www.w3schools.com/html/html_entities.asp
// const HTML_ENTITIES = {
//   " ": "&nbsp;",
//   "<": "&lt;",
//   ">": "&gt;",
//   "&": "&amp;",
//   '\"': "&quot;",
//   "\'": "&apos;",
//   "¢": "&cent;",
//   "£": "&pound;",
//   "¥": "&yen;",
//   "€": "&euro;",
//   "©": "&copy;",
//   "®": "&reg;",
// }

const ENTITIES = [
  ["&", "&amp;"],
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

function escapeQuotes(str) {
  return str.replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
}

function convertComments(str) {
  return str.replace(/<!--([\s\S]*?)-->/g, function(...args) {
    return `<!-->${encodeFunc(args[1])}</!-->`;
  });
}

function encodeComments(str) {
  return str.replace(/(<!--)([\s\S]*?)(-->)/g, function(...args) {
    return `${args[1]}${encodeFunc(args[2])}${args[3]}`;
  });
}

function decodeComments(str) {
  return str.replace(/(<!--)([\s\S]*?)(-->)/g, function(...args) {
    return `${args[1]}${decodeFunc(args[2])}${args[3]}`;
  });
}

function encodeScripts(str) {
  return str.replace(/(<script(?:[\s\S]*?)>)([\s\S]*?)(<\/script>)/g, function(...args) {
    return `${args[1]}${encodeFunc(args[2])}${args[3]}`;
  });
}

function decodeScripts(str) {
  return str.replace(/(<script(?:[\s\S]*?)>)([\s\S]*?)(<\/script>)/g, function(...args) {
    return `${args[1]}${decodeFunc(args[2])}${args[3]}`;
  });
}

function encodeContents(str) {
  return str.replace(/(>)([\s\S]*?)(<)/g, function(...args) {
    return `${args[1]}${escapeFunc(args[2])}${args[3]}`;
  });
}

function decodeContents(str) {
  return str.replace(/(>)([\s\S]*?)(<)/g, function(...args) {
    return `${args[1]}${unescapeFunc(args[2])}${args[3]}`;
  });
}

function encodeAttributes(str) {
  function func(...args) {
    return `=${encodeFunc(args[1])} `;
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
        result.attributes[key] = decodeFunc(value);
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
      // children.push(unescapeFunc(content));

      obj = {
        // isClosed: true,
        // isClosing: false,
        tag: null,
        closer: null,
        content: unescapeFunc(content),
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
              children[i].children[j].content = decodeFunc(children[i].children[j].content);
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
