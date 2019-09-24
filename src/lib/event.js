const dotenv = require('dotenv');
dotenv.config()
const SqsHandler = require('./sqs-handler')


function Event() {
    var self = this
}

Event.prototype.push = function(name, source, event_data){
    console.log('event.push called')
    const queue = new SqsHandler();
    queue.push(name,source,event_data);
}

module.exports = Event;