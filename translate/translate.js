module.exports = function (RED) {
    "use strict";
    const xlate = require("./xlate")(RED);


    function TranslateNode(n) {
        RED.nodes.createNode(this, n);
        let node = this;

        node.inputfields = n.inputfields;
        node.outputfields = n.outputfields;
        node.aclrules = n.aclrules;

        let valid = true;

        if (valid) {
            this.on('input', (msg, send, done) => {
                xlate.applyXlateRules(msg, node, (err, msg) => {
               //   console.log("Return from applyXlateRules:",err," msg:",msg)
                    if (err) {
                 //       console.log("applyXlateRules return error")
                        done(err);
                    } else if (msg) {
                  //      console.log("applyXlateRules return msg")
                        send(msg);
                        done();
                    }
                })
            });
        }
    }
    RED.nodes.registerType("translate", TranslateNode);
};