var cloudscraper = require('cloudscraper');
var readline = require('readline');
var Anime = require('anime-scraper').Anime;
var cheerio = require('cheerio');
var fs = require('fs');
var https = require('https');
var fileSanitizer = require('sanitize-filename');
var path = require('path');
var async = require('async');
var request = require('request');

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var basePath;

rl.question('Where do you want the downloader to save all your anime? ', (answer) => {
	if(fs.existsSync(answer) == false) {
		console.log("Error, the path provided does not match any existing path!");
		process.exit();
	} else {
		if(fs.lstatSync(answer).isDirectory() == false) {
			console.log("Cannot use file as directory");
			process.exit();
		} else {
			basePath = answer;
			getAnime();
		}
	}
});

function getAnime() {	
	rl.question('Please give your kissanime bookmarklist url: ', (answer) => {
		cloudscraper.get(answer.toString(), function(err, res, body) {
			if(err) {
				throw err;
			} else {
				const $ = cheerio.load(body);
				const result = $(".trAnime td .aAnime").map((i, element) => ({
					url: $(element).attr('href')
				})).get();

				// result.forEach(function(url) {
				// 	console.log("Working on: http://kissanime.ru" + url.url + " now!");
				// 	Anime.fromUrl('http://kissanime.ru' + url.url).then(function(anime) {
				// 		dirName = fileSanitizer(anime.name);
				// 		if(!fs.existsSync(path.join(basePath, dirName))) {
				// 			fs.mkdirSync(path.join(basePath, dirName));
				// 		}
				// 		anime.episodes.forEach(function(epi) {
				// 			epi.fetch().then(function(episode) {
				// 				episodeName = fileSanitizer(episode.name);
				// 				if(!fs.existsSync(path.join(basePath, dirName, episodeName + ".mp4"))) {
				// 					var file = fs.createWriteStream(path.join(basePath, dirName, episodeName + ".mp4"));
				// 					console.log("Downloading to: " + path.join(basePath, dirName, episodeName));
				// 					var req = https.get(episode.video_links[0].url, function(res) {
				// 						res.pipe(file);
				// 					});
				// 				} else {
				// 					console.log("Skipping: " + episodeName + " Because it already exists");
				// 				}
				// 			});
				// 		})
				// 	});
				// });

				async.eachSeries(result, function(url, callback) {
					console.log("Working on: http://kissanime.ru" + url.url + " now!");
					Anime.fromUrl('http://kissanime.ru' + url.url).then(function(anime) {
						dirName = fileSanitizer(anime.name);
						if(!fs.existsSync(path.join(basePath, dirName))) {
							fs.mkdirSync(path.join(basePath, dirName));
						}
						async.eachSeries(anime.episodes, function(epi, cb) {
							epi.fetch().then(function(episode) {
								episodeName = fileSanitizer(episode.name);
								if(!fs.existsSync(path.join(basePath, dirName, episodeName + ".mp4"))) {
									var file = fs.createWriteStream(path.join(basePath, dirName, episodeName + ".mp4"));
									console.log("Downloading: " + path.join(basePath, dirName, episodeName));
									var options = {
										hostname: episode.video_links[0].url,
										method: 'GET'
									}
									request(episode.video_links[0].url).pipe(file);
									cb(null);
								} else {
									console.log("Skipping: " + episodeName + " Becasue it already exists");
								}
							});
						});
						callback(null);
					});
				});
			}
		});
	});
}