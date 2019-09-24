const dotenv = require('dotenv');
dotenv.config()
const SqsHandler = require('../sqs/sqs-handler')


function Event() {
    var self = this
}

Event.prototype.push = function(name, source, event_data){
    console.log('event.push called')
    const queue = new SqsHandler();
    return new Promise(function(fulfill, reject) {
        queue.push(name,source,event_data)
        .then(function(data){
            console.log("Success ", data.MessageId);
            fulfill(data)
        }).catch(function(err){
            console.log(err)
            reject(err);
        });
    })
}

module.exports = Event;