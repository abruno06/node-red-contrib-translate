let loaded  =false;
let debug = false;
module.exports = function (RED) {
    "use strict";
    // This module is highly inspired from node-red 'change' node

if (!loaded){
    loaded=true;
    load(RED.settings);
}


    /// INPUT 

    function getInputValue(msg, rule, done) {
        let inputValue;
        let inputType;
        let r = {};
        if (debug) console.log("start getInputValue on:", rule, " msg:", msg);
        let inputName = rule.n;
        if (rule.pt === 'msg' || rule.pt === 'flow' || rule.pt === 'global') {
            if (rule.pt === "msg") {
                inputType = rule.pt;
                inputValue = RED.util.getMessageProperty(msg, rule.p);
                r[inputName] = {
                    inputType,
                    inputValue
                }
                if (debug) console.log("getInputValue return #1:", r);
                RED.util.setMessageProperty(msg,"_xlate."+inputName,inputValue);
                done(null, r);
            } else if (rule.pt === 'flow' || rule.pt === 'global') {
                let contextKey = RED.util.parseContextStore(rule.p);
                node.context()[rule.pt].get(contextKey.key, contextKey.store, (err, inputValue) => {
                    if (err) {
                        done(err)
                    } else {
                        if (debug) console.log("getInputValue look for type for ", inputValue);
                        inputType = rule.pt;
                        r[inputName] = {
                            inputType,
                            inputValue
                        }
                        if (debug) console.log("getInputValue return #2:", r);
                        RED.util.setMessageProperty(msg,"_xlate."+inputName,inputValue);
                        done(null, r);
                    }
                });
                return;
            }
        }
    }


    function completeVectorFound(msg, node, currentElement, vector, done) {
        if (debug) console.log("start completeVectorFound on:", currentElement, " vector:", vector);
        if (!msg) {
            if (debug) console.log("completeVectorFound stop as no msg");
            return done();
        } else if (currentElement === node.inputfields.length - 1) {
            if (debug) console.log("completeVectorFound stop as reach last element");
            return done(undefined, vector);
        } else {
            if (debug) console.log("completeVectorFound need to look deeper");
            getInputElement(msg, node, currentElement + 1, vector, done);
        }
    }


    function getInputElement(msg, node, currentElement, vector, done) {
        //  getInputValue(msg,rule, done)
        if (debug) console.log("start getInputElement on:", currentElement, " vector:", vector);
        if (currentElement >= node.inputfields.length) {
            return done(null, vector);
        }
        let v = node.inputfields[currentElement]
        if (debug) console.log("getInputElement v:", v);
        getInputValue(msg, v, (err, vectorelement) => {
            vector = {
                ...vector,
                ...vectorelement
            };
            if (debug) console.log("getInputElement determine if completed. vector is ", vector);
            completeVectorFound(msg, node, currentElement, vector, done)
        })
    }

    function extractInputVector(msg, node, done) {
        if (debug) console.log("start extractInputVector");
        if (!msg) {
            if (debug) console.log("extractInputVector end due to empty msg");
            return done();
        } else if (!node.inputfields) {
            if (debug) console.log("extractInputVector end due to no inputfield");
            return done();
        } else {
            getInputElement(msg, node, 0, {}, (err, vector) => {
                if (debug) console.log("extractInputVector end with vector:", vector);
                done(undefined, vector, msg)
            })
        }
    }

    /// ACL piece
    function lookForMatch(inputvector, rule, done) {

        if (debug) console.log("start lookForMatch on:", rule, " inputvector:", inputvector);

        if (!rule.i) {
            return done();
        }
        let isMatching = true
        let out = rule.o
        for (const e in rule.i) {
            if (debug) console.log("lookForMatch:", e);
            let re = rule.i[e].p;

            let valObj = inputvector[e];
            let val = "";
            if (valObj && valObj.inputValue) val = valObj.inputValue;
            if (debug) console.log("lookForMatch: re:", re, " compare:", val);
            let result = true;
            if (val.match(re) === null) result = false
            isMatching &= result;
            if (debug) console.log("lookForMatch results:", result);
            if (!isMatching) {
                break;
            }
        }

        if (debug) console.log("lookForMatch final result:", isMatching);
        if (isMatching) {
            if (debug) console.log("lookForMatch have a match");
            return done(undefined, out)
        } else {
            if (debug) console.log("lookForMatch no match");
            return done();
        }
    }



    function processACLRule(inputvector, node, currentElement, vector, done) {
        //  getInputValue(msg,rule, done)
        if (debug) console.log("start processACLRule on:", currentElement, " vector:", vector);
        if (currentElement >= node.aclrules.length) {
            return done(undefined, vector);
        }


        let v = node.aclrules[currentElement]
        if (debug) console.log("processACLRule v:", v);
        lookForMatch(inputvector, v, (err, vectorelement) => {
            completeMatchFound(inputvector, node, currentElement, vectorelement, done)
        })


    }

    function completeMatchFound(inputvector, node, currentElement, vector, done) {
        if (debug) console.log("start completeMatchFound on:", currentElement, " vector:", vector);
        if (!inputvector) {
            if (debug) console.log("completeMatchFound no inputvector");
            return done();
        } else if (vector) {
            if (debug) console.log("completeMatchFound one match found");
            return done(undefined, vector);
        } else if (currentElement === node.aclrules.length - 1) {
            if (debug) console.log("completeMatchFound last acl rule");
            return done(undefined, vector);
        } else {
            if (debug) console.log("completeMatchFound need to search another rule");
            processACLRule(inputvector, node, currentElement + 1, vector, done);
        }
    }


    function searchMatchingRule(msg, node, inputvector, done) {
        if (debug) console.log("start searchMatchingRule");
        if (!msg) {
            if (debug) console.log("searchMatchingRule no message")
            return done();
        } else if (!node.aclrules) {
            if (debug) console.log("searchMatchingRule no acl rule")
            return done();
        } else if (!inputvector) {
            if (debug) console.log("searchMatchingRule no inputvector");
            return done();
        } else {
            processACLRule(inputvector, node, 0, undefined, (err, vector) => {
                if (debug) console.log("searchMatchingRule result: ", vector)
                done(null, vector, msg)
            })
        }


        //    done(null, undefined, msg)
    }

    //OUTPUT

    function applyOutputXlate(msg, node, outputrule, done) {
        if (debug) console.log("start applyOutputXlate with ouputrule", outputrule);
        if (!msg) {
            if (debug) console.log("applyOutputXlate no message")
            return done();
        } else if (!node.outputfields) {
            if (debug) console.log("applyOutputXlate no output")
            return done();
        } else if (!outputrule) {
            if (debug) console.log("applyOutputXlate no inputvector");
            return done();
        } else {

            let outputvector = {};

            for (let i of node.outputfields) {
                if (debug) console.log("index", i);
                outputvector[i.n] = {
                    to: i.p,
                    tot: i.pt,
                    p: outputrule[i.n].p,
                    pt: outputrule[i.n].pt
                }
            }
            if (debug) console.log("applyOutputXlate outputvector", outputvector);
            processOutputRule(msg, node, 0, outputvector, (err, msg) => {
                done(null, msg)
            })

        }

    }

    function processOutputRule(msg, node, currentElement, outputvector, done) {
        //  getInputValue(msg,rule, done)
        if (debug) console.log("start processOutputRule on:", currentElement, " vector:", outputvector);
        if (currentElement >= node.outputfields.length) {
            return done(undefined, msg);
        }
        let v = node.outputfields[currentElement];
        let xlate = outputvector[v.n];
        if (debug) console.log("processOutputRule v:", v, " xlate:", xlate);
        getACLOutputValue(msg, xlate, (err, value) => {
            if (xlate.tot === 'msg') {
                try {
                    RED.util.setMessageProperty(msg, xlate.to, value);

                } catch (err) {}
                completeOutputRules(msg, node, currentElement, outputvector, done)
            } else if (xlate.tot === 'flow' || xlate.tot === 'global') {
                let contextKey = RED.util.parseContextStore(xlate.to);
                let target = node.context()[xlate.tot];
                let callback = err => {
                    if (err) {
                        node.error(err, msg);
                        return done(undefined, null);
                    } else {
                        completeOutputRules(msg, node, currentElement, outputvector, done)
                    }
                }
                target.set(contextKey.key, value, contextKey.store, callback);
            }
        })

    }


    function completeOutputRules(msg, node, currentElement, vector, done) {
        if (debug) console.log("start completeOutputRules on:", currentElement, " vector:", vector);
        if (!msg) {
            if (debug) console.log("completeOutputRules stop as no msg");
            return done();
        } else if (currentElement === node.outputfields.length - 1) {
            if (debug) console.log("completeOutputRules stop as reach last element");
            return done(undefined, msg);
        } else {
            if (debug) console.log("completeOutputRules need to look deeper");
            processOutputRule(msg, node, currentElement + 1, vector, done);
        }
    }



    function getACLOutputValue(msg, xlate, done) {
        let value = xlate.p;
        if (xlate.pt === 'json') {
            value = JSON.parse(xlate.p);
        } else if (xlate.pt === 'bin') {
            value = Buffer.from(JSON.parse(xlate.p))
        }
        if (xlate.pt === "msg") {
            value = RED.util.getMessageProperty(msg, xlate.p);
        } else if ((xlate.pt === 'flow') || (xlate.pt === 'global')) {
            RED.util.evaluateNodeProperty(xlate.p, xlate.pt, node, msg, (err, value) => {
                if (err) {
                    done(undefined, undefined);
                } else {
                    done(undefined, value);
                }
            });
            return
        } else if (xlate.pt === 'date') {
            value = Date.now();
        } else if (xlate.pt === 'jsonata') {
            // Prepare the jsonata engine
            try {
                xlate.p = RED.util.prepareJSONataExpression(xlate.p,this);
            } catch(e) {
                this.error(RED._("change.errors.invalid-expr",{error:e.message}));
            }
            RED.util.evaluateJSONataExpression(xlate.p, msg, (err, value) => {
                if (err) {
                    done(RED._("change.errors.invalid-expr", {
                        error: err.message
                    }))
                } else {
                    done(undefined, value);
                }
            });
            return;
        }
        done(undefined, value);
    }


    // MAIN
    function applyXlateRules(msg, node, done) {
        if (debug) console.log("applyXlateRules Start");
        extractInputVector(msg, node, (err, inputvector, msg) => {
            if (debug) console.log("applyXlateRules inputvector:", inputvector);
            searchMatchingRule(msg, node, inputvector, (err, outputrule, msg) => {
                if (err) {
                    if (debug) console.log("applyXlateRules, Some Error", err)
                } else {
                    if (outputrule) {
                        if (debug) console.log("applyXlateRules match ", outputrule)
                        applyOutputXlate(msg, node, outputrule, (err, msg) => {
                            if (debug) console.log("applyXlateRules compute message ", msg)
                            done(null, msg);
                        });

                    } else {
                        if (debug) console.log("applyXlateRules no match")
                        done(null, msg)
                    }


                }
            })
 
        })

    }

    function load(settings){
        let xlateSettings = settings.translate || {};
        if (xlateSettings.hasOwnProperty("debug")&& (typeof xlateSettings.debug === "boolean"))
        {
            debug = xlateSettings.debug;
        }
    }

    return {
        applyXlateRules: applyXlateRules
    }
}