const retry = require('retry'),
	AWS = require('aws-sdk'),
	lodash = require('lodash');

// define a custom error
function CommunicationError() {}
function BatchFailedError() {}

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

SqsWriter.prototype.getQueueNameLocalised = function(queue_name) {
	var self = this;
	return self.prefix + '_' + queue_name;
}

SqsWriter.prototype.write = function(queue_name, queue_data, callback) {
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

SqsWriter.prototype.getDeadLetterQueueArnCreateIfQueueNotExists = function(queue_name, cb) {
	var self = this;

	var params = {
		QueueName: "dead_letter_" + queue_name,
		Attributes: {
			VisibilityTimeout: '40'
		}

	};
	var op = retry.operation({
		retries: 5, //total = 6
		minTimeout: 1 * 1000, // the number of milliseconds before starting the first retry
		maxTimeout: 3 * 1000 // the maximum number of milliseconds between two retries
	});

	op.attempt(function(currentAttempt) {
		//SQS creates Queue if it does not exists
		self.sqs.createQueue(params, function(err, data) {
			if (err && op.retry(err)) {
				console.log(err, err.stack); // an error occurred
				return;
			}

			if (err) {
				return cb(op.mainError());
			} else {

				var dead_letter_params = {
					AttributeNames: [
						"QueueArn"
					],
					QueueUrl: data.QueueUrl
				};

				var op2 = retry.operation({
					retries: 5, //total = 6
					minTimeout: 1 * 1000, // the number of milliseconds before starting the first retry
					maxTimeout: 3 * 1000 // the maximum number of milliseconds between two retries
				});

				op2.attempt(function(currAttempt) {
					self.sqs.getQueueAttributes(dead_letter_params, function(err, data) {
						if (err && op2.retry(err)) {
							console.log(err, err.stack); // an error occurred
							return;
						}

						cb(err ? op2.mainError() : null, data.Attributes.QueueArn);
					});
				});
			}
		});
	});
}

SqsWriter.prototype.getQueueUrlCreateIfQueueNotExists = function(queue_name, DeadLetterQueueArn, cb) {
	var self = this;
	var maxReceiveCount = self.max_receive_count;

	if (undefined === self.queue_urls[queue_name]) {
		var params = {
			QueueName: queue_name,
			Attributes: {
				VisibilityTimeout: '40',
				RedrivePolicy: "{\"deadLetterTargetArn\":\"" + DeadLetterQueueArn + "\",\"maxReceiveCount\":\"" + maxReceiveCount + "\"}"
			}

		};
		var op = retry.operation({
			retries: 5, //total = 6
			minTimeout: 1 * 1000, // the number of milliseconds before starting the first retry
			maxTimeout: 3 * 1000 // the maximum number of milliseconds between two retries
		});

		op.attempt(function(currentAttempt) {
			//SQS creates Queue if it does not exists
			self.sqs.createQueue(params, function(err, data) {
				if (err && op.retry(err)) {
					console.log(err, err.stack); // an error occurred
					return;
				}

				cb(err ? op.operation.mainError() : null, data.QueueUrl);
			});
		});
	} else {
		return cb(null, self.queue_urls[queue_name]);
	}
}


SqsWriter.prototype.getQueueUrl = function(queue_name, cb) {
	var self = this;

	self.getDeadLetterQueueArnCreateIfQueueNotExists(queue_name, function(err, DeadLetterQueueArn) {
		if (err) {
			return cb(err);
		} else {
			self.getQueueUrlCreateIfQueueNotExists(queue_name, DeadLetterQueueArn, function(err, url) {
				if (err) {
					return cb(err);
				} else {
					self.queue_urls[queue_name] = url;
					return cb(null, url);
				}
			});
		}
	});
}

SqsWriter.prototype.sendMessage = function(queue_name, queue_data, callback) {
	var self = this;

	self.getQueueUrl(queue_name, function(err, url) {
		if (err) {
			callback(err);
		} else {
			var params = {
				MessageBody: queue_data,
				/* required */
				QueueUrl: url,
				/* required */
				DelaySeconds: 0
			};
			self.sqs.sendMessage(params, function(err, data) {
				callback(err ? new CommunicationError() : null, data);
			});
		}
	});
};

SqsWriter.prototype.writeBatchData = function(queueName, queueData, callback) {
	const self = this;
	const localQueueName = self.getQueueNameLocalised(queueName);
	let batchData = lodash.cloneDeep(queueData);

	let op = retry.operation({
		retries: 3, // total = 4
		minTimeout: 1 * 1000, // the number of milliseconds before starting the first retry
		maxTimeout: 2 * 1000 // the maximum number of milliseconds between two retries
	});

	op.attempt(function(currentAttempt) {

		self.sendMessageBatch(localQueueName, batchData, function(err, result) {

			if (err instanceof BatchFailedError && !lodash.isEmpty(result)) {
				batchData = lodash.filter(batchData, function(row) {
					return lodash.includes(result, row.Id)
				});
			}

			if (err && op.retry(err)) {
				return;
			}

			callback(err ? op.mainError() : null, result);
		});

	});
};

SqsWriter.prototype.sendMessageBatch = function(queueName, queueData, callback) {
	const self = this;
	let failedIds = [];
	self.getQueueUrl(queueName, function(err, url) {
		if (err) {
			callback(err, []);
		} else {
			var params = {
				Entries: queueData,
				/* required */
				QueueUrl: url
			};
			self.sqs.sendMessageBatch(params, function(err, data) {
				if (err) {
					callback(err, []);
				} else {
					let failedMessages = data.Failed || [];
					if (!lodash.isEmpty(failedMessages) && self.log) {
						self.log.error("Failed Batch Messages :", failedMessages);
					}
					failedIds = lodash.map(failedMessages, 'Id');
					callback(failedIds.length ? new BatchFailedError() : null, failedIds);
				}
			});
		}
	});
};

module.exports = SqsWriter;