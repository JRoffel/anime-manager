var fs = require('fs');
var request = require('request');

var req = request(process.argv[2])
.on('response', function(res) {
	file = fs.createWriteStream(process.argv[3]);
	res.pipe(file);
})
.on('error', function() {
	process.stdout.write("Failed to download: " + process.argv[3] + " please run the program again after it finishes \n");
	fs.unlinkSync(process.argv[3]);
})
.on('end', function() {
	if(fs.existsSync(process.argv[3])) {
		process.stdout.write("Downloaded " + process.argv[3] + "\n");
		process.exit();
	} else {
		process.exit(1);
	}
})