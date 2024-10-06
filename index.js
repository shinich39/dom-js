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
  return str.replace(/^\<|[\s!?/]*\>$/g, "")
            .replace(/\s+/g, " ")
            .trim();
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

function encodeProperties(str) {
  function func(...args) {
    return `=${encodeFunc(args[1])} `;
  }
  return str.replace(/\="([^"]*?)"/g, func)
            .replace(/\='([^']*?)'/g, func)
}

function parseTag(str) {
  let arr = normalizeTag(str).split(/\s/);
  let result = {};
  result.tag =  arr[0] || "";
  result.closer =  null;
  result.attributes =  {};
  result.children =  [];
  result.isClosing = /^\//.test(result.tag);
  result.isClosed = result.isClosing;
  result.tag = result.tag.replace(/^\//, "");

  for (let i = 1; i < arr.length; i++) {
    let [key, value] = arr[i].split("=");
    if (key.length > 0) {
      if (typeof value === "string" && value.length > 0) {
        result.attributes[key] = decodeURIComponent(value);
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
  str = encodeProperties(
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
      result = [],
      nodes = [];

  while(match = re.exec(str)) {
    // Read content
    let content = str.substring(offset, match.index).trim();
    if (content.length > 0) {
      result.push(unescapeFunc(content));
      // result.push(content);
    }

    // Read tag
    let obj = parseTag(match[0]);
    if (!obj.isClosing) {
      // Tag is opening tag
      result.push(obj);
      nodes.push(obj);
    } else {
      // Tag is closing tag
      // Add children to tag
      let i = findLastIndex(result, function(item) {
        return !item.isClosed && item.tag === obj.tag;
      });

      if (i > -1) {
        result[i].isClosed = true;
        result[i].children = result.splice(i+1, result.length-i+1);

        // Decode contents of the scripts and comments
        if (["script", "!--"].indexOf(result[i].tag) > -1) {
          for (let j = 0; j < result[i].children.length; j++) {
            if (typeof result[i].children[j] === "string") {
              result[i].children[j] = decodeURIComponent(result[i].children[j]);
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

    // Remove unused properties
    delete node.isClosed;
    delete node.isClosing;
  }

  return result;
}

function objToAttr(obj) {
  let result = "";
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") {
      result += ` ${k}="${v}"`;
    } else if (v === true) {
      result += ` ${k}`;
    }
  }
  return result;
}

function objToStr(obj) {
  if (typeof obj === "string") {
    return obj;
  }
  const { tag, closer, attributes, children } = obj;
  let result = `<${tag}${objToAttr(attributes || {})}`;

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

  return result;
}

export {
  objToStr as toStr,
  strToObj as toObj,
};
