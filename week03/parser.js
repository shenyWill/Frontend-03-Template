const css = require("css");

const EOF = Symbol("EOF");

let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;

let stack = [
    {
        type: "document",
        children: []
    }
];

let rules = [];
function addCSSRules(text) {
    var ast = css.parse(text);
    rules.push(...ast.stylesheet.rules);
}

function match(selector, element) {
    if (!element.attributes || !selector) {
        return false;
    }
    const compoundSelectorRegex = /\w+((\.\w+))*(\#\w+)|\w+((\.\w+))+(\#\w+)?|(\.\w+){2,}|(\.\w+)+(\#\w+)/;
    if (selector.match(compoundSelectorRegex)) {
        const tagnameSelectorRegex = /^(\w+)[\.|\#]*/;
        let tagNameMatches = selector.match(tagnameSelectorRegex);
        if (tagNameMatches) {
            let tagNameSelector = tagNameMatches[1];
            if (element.tagName !== tagNameSelector) {
                return false;
            }
        }

        const classSelectorRegex = /(\.\w+)/g;
        let classMatchResult = selector.match(classSelectorRegex);
        if (classMatchResult) {
            let classSelectors = classMatchResult.map(item => item.replace(".", ""));
            let elementClasses = element
                .attributes
                .filter(item => item.name === "class")
                .map(item => item.value);
            for (let classSelector of classSelectors) {
                if (elementClasses.indexOf(classSelector) === -1) {
                    return false;
                }
            }
        }

        const idSelectorRegex = /(\#\w+)/;
        let idMatchResult = selector.match(idSelectorRegex);
        if (idMatchResult) {
            let idSelector = idMatchResult[1];
            let elementIDs = element
                .attributes
                .filter(item => item.name === "id");
            if (elementIDs & elementIDs[0] === idSelector) {
                return true;
            }
            return false;
        }
        return true;
    }

    if (selector.charAt(0) === "#") {
        let attr = element
            .attributes
            .filter(attr => attr.name === "id")[0];
        if (attr && attr.value === selector.replace("#", "")) {
            return true;
        }
    } else if (selector.charAt(0) === ".") {
        let attrs = element
            .attributes
            .filter(attr => attr.name === "class");
        if (attrs) {
            let classValues = attrs.map(attr => attr.value);
            if (classValues.indexOf(selector.replace(".", "")) > -1) {
                return true;
            }
        }
    } else {
        if (element.tagName === selector) {
            return true;
        }
    }
    return false;
}

function computeSpecifity(selectorParts) {
    let specifity = [0, 0, 0, 0]; 
    for (let selectorPart of selectorParts) {
        if (selectorPart.charAt(0) === "#") {
            specifity[1]++;
        } else if (selectorPart.charAt(0) === ".") {
            specifity[2]++;
        } else {
            specifity[3]++;
        }
    }
    return specifity;
}

function compareSpecifity(sp1, sp2) {
    for (let i = 0; i < 4; i++) {
        if (sp1[i] - sp2[i]) {
            return sp1[i] - sp2[i];
        }
    }
    return 0;
}

function computeCSS(element) {
    let elements = stack.slice().reverse();

    if (!element.computedStyle) {
        element.computedStyle = {};
    }

    elements = elements.slice(0, elements.length - 1);

    for (let rule of rules) {
        let selectorParts = rule.selectors[0].split(" ").reverse(); 
        if (comapreTwoArray(selectorParts, elements, match)===true) {
            for (let declaration of rule.declarations) {
                let specifityOfDeclaration = computeSpecifity(selectorParts);
                let property = declaration.property;
                if (!element.computedStyle[property]) {
                    element.computedStyle[property] = {
                        value: declaration.value,
                        specifity: specifityOfDeclaration
                    };
                } else{
                    if (compareSpecifity(specifityOfDeclaration, element.computedStyle[property].specifity) >= 0) {
                        element.computedStyle[property].value = value;
                    }
                }
            }
        }
    }
}

function comapreTwoArray(arrA, arrB, compareFunc) {
    if (!arrB) {
        return false;
    }
    if (!arrA) {
        throw new Error("arrA should not be empty");
    }
    if (!compareFunc(arrA[0], arrB[0])) {
        return false;
    }
    let aIdx = 1;
    for (let i = 1; i < arrB.length; i++) {
        if (compareFunc(arrA[aIdx], arrB[i])) {
            aIdx++;
        }
    }
    if (aIdx < arrA.length) {
        return false;
    } else {
        return true;
    }
}

function emit(token) {
    let top = stack[stack.length - 1];
    if (token.type === "startTag") {
        let element = {
            type: "element",
            tagName: token.tagName,
            children: [],
            attributes: []
        }
        for (let p in token) {
            if (p !== "type" && p !== "tagName") {
                element
                    .attributes
                    .push({name: p, value: token[p]});
            }
        }

        top
            .children
            .push(element);
        stack.push(element);
        computeCSS(element);

        if (token.isSelfClosing) {
            stack.pop(element);
        }

        currentTextNode = null;
    } else if (token.type === 'endTag') {
        if (top.tagName !== token.tagName) {
            throw new Error("not matched!");
        } else {
            if (top.tagName === "style") {
                addCSSRules(top.children[0].content);
            }

            stack.pop();
        }
    } else if (token.type === "text") {
        if (currentTextNode === null) {
            currentTextNode = {
                "type": "text",
                "content": ""
            }
            top
                .children
                .push(currentTextNode);
        }
        currentTextNode.content += token.content;
    }
    if (token.type !== "text") {
    }
}

function data(c) {
    if (c === "<") {
        return tagOpen;
    } else if (c === EOF) {
        emit({type: "EOF"});
        return;
    } else {
        emit({type: "text", content: c});
        return data;
    }
}

function tagOpen(c) { 
    if (c === "/") {
        return endTagOpen;
    } else if (c.match(/^[A-Za-z]$/)) {
        currentToken = {
            type: "startTag",
            tagName: ""
        }
        return tagName(c);
    } else {
        return;
    }
}

function endTagOpen(c) {
    if (c.match(/^[A-Za-z]/)) {
        currentToken = {
            type: "endTag",
            tagName: ""
        }
        return tagName(c);
    }
}

function tagName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName;
    } else if (c === "/") {
        return selfClosingStartTag;
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken.tagName += c;
        return tagName;
    } else if (c === ">") {
        emit(currentToken);
        return data;
    } else {
        return tagName;
    }
}

function beforeAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName;
    } else if (c === ">" || c === "/" || c === EOF) {
        return afterAttributeName(c);
    } else if (c === "=") {
    } else {
        currentAttribute = {
            name: "",
            value: ""
        }
        return attributeName(c);
    }
}

function attributeName(c) {
    if (c.match(/^[\t\n\f ]$/) || c === ">" || c === "/" || c === EOF) {
        return afterAttributeName(c);
    } else if (c === "=") {
        return beforeAttributeValue;
    } else if (c === '"' || c === "'" || c === "<") {}
    {
        currentAttribute.name += c;
        return attributeName;
    }
}

function beforeAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeValue;
    } else if (c === "\"") {
        return doubleQuotedAttributeValue;
    } else if (c === "\'") {
        return singleQuotedAttributeValue;
    } else if (c === ">") {} else {
        return unquotedAttributeValue(c);
    }
}

function doubleQuotedAttributeValue(c) {
    if (c === "\"") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c === "\u0000") {} else if (c === EOF) {} else {
        currentAttribute.value += c;
        return doubleQuotedAttributeValue;
    }
}

function singleQuotedAttributeValue(c) {
    if (c === "\'") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c === "\u0000") {} else if (c === EOF) {} else {
        currentAttribute.value += c;
        return singleQuotedAttributeValue;
    }
}

function afterQuotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName;
    } else if (c === "/") {
        return selfClosingStartTag;
    } else if (c === ">") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else {
        return beforeAttributeName(c);
    }
}

function unquotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return beforeAttributeName;
    } else if (c === "/") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    } else if (c === ">") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else if (c === "\u0000") {} else if (c === EOF) {} else {
        currentAttribute.value += c;
        return unquotedAttributeValue;
    }
}

function afterAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return afterAttributeName;
    } else if (c === "/") {
        return selfClosingStartTag;
    } else if (c === "=") {
        return beforeAttributeValue;
    } else if (c === ">") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else if (c === EOF) {} else {
        currentAttribute = {
            name: "",
            value: ""
        }
        return attributeName(c);
    }
}

function selfClosingStartTag(c) {
    if (c === ">") {
        currentToken.isSelfClosing = true;
        emit(currentToken);
        return data;
    }
}

module.exports.parseHTML = function parseHTML(html) {
    let state = data;
    for (let c of html) {
        state = state(c);
    }
    state(EOF);
    return stack[0];
}