var AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

var sqs = new AWS.SQS({
    apiVersion: process.env.APIVERSION,
    region: process.env.REGION
});

function SqsHandler() {
    var self = this; 
}

SqsHandler.prototype.push = function(name,source,event_data){
    var params = {
        DelaySeconds: process.env.DELAYSECONDS,
        MessageBody: event_data,
        QueueUrl: process.env.QUEUEURL
    };
    return new Promise(function(fulfill, reject) {
        sqs.sendMessage(params, function(err, data) {
            if (err) {
                reject(err);
            } else {
                fulfill(data)
            }
        });
    })    
}

module.exports = SqsHandler;