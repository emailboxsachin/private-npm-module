const Event = require('./event')

function Publisher() {
    var self = this;
}

Publisher.prototype.publishEvent = function(name, source, event_data){
    const event = new Event(name, source, event_data);
    event.push()
    
}

module.exports = Publisher;