const Event = require('./event')

function Publisher() {
    var self = this;
}

Publisher.prototype.publishEvent = function(name, source, event_data){
    const event = new Event();
    event.push(name, source, event_data)
    
}

module.exports = Publisher;