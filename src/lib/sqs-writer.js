var One = require('./1.js')
function SqsWriter(options) {
	var self = this;
	options = options || {};
	self.prefix = process.env.SERVER_ENV || 'dev';
	self.max_receive_count = options.max_receive_count || 5;
	self.sqs = new AWS.SQS({
		endpoint: process.env.SQS_AWS_ENDPOINT,
		maxRetries: 10
	});
	self.log = options.log;
	//retry configuration
	self.operation = retry.operation({
		retries: 10, // try 1 time and retry 10 times if needed, total = 11
		minTimeout: 10 * 1000, // the number of milliseconds before starting the first retry
		maxTimeout: 20 * 1000 // the maximum number of milliseconds between two retries
	});

	self.queue_urls = {};
}


SqsWriter.prototype.write = function(queue_name, queue_data, callback) {
    var o = new One()
    o.print()
	var self = this;
	queue_name = self.getQueueNameLocalised(queue_name);

	self.operation.attempt(function(currentAttempt) {
		self.sendMessage(queue_name, queue_data, function(err, result) {
			if (err instanceof CommunicationError // test if is a transient error - optional
				&& self.operation.retry(err)) { // test if is retriable and retry if needed
				return;
			}
			callback(err ? self.operation.mainError() : null, result);
		});
	});
}


module.exports = SqsWriter;