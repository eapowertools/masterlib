var qrsInteract = require('./qrsInstance');
var Promise = require('bluebird');
var getOwnedAppObjects = require('./getOwnedAppObjects');
var getAppOwner = require('./getAppOwner');
var winston = require('winston');
var config = require('../config/config');
require('winston-daily-rotate-file');

//set up logging
var logger = new(winston.Logger)({
    level: config.logging.logLevel,
    transports: [
        new(winston.transports.Console)(),
        new(winston.transports.DailyRotateFile)({ filename: config.logging.logFile, prepend: true })
    ]
});

var changeOwner = {
    changeAppObjectOwner: function(body, appInfo) {
        return new Promise(function(resolve, reject) {
            logger.info("Starting App Object Ownership Change.", { module: "changeOwner", app: appInfo.name , owner: appInfo.ownerId});
            var x = {};
            console.log(body);
            var postPath = "/selection";
            return qrsInteract.Post(postPath, body, 'json')
            .then(function(selection) {
                console.log("selection id = " + selection.body.id);
                x.selectionId = selection.body.id;
                var tagPath = "/tag?filter=name eq 'gms'";
                return qrsInteract.Get(tagPath);
            }).then(function(tags) {
                console.log("tagging it");
                if (tags.body.length == 0) {
                    reject("Tag does not exist");
                } else {
                    x.tagId = tags.body[0].id;
                }
            })
            .then(function() {
                var body = {
                    "latestModifiedDate": buildModDate(),
                    "type": "App.Object",
                    "properties": [{
                            "name": "owner",
                            "value": appInfo.ownerId,
                            "valueIsDifferent": false,
                            "valueIsModified": true
                        },
                        {
                            "name": "refList_Tag",
                            "value": {
                                "added": [x.tagId],
                                "removed": []
                            },
                            "valueIsDifferent": false,
                            "valueIsModified": true
                        },
                        {
                            "name": "approved",
                            "value": true,
                            "valueIsDifferent": false,
                            "valueIsModified": true
                        }
                    ]
                };
                console.log("new body");
                console.log(body);
                var putPath = "/selection/" + x.selectionId + "/app/object/synthetic";

                return qrsInteract.Put(putPath, body)
                    .then(function(sCode) {
                        return sCode.statusCode;
                    })
                    .catch(function(error)
                    {
                        reject(error);
                    });

            })
            .then(function(sCode) {
                logger.info("The response code from the ownership put: " + sCode, { module: "changeOwner", app: appInfo.name });
                if (sCode == 204) {
                    logger.info("Processed Change Ownership Request", { module: "changeOwner", app: appInfo.name });
                    var deletePath = "/selection/" + x.selectionId;
                    return qrsInteract.Delete(deletePath)
                        .then(function(result) {
                            logger.info("Change Ownership Complete", { module: "changeOwner", app: appInfo.name });
                            resolve("Change Ownership Complete");
                        })
                        .catch(function(error) {
                            reject(error);
                        });
                }
            })
            .catch(function(error) {
                reject(error);
            });
        });
    }
};

module.exports = changeOwner;


function buildModDate() {
    var d = new Date();
    return d.toISOString();
}