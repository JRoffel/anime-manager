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
var child_process = require('child_process');
var storage = require('node-persist');

Anime.setDelay(10000);
var basePath = process.argv[3];
var maxProcesses = process.argv[4] || 5;
var animeArray = [];
var iterator = 0;
storage.initSync();
if(storage.getItemSync('animeArray') != null || storage.getItemSync('animeArray') != undefined || storage.getItemSync('animeArray') != []) {
	spawnProcesses(function() {
		storage.clearSync();
		storage.setItemSync('animeArray', []);
		gatherArray();
	});
} else {
	storage.setItemSync('animeArray', []);
	gatherArray();
}

function gatherArray() {
	cloudscraper.get(process.argv[2], function(err, res, body) {
		if(err) {
			process.exit(1);
		} else {
			const $ = cheerio.load(body);
			const result = $(".trAnime td .aAnime").map((i, element) => ({
				url: $(element).attr('href')
			})).get();

			async.eachSeries(result, function(url, callback) {
				process.stdout.write("Adding http://kissanime.ru" + url.url + " to job list!");
				Anime.fromUrl("http://kissanime.ru" + url.url).then(function(anime) {
					dirName = fileSanitizer(anime.name);
					if(!fs.existsSync(path.join(basePath, dirName))) {
						fs.mkdirSync(path.join(basePath, dirName));
					}
					async.eachSeries(anime.episodes, function(epi, cb) {
						epi.fetch().then(function(episode) {
							episodeName = fileSanitizer(episode.name);
							if(!fs.existsSync(path.join(basePath, dirName, episodeName + ".mp4"))) {
								process.stdout.write("Adding " + episodeName + " to downloadList");
								var temp = storage.getItemSync('animeArray');
								temp.push({
									url: episode.video_links[0],
									fileName: path.join(basePath, dirName, episodeName + ".mp4")
								});
								storage.setItemSync('animeArray', temp);
								cb(null);
							} else {
								process.stdout.write("Not adding " + episodeName + " because it already exists!");
								cb(null);
							}
						});
					}, function(err) {
						callback(null);
					})
				})
			}, function(err) {
				process.stdout.write("Indexed all anime in bookmarklist, spawning download processes now!");
				spawnProcesses(function() {
					storage.clearSync();
					process.stdout.write("Processed finished with " + iterator + " fails");
					process.exit();
				});
			});
		}
	});
}

function spawnProcesses(callback) {
	async.eachLimit(animeArray, maxProcesses, function(animeObject, callback) {
		thread = child_process.spawn('node', ['singleDownloader.js', animeObject.url, animeObject.fileName]);
		thread.stdout.on('data', (data) => {
			process.stdout.write(data.toString());
		});

		thread.stderr.on('data', (data) => {
			process.stdout.write(data.toString());
			iterator++;
		});

		thread.on('close', (code) => {
			if(code == 0) {
				process.stdout.write("Anime saved in: " + animeObject.fileName);
				callback();
			} else if(code == 1) {
				iterator++;
			}
		});
	}, function(err) {
		callback();
	});
}