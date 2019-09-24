var AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();


function SqsHandler(name, source, event_data) {
    var self = this; 
    self._name = name
    self._source = source
    self._event_data = event_data
    self.sqs = new AWS.SQS({
        apiVersion: process.env.APIVERSION,
        region: process.env.REGION
    });
}

SqsHandler.prototype.push = function(){
    var params = {
        DelaySeconds: process.env.DELAYSECONDS,
        MessageBody: self._event_data,
        QueueUrl: process.env.QUEUEURL
    };
    return new Promise(function(fulfill, reject) {
        self.sqs.sendMessage(params, function(err, data) {
            if (err) {
                reject(err);
            } else {
                fulfill(data)
            }
        });
    })    
}

module.exports = SqsHandler;