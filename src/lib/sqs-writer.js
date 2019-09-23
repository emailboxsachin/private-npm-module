var One = require('./1.js')
function SqsWriter(options) {
	var self = this;	
}


SqsWriter.prototype.write = function(queue_name, queue_data, callback) {
    var o = new One()
    o.print()
	console.log('from write')
}


module.exports = SqsWriter;