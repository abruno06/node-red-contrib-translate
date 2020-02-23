module.exports = function (RED) {
"use strict";
//var path = require("path");
// This module is inpired from node-red change node



// [
//     {
//         "id": "71531ff6.61c188",
//         "type": "translate",

//         "inputfields": [
//             {
//                 "n": "idx-1",
//                 "p": "payload",
//                 "pt": "msg"
//             },
//             {
//                 "n": "hello",
//                 "p": "payload",
//                 "pt": "msg"
//             },
//             {
//                 "n": "idx-3",
//                 "p": "payload",
//                 "pt": "msg"
//             }
//         ],
//         "outputfields": [
//             {
//                 "n": "Name-O",
//                 "p": "payload",
//                 "pt": "msg"
//             },
//             {
//                 "n": "Name-5",
//                 "p": "payload",
//                 "pt": "msg"
//             }
//         ],
//         "aclrules": [
//             {
//                 "i": {
//                     "idx-1": {
//                         "p": ".*",
//                         "pt": "re"
//                     },
//                     "hello": {
//                         "p": ".*",
//                         "pt": "re"
//                     },
//                     "idx-3": {
//                         "p": ".*",
//                         "pt": "re"
//                     }
//                 },
//                 "o": {
//                     "Name-O": {
//                         "p": "payload",
//                         "pt": "msg"
//                     },
//                     "Name-5": {
//                         "p": "payload",
//                         "pt": "msg"
//                     }
//                 }
//             }
//         ],

//     }
// ]




// 




function applyACLRule(msg, rule, done) {
    var property = rule.p;
    var current;
    var fromValue;
    var fromType;
    var fromRE;

    try {
        getToValue(msg, rule, (err, value) => {
            if (err) {
                node.error(err, msg);
                return done(null, null);
            } else {
                getInputValue(msg, rule, (err, fromParts) => {
                    if (err) {
                        node.error(err, msg);
                        return done(null, null);
                    } else {
                        fromValue = fromParts.fromValue;
                        fromType = fromParts.fromType;
                        fromRE = fromParts.fromRE;
                        if (rule.pt === 'msg') {
                            try {
                                if (rule.t === 'delete') {
                                    RED.util.setMessageProperty(msg, property, undefined);
                                } else if (rule.t === 'set') {
                                    RED.util.setMessageProperty(msg, property, value);
                                } else if (rule.t === 'change') {
                                    current = RED.util.getMessageProperty(msg, property);
                                    if (typeof current === 'string') {
                                        if ((fromType === 'num' || fromType === 'bool' || fromType === 'str') && current === fromValue) {
                                            // str representation of exact from number/boolean
                                            // only replace if they match exactly
                                            RED.util.setMessageProperty(msg, property, value);
                                        } else {
                                            current = current.replace(fromRE, value);
                                            RED.util.setMessageProperty(msg, property, current);
                                        }
                                    } else if ((typeof current === 'number' || current instanceof Number) && fromType === 'num') {
                                        if (current == Number(fromValue)) {
                                            RED.util.setMessageProperty(msg, property, value);
                                        }
                                    } else if (typeof current === 'boolean' && fromType === 'bool') {
                                        if (current.toString() === fromValue) {
                                            RED.util.setMessageProperty(msg, property, value);
                                        }
                                    }
                                }
                            } catch (err) {}
                            return done(undefined, msg);
                        } else if (rule.pt === 'flow' || rule.pt === 'global') {
                            var contextKey = RED.util.parseContextStore(property);
                            var target = node.context()[rule.pt];
                            var callback = err => {
                                if (err) {
                                    node.error(err, msg);
                                    return done(null, null);
                                } else {
                                    done(null, msg);
                                }
                            }
                            if (rule.t === 'delete') {
                                target.set(contextKey.key, undefined, contextKey.store, callback);
                            } else if (rule.t === 'set') {
                                target.set(contextKey.key, value, contextKey.store, callback);
                            } else if (rule.t === 'change') {
                                target.get(contextKey.key, contextKey.store, (err, current) => {
                                    if (err) {
                                        node.error(err, msg);
                                        return done(null, null);
                                    }
                                    if (typeof current === 'string') {
                                        if ((fromType === 'num' || fromType === 'bool' || fromType === 'str') && current === fromValue) {
                                            // str representation of exact from number/boolean
                                            // only replace if they match exactly
                                            target.set(contextKey.key, value, contextKey.store, callback);
                                        } else {
                                            current = current.replace(fromRE, value);
                                            target.set(contextKey.key, current, contextKey.store, callback);
                                        }
                                    } else if ((typeof current === 'number' || current instanceof Number) && fromType === 'num') {
                                        if (current == Number(fromValue)) {
                                            target.set(contextKey.key, value, contextKey.store, callback);
                                        }
                                    } else if (typeof current === 'boolean' && fromType === 'bool') {
                                        if (current.toString() === fromValue) {
                                            target.set(contextKey.key, value, contextKey.store, callback);
                                        }
                                    }
                                });
                            }
                        }
                    }
                })
            }
        });
    } catch (err) {
        // This is an okay error
        done(undefined, msg);
    }
}

function completeApplyingRules(msg, node, currentRule, done) {
    if (!msg) {
        return done();
    } else if (currentRule === node.rules.length - 1) {
        return done(undefined, msg);
    } else {
        applyRules(msg, currentRule + 1, done);
    }
}

function applyACLRules(msg, node, currentRule, done) {
    if (currentRule >= node.aclrules.length) {
        return done(undefined, msg);
    }



    var r = node.aclrules[currentRule];

    applyRule(msg, {
        t: "set",
        p: "_temp_move",
        pt: r.tot,
        to: r.p,
        tot: r.pt
    }, (err, msg) => {
        applyRule(msg, {
            t: "delete",
            p: r.p,
            pt: r.pt
        }, (err, msg) => {
            applyRule(msg, {
                t: "set",
                p: r.to,
                pt: r.tot,
                to: "_temp_move",
                tot: r.pt
            }, (err, msg) => {
                applyRule(msg, {
                    t: "delete",
                    p: "_temp_move",
                    pt: r.pt
                }, (err, msg) => {
                    completeApplyingRules(msg, node, currentRule, done);
                });
            });
        });
    });

}

/// INPUT 

function getInputValue(msg, rule, done) {
    let inputValue;
    let inputType;
    let r = {};
    console.log("start getInputValue on:", rule, " msg:", msg);
    var inputName = rule.n;
    if (rule.pt === 'msg' || rule.pt === 'flow' || rule.pt === 'global') {
        if (rule.pt === "msg") {
            inputType = rule.pt;
            inputValue = RED.util.getMessageProperty(msg, rule.p);
            r[inputName] = {
                inputType,
                inputValue
            }
            console.log("getInputValue return #1:", r);
            done(null, r);
        } else if (rule.pt === 'flow' || rule.pt === 'global') {
            var contextKey = RED.util.parseContextStore(rule.p);
            node.context()[rule.pt].get(contextKey.key, contextKey.store, (err, inputValue) => {
                if (err) {
                    done(err)
                } else {
                    console.log("getInputValue look for type for ", inputValue);
                    inputType = rule.pt;
                    r[inputName] = {
                        inputType,
                        inputValue
                    }
                    console.log("getInputValue return #2:", r);
                    done(null, r);
                }
            });
            return;
        }
    }
}


function completeVectorFound(msg, node, currentElement, vector, done) {
    console.log("start completeVectorFound on:", currentElement, " vector:", vector);
    if (!msg) {
        console.log("completeVectorFound stop as no msg");
        return done();
    } else if (currentElement === node.inputfields.length - 1) {
        console.log("completeVectorFound stop as reach last element");
        return done(undefined, vector);
    } else {
        console.log("completeVectorFound need to look deeper");
        getInputElement(msg, node, currentElement + 1, vector, done);
    }
}


function getInputElement(msg, node, currentElement, vector, done) {
    //  getInputValue(msg,rule, done)
    console.log("start getInputElement on:", currentElement, " vector:", vector);
    if (currentElement >= node.inputfields.length) {
        return done(null, vector);
    }
    let v = node.inputfields[currentElement]
    console.log("getInputElement v:", v);
    getInputValue(msg, v, (err, vectorelement) => {
        vector = {
            ...vector,
            ...vectorelement
        };
        console.log("getInputElement determine if completed. vector is ", vector);
        completeVectorFound(msg, node, currentElement, vector, done)
    })
}

function extractInputVector(msg, node, done) {
    console.log("start extractInputVector");
    if (!msg) {
        console.log("extractInputVector end due to empty msg");
        return done();
    } else if (!node.inputfields) {
        console.log("extractInputVector end due to no inputfield");
        return done();
    } else {
        getInputElement(msg, node, 0, {}, (err, vector) => {
            console.log("extractInputVector end with vector:", vector);
            done(undefined, vector, msg)
        })
    }
}

/// ACL piece
function lookForMatch(inputvector, rule, done) {

    console.log("start lookForMatch on:", rule, " inputvector:", inputvector);

    if (!rule.i) {
        return done();
    }
    let isMatching = true
    let out = rule.o
    for (const e in rule.i) {
        console.log("lookForMatch:", e);
        let re = rule.i[e].p;

        let valObj = inputvector[e];
        let val = "";
        if (valObj && valObj.inputValue) val = valObj.inputValue;
        console.log("lookForMatch: re:", re, " compare:", val);
        let result = true;
        if (val.match(re) === null) result = false
        isMatching &= result;
        console.log("lookForMatch results:", result);
        if (!isMatching) {
            break;
        }
    }

    console.log("lookForMatch final result:", isMatching);
    if (isMatching) {
        console.log("lookForMatch have a match");
        return done(undefined, out)
    } else {
        console.log("lookForMatch no match");
        return done();
    }
}



function processACLRule(inputvector, node, currentElement, vector, done) {
    //  getInputValue(msg,rule, done)
    console.log("start processACLRule on:", currentElement, " vector:", vector);
    if (currentElement >= node.aclrules.length) {
        return done(undefined, vector);
    }


    let v = node.aclrules[currentElement]
    console.log("processACLRule v:", v);
    lookForMatch(inputvector, v, (err, vectorelement) => {
        completeMatchFound(inputvector, node, currentElement, vectorelement, done)
    })


}

function completeMatchFound(inputvector, node, currentElement, vector, done) {
    console.log("start completeMatchFound on:", currentElement, " vector:", vector);
    if (!inputvector) {
        console.log("completeMatchFound no inputvector");
        return done();
    } else if (vector) {
        console.log("completeMatchFound one match found");
        return done(undefined, vector);
    } else if (currentElement === node.aclrules.length - 1) {
        console.log("completeMatchFound last acl rule");
        return done(undefined, vector);
    } else {
        console.log("completeMatchFound need to search another rule");
        processACLRule(inputvector, node, currentElement + 1, vector, done);
    }
}


function searchMatchingRule(msg, node, inputvector, done) {
    console.log("start searchMatchingRule");
    if (!msg) {
        console.log("searchMatchingRule no message")
        return done();
    } else if (!node.aclrules) {
        console.log("searchMatchingRule no acl rule")
        return done();
    } else if (!inputvector) {
        console.log("searchMatchingRule no inputvector");
        return done();
    } else {
        processACLRule(inputvector, node, 0, undefined, (err, vector) => {
            console.log("searchMatchingRule result: ", vector)
            done(null, vector, msg)
        })
    }


    //    done(null, undefined, msg)
}

//OUTPUT

function applyOutputXlate(msg, node, outputrule, done) {
    console.log("start applyOutputXlate with ouputrule", outputrule);
    if (!msg) {
        console.log("applyOutputXlate no message")
        return done();
    } else if (!node.outputfields) {
        console.log("applyOutputXlate no output")
        return done();
    } else if (!outputrule) {
        console.log("applyOutputXlate no inputvector");
        return done();
    } else {

        let outputvector = {};

        for (let i of node.outputfields) {
            console.log("index", i);
            outputvector[i.n] = {
                to: i.p,
                tot: i.pt,
                p: outputrule[i.n].p,
                pt: outputrule[i.n].pt
            }
        }
        console.log("applyOutputXlate outputvector", outputvector);
        processOutputRule(msg, node, 0, outputvector, (err, msg) => {
            done(null, msg)
        })

    }

}

function processOutputRule(msg, node, currentElement, outputvector, done) {
    //  getInputValue(msg,rule, done)
    console.log("start processOutputRule on:", currentElement, " vector:", outputvector);
    if (currentElement >= node.outputfields.length) {
        return done(undefined, msg);
    }
    let v = node.outputfields[currentElement];
    let xlate = outputvector[v.n];
    console.log("processOutputRule v:", v," xlate:",xlate);

    if (xlate.tot === 'msg') {
        try {
            RED.util.setMessageProperty(msg, xlate.to, xlate.p);

        } catch (err) {}
        //return done(undefined, msg);
        completeOutputRules(msg, node, currentElement, outputvector, done)
    } else if (xlate.tot === 'flow' || xlate.tot === 'global') {
        var contextKey = RED.util.parseContextStore(xlate.to);
        var target = node.context()[xlate.tot];
        var callback = err => {
            if (err) {
                node.error(err, msg);
                return done(undefined, null);
            } else {
                completeOutputRules(msg, node, currentElement, outputvector, done)
                //done(undefined, msg);
            }
        }
        target.set(contextKey.key, xlate.p, contextKey.store, callback);
    }
   

}


function completeOutputRules(msg, node, currentElement, vector, done) {
    console.log("start completeOutputRules on:", currentElement, " vector:", vector);
    if (!msg) {
        console.log("completeOutputRules stop as no msg");
        return done();
    } else if (currentElement === node.outputfields.length - 1) {
        console.log("completeOutputRules stop as reach last element");
        return done(undefined, msg);
    } else {
        console.log("completeOutputRules need to look deeper");
        processOutputRule(msg, node, currentElement + 1, vector, done);
    }
}
// MAIN
function applyXlateRules(msg, node, done) {
    console.log("applyXlateRules Start");
    extractInputVector(msg, node, (err, inputvector, msg) => {
        console.log("applyXlateRules inputvector:", inputvector);
        searchMatchingRule(msg, node, inputvector, (err, outputrule, msg) => {
            if (err) {
                console.log("applyXlateRules, Some Error", err)
            } else {
                if (outputrule) {
                    console.log("applyXlateRules match ", outputrule)
                    applyOutputXlate(msg, node, outputrule, (err, msg) => {
                        console.log("applyXlateRules compute message ", msg)
                        done(null, msg);
                    });

                } else {
                    console.log("applyXlateRules no match")
                    done(null, msg)
                }


            }
        })

    })

}
return {
    applyXlateRules: applyXlateRules
}
}