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
var child_process = require('child_process')

Anime.setDelay(10000);

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
	var iterator = 0;
	rl.question('Please give your kissanime bookmarklist url: ', (answer) => {
		if(process.argv[2] == "indexed") {
			if(process.argv[3] != undefined) {
				downloadProcess = child_process.spawn('node', ['arrayCollector.js', answer, basePath, process.argv[3]]);
			} else {
				downloadProcess = child_process.spawn('node', ['arrayCollector.js', answer, basePath]);
			}

			downloadProcess.stdout.on('data', (data) => {
				process.stdout.write(data.toString());
			});

			downloadProcess.stderr.on('data', (data) => {
				process.stdout.write(data.toString());
			});

			downloadProcess.on('close', (code) => {
				process.exit();
			});
		} else {
			cloudscraper.get(answer.toString(), function(err, res, body) {
				if(err) {
					throw err;
				} else {
					const $ = cheerio.load(body);
					const result = $(".trAnime td .aAnime").map((i, element) => ({
						url: $(element).attr('href')
					})).get();
					
					if(process.argv[2] == "multithread") {
						async.eachLimit(result, process.argv[3] || 5, function(url, callback) {
							console.log("Spawning new process to handle: http://kissanime.ru" + url.url + " now!");
							thread = child_process.spawn('node', ['thread.js', 'http://kissanime.ru' + url.url, basePath]);
							thread.stdout.on('data', (data) => {
								console.log(data.toString());
							});

							thread.stderr.on('data', (data) => {
								console.log(data.toString());
								iterator++
							});

							thread.on('close', (code) => {
								if(code == 0) {
									console.log("Finished downloading http://kissanime.ru" + url.url);
									callback();
								}
							})
						}, function(err) {
							console.log("Finished downloading all anime");
							if(iterator > 0) {
								console.log("A total of " + iterator + "downloads failed, you can try to run the application again to see if they download");
							}
							process.exit();
						})
					} else {
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
											var req = request(episode.video_links[0].url)
											.on('response', function(res) {
												file = fs.createWriteStream(path.join(basePath, dirName, episodeName + ".mp4"));
												res.pipe(file);

											})
											.on('error', function() {
												console.log("Failed to download: " + episodeName + " Please run the program again after it finishes");
												iterator++;
												fs.unlinkSync(path.join(basePath, dirName, episodeName + ".mp4"));
											})
											.on('end', function() {
												if(fs.existsSync(path.join(basePath, dirName, episodeName + ".mp4"))) {
													console.log("Downloaded: " + path.join(basePath, dirName, episodeName));
												}
												cb(null);
											})
										} else {
											console.log("Skipping: " + episodeName + " because it already exists");
											cb(null);
										}
									});
								}, function(err) {
									callback(null);
								});
							});
						}, function(err) {
							console.log("Finished downloading all anime");
							if(iterator > 0) {
								console.log("A total of " + iterator + "downloads failed, you can try to run the application again to see if they download");
							}
							process.exit();
						});
					}
				}
			});
		}
	});
}