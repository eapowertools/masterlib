//updatemetrics.js
var qsocks = require('qsocks');
var qsocksInstance = require("./qsocksInstance");
var qrsInteract = require('./qrsInstance');
var Promise = require('bluebird');
var config = require('../config/config');
var winston = require('winston');
var changeOwner = require('./changeOwner');
var publishMetrics = require('./publishMetrics');
var fs = require('fs');
require('winston-daily-rotate-file');

//set up logging
var logger = new(winston.Logger)({
    level: config.logging.logLevel,
    transports: [
        new(winston.transports.Console)(),
        new(winston.transports.DailyRotateFile)({ filename: config.logging.logFile, prepend: true })
    ]
});

var notifiedByRepo = {
    updateRepo: function(notifyObjects) {
        return new Promise(function(resolve, reject) {
            var objects = [];
            //grab the items from the 
            for (var key in notifyObjects) {
                if (Number.isInteger(parseInt(key))) {
                    var result = {
                        "objectID": notifyObjects[key].objectID,
                        "engineID": notifyObjects[key].engineID
                    };
                    objects.push(result);
                }
            }
            console.log(objects);

            //first get the appId for each object from the repo and add it to the objects array
            return Promise.all(objects.map(function(object) {
                    return qrsInteract.Get("/app/object/full?filter=id eq " + object.objectID)
                        .then(function(result) {
                            return qrsInteract.Get("/app/full?filter=id eq " + result.body[0].app.id)
                                .then(function(appInfo) {
                                    object.appId = appInfo.body[0].id;
                                    object.appName = appInfo.body[0].name;
                                    object.ownerId = appInfo.body[0].owner.id;
                                    object.ownerName = "UserDirectory=" + appInfo.body[0].owner.userDirectory + ";UserId=" + appInfo.body[0].owner.userId + ";";
                                    return object;
                                })
                        })
                }))
                .then(function(resultArray) {
                    logger.info(resultArray);
                    //here I have all the information I need to perform my work, but I think I need to create a selection per app which makes the most sense.

                    var appInfos = resultArray.map(function(entry) {
                        return {
                            "id": entry.appId,
                            "name": entry.appName,
                            "ownerId": entry.ownerId
                        };
                    });

                    return Promise.all(appInfos.map(function(appInfo) {
                        var filteredItems = resultArray.filter(function(item) {
                            return item.appId === appInfo.id;
                        });

                        return createBody(filteredItems)
                            .then(function(body) {
                                return changeOwner.changeAppObjectOwner(body, appInfo)
                                    .then(function() {
                                        logger.info("Attempting app object publishing on " + appInfo.name, { module: "notifiedByRepo", method: "updateRepo" });
                                        return publishMetrics.publishMetrics(appInfo);
                                    })
                                    .catch(function(error) {
                                        logger.error(JSON.stringify(error), { module: "notifiedByRepo", method: "updateRepo" });
                                        reject(error);
                                    })
                            })
                    }));
                })
                .then(function() {
                    logger.info("Changed ownership on notified app objects", { module: "notifiedByRepo", method: "updateRepo" });
                    resolve("Changed ownership on notified app objects");
                })
                .catch(function(error) {
                    logger.error(JSON.stringify(error), { module: "notifiedByRepo", method: "updateRepo" });
                    reject(error);
                });
        });
    }
}

module.exports = notifiedByRepo;

function createBody(arrObjects) {
    return new Promise(function(resolve, reject) {
        var resultArray = [];
        var objCount = 0;

        return Promise.all(arrObjects.map(function(item) {
                var object = {
                    "type": "App.Object",
                    "objectID": item.objectID
                };
                return object;
            }))
            .then(function(resultArray) {
                var result = {
                    "items": resultArray
                };
                resolve(result);
            })
            .catch(function(error) {
                reject(error);
            });
    });
}