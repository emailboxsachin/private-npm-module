const dotenv = require('dotenv');
dotenv.config()
const SqsHandler = require('./sqsHandler')


function Event(name, source, event_data) {
    var self = this
    self._name = name
    self._source = source
    self._event_data = event_data
}

Event.prototype.push = function(){
    const queue = new SqsHandler(self._name,self._source,self._event_data);
    queue.push();
}

module.exports = Event;