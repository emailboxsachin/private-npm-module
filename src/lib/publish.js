const Event = require('../event/event')

function Publisher() {
    var self = this;
}

Publisher.prototype.publishEvent = function(name, source, event_data){
    console.log('publish.publishEvent called')
    const event = new Event();
    return new Promise(function(fulfill, reject) {
        event.push(name, source, event_data)
        .then(function(data){
            console.log("Success ", data.MessageId);
            fulfill(data)
        }).catch(function(err){
            console.log(err)
            reject(err);
        });
    })
}

module.exports = Publisher;