function getStyle(element) {
    if (!element.style) {
        element.style = {};
    }

    for (let prop in element.computedStyle) {
        element.style[prop] = element.computedStyle[prop].value;

        if (element.style[prop].toString().match(/px$/)) {
            element.style[prop] = parseInt(element.style[prop]);
        }
        if (element.style[prop].toString().match(/^[0-9\.]$/)) {
            element.style[prop] = parseInt(element.style[prop]);
        }
    }
    return element.style;
}

function layout(element) {
    if (!element.computedStyle) {
        return (void 0);
    }

    let elementStyle = getStyle(element);

    if (elementStyle.display !== "flex") {
        return (void 0);
    }

    let items = element
        .children
        .filter(child => child.type === "element");

    items.sort((a, b) => {
        return (a.order || 0) - (b.order || 0);
    });

    ['width', 'height'].forEach(size => {
        if (elementStyle[size] === "auto" || elementStyle[size] === '') {
            elementStyle[size] = null;
        }
    });

    if (!elementStyle.flexDirection || elementStyle.flexDirection === "auto") {
        elementStyle.flexDirection = "row";
    }
    if (!elementStyle.alignItems || elementStyle.alignItems === "auto") {
        elementStyle.alignItems = "stretch";
    }
    if (!elementStyle.justifyContent || elementStyle.justifyContent === "auto") {
        elementStyle.justifyContent = "flex-start";
    }
    if (!elementStyle.flexWrap || elementStyle.flexWrap === "auto") {
        elementStyle.flexWrap = "nowrap";
    }
    if (!elementStyle.alignContent || elementStyle.alignContent === "auto") {
        elementStyle.alignContent = "stretch";
    }

    let mainSize,
        mainStart,
        mainEnd,
        mainSign,
        mainBase,
        crossSize,
        crossStart,
        crossEnd,
        crossSign,
        crossBase;

    if (elementStyle.flexDirection === "row") {
        mainSize = "width";
        mainStart = "left";
        mainEnd = "right";
        mainSign = +1;
        mainBase = 0;

        crossSize = "height";
        crossStart = "top";
        crossEnd = "bottom";
    } else if (elementStyle.flexDirection === "row-reverse") {
        mainSize = "width";
        mainStart = "left";
        mainEnd = "right";
        mainSign = -1;
        mainBase = elementStyle.width;

        crossSize = "height";
        crossStart = "top";
        crossEnd = "bottom";
    } else if (elementStyle.flexDirection === "column") {
        mainSize = "height";
        mainStart = "top";
        mainEnd = "bottom";
        mainSign = +1;
        mainBase = 0;

        crossSize = "width";
        crossStart = "left";
        crossEnd = "right";
    } else if (elementStyle.flexDirection === "column-reverse") {
        mainSize = "height";
        mainStart = "bottom";
        mainEnd = "top";
        mainSign = -1;
        mainBase = elementStyle.height;

        crossSize = "width";
        crossStart = "left";
        crossEnd = "right";
    }

    if (elementStyle.flexWrap === "wrap-reverse") {
        let tmp = crossStart;
        crossStart = crossEnd;
        crossEnd = tmp;
        crossSign = -1;
    } else {
        crossBase = 0;
        crossSign = +1;
    }

    let isAutoMainSize = false;
    if (!elementStyle[mainSize]) {
        elementStyle[mainSize] = 0;
        for (let item of element.children) {
            let itemStyle = getStyle(item);
            if (itemStyle[mainSize] !== null || itemStyle[mainSize] > 0) {
                elementStyle[mainSize] += itemStyle[mainSize];
            }
        }
        isAutoMainSize = true;
    }

    let flexLine = {
        items: []
    };
    let flexLines = [flexLine];

    let mainSpace = elementStyle[mainSize];
    let crossSpace = 0;

    for (let item of items) {
        let itemStyle = getStyle(item);

        if (itemStyle[mainSize] === null) {
            itemStyle[mainSize] = 0;
        }

        if (itemStyle.flex) {
            flexLine
                .items
                .push(item);
        } else if (itemStyle.flexWrap === 'nowrap' && isAutoMainSize) {
            mainSpace -= itemStyle[mainSize]; 
            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSpace]);
            }
            flexLine
                .items
                .push(item);
        } else {
            if (itemStyle[mainSize] > elementStyle[mainSize]) {
                itemStyle[mainSize] = elementStyle[mainSize];
            }

            if (mainSpace < itemStyle[mainSize]) { 
                flexLine.mainSpace = mainSpace; 
                flexLine.crossSpace = crossSpace;
                flexLine
                    .items
                    .push(item);
                flexLines.push(flexLine);

                flexLine = {
                    items: []
                };

                mainSpace = elementStyle[mainSize];
                crossSpace = 0;
            } else {
                flexLine
                    .items
                    .push(item);
            }

            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSpace]);
            }

            mainSpace -= itemStyle[mainSize];
        }
    }
    flexLine.mainSpace = mainSpace;
    if (elementStyle.flexWrap === 'nowrap' || isAutoMainSize) {
        flexLine.crossSpace = (elementStyle[crossSize] !== (void 0)) ? elementStyle[crossSize] : crossSpace;
    } else {
        flexLine.crossSpace = crossSpace;
    }
    console.log(flexLines);

    if (mainSpace < 0){
        let scale = elementStyle[mainSize] / (elementStyle[mainSize] - mainSpace);
        let currentMain = 0; 
        for(let item of items){
            let itemStyle = getStyle(item);

            if(itemStyle.flex){
                itemStyle[mainSize] = 0;
            }

            itemStyle[mainSize] = itemStyle[mainSize] * scale;
            itemStyle[mainStart] = currentMain;

            itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
            currentMain = itemStyle[mainEnd]; 
        }
    } else {
        flexLines.forEach(function(flexLine){
            let lineMainSpace = flexLine.mainSpace;
            let flexTotal = 0; 
            let items = flexLine.items;
            for(let item of items){
                let itemStyle = getStyle(item);
                if((itemStyle.flex !== null) && (itemStyle.flex !== (void 0))){
                    flexTotal += itemStyle.flex;
                }
            }

            if(flexTotal>0){
                let currentMain = mainBase;
                for(let item of items){
                    let itemStyle = getStyle(item);
                    if(itemStyle.flex){
                        itemStyle[mainSize] = (lineMainSpace / flexTotal) * itemStyle.flex;
                    }
                    itemStyle[mainStart] = currentMain;
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
                    currentMain = itemStyle[mainEnd];
                }
            } else {
                let currentMain = (void 0);
                let step = (void 0);
                if(style.justifyContent === "flex-start"){
                    step = 0;
                    currentMain = mainBase;
                }
                if(style.justifyContent === "flex-end"){
                    step = 0;
                    currentMain = mainBase + lineMainSpace * mainSign;
                }
                if(style.justifyContent === "center"){
                    step = 0;
                    currentMain = mainBase + lineMainSpace / 2 * mainSign;
                }
                if(style.justifyContent === "space-between"){
                    step = lineMainSpace / (items.length - 1) * mainSign;
                    currentMain = mainBase + step;
                }
                if(style.justifyContent === "space-around"){
                    step = mainSpace / items.length * mainSign;
                    currentMain = mainBase + step / 2 ;
                }
                for(let item of items){
                    itemStyle = getStyle(item);
                    itemStyle[mainStart] = currentMain;
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
                    currentMain = itemStyle[mainEnd] + step;
                }
            }
        });
    }

    if(!elementStyle[crossSize]){
        crossSpace = 0;
        elementStyle[crossSize] = 0; 
        for(let flexLine of flexLines){
            elementStyle[crossSize] = elementStyle[crossSize] + flexLine.crossSpace; 
        }
    } else {
        crossSpace = elementStyle[crossSize];
        for(let flexLine of flexLines){
            crossSpace -= flexLine.crossSpace;
        }
    }

    if(elementStyle.flexWrap === "wrap-reverse"){
        crossBase = elementStyle[crossSize];
    } else {
        crossBase = 0;
    }
    let lineCrossSize = elementStyle[crossSize] / flexLines.length;
    let step; 
    if(elementStyle.alignContent === "flex-start"){
        crossBase += 0;
    }
    if(elementStyle.alignContent === "flex-end"){
        crossBase += crossSign * crossSpace;
        step = 0;
    }
    if(elementStyle.alignContent === "center"){
        crossBase += crossSign * crossSpace / 2;
        step = 0;
    }
    if(elementStyle.alignContent === "space-between"){
        crossBase = 0;
        step = crossSpace / (flexLines.length -1);
    }
    if(elementStyle.alignContent === "space-around"){
        step = crossSpace / flexLines.length;
        crossBase += crossSign * step / 2;
    }
    if(elementStyle.alignContent === "stretch"){
        crossBase += 0;//?
        step = 0;
    }
    flexLines.forEach(function(flexLine){
        let items = flexLine.items;
        let lineCrossSize = elementStyle.alignContent === "stretch" ?
            flexLine.crossSpace + crossSpace / flexLines.length : 
            flexLine.crossSpace;
        for(let item of items){
            let itemStyle = getStyle(item);

            let align = itemStyle.alignSelf || elementStyle.alignItems;

            if(itemStyle[crossSize] === null || itemStyle[crossSize] === (void 0)){
                itemStyle[crossSize] = (align === "stretch") ? lineCrossSize : 0;
            }
            
            if(align === "flex-start"){
                itemStyle[crossStart] = crossBase;
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSpace;
            }
            if(align === "flex-end"){
                itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize;
                itemStyle[crossStart] = itemStyle[crossStart] - crossSpace;
            }
            if(align === "center"){
                itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize])/2;
                itemStyle[crossEnd] = item[crossStart] + crossSign * itemStyle[crossSize];
            }
            if(align === "stretch"){
                itemStyle[crossStart] = crossBase;
                itemStyle[crossEnd] = crossBase + crossSign * itemStyle[crossSize];
                itemStyle[crossSize] = crossSign * itemStyle[crossSize];
            }
        }
        crossBase += crossSign * (lineCrossSize + step);
    });
}

module.exports = layout;