var Anime = require('anime-scraper').Anime;
var fileSanitizer = require('sanitize-filename');
var fs = require('fs');
var async = require('async');
var request = require('request');
var path = require('path');

var basePath = process.argv[3];
var maxDownloads = process.argv[4] || 1;
// Anime.setDelay(10000);

Anime.fromUrl(process.argv[2]).then(function (anime) {
	dirName = fileSanitizer(anime.name);
	if (!fs.existsSync(path.join(basePath, dirName))) {
		fs.mkdirSync(path.join(basePath, dirName));
	}
	async.eachLimit(anime.episodes, maxDownloads, function (epi, cb) {
		epi.fetch().then(function (episode) {
			console.log(episode);
			episodeName = fileSanitizer(episode.name);
			if (!fs.existsSync(path.join(basePath, dirName, episodeName + ".mp4")) && episode.videoLinks.length != 0) {
				var req = request(episode.videoLinks[0].url)
					.on('response', function (res) {
						file = fs.createWriteStream(path.join(basePath, dirName, episodeName + ".mp4"));
						res.pipe(file);
					})
					.on('error', function () {
						process.stderr.write("Failed to download: " + episodeName + " Please run the program again after it finishes");
						fs.unlinkSync(path.join(basePath, dirName, episodeName + ".mp4"));
					})
					.on('end', function () {
						if (fs.existsSync(path.join(basePath, dirName, episodeName + ".mp4"))) {
							process.stdout.write("Downloaded: " + episodeName);
						}
						cb(null);
					})
			} else if (episode.videoLinks.length == 0) {
				console.log("Skipping: " + episodeName + " because no downloadLink could be discovered");
			} else {
				process.stdout.write("Skipping: " + episodeName + " because it already exists");
				cb(null);
			}
		});
	}, function (err) {
		process.exit();
	})
});