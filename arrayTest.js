var async = require('async');

var array = ["1", "2", "3", "4", "5"];

async.eachLimit(array, 2, function(item, callback) {
	array.push(Math.floor(Math.random() * 10) + 1);
	console.log(item);
	callback();
}, function(err) {
	console.log(array);
	console.log("Logged all items in array (impossible cuz infinite)");
	process.exit();
})