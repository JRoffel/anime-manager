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
var sleep = require('sleep');
var ObservableArray = require('observable-array');

Anime.setDelay(10000);
var animeLink = process.argv[2];
var basePath = process.argv[3];
var maxProcesses = process.argv[4] || 5;
var iterator = 0;
var activeProcesses = 0;
var animeArray = new ObservableArray();
animeArray.on('change', function(ev) {
	if(activeProcesses < maxProcesses && animeArray.length != 0) {
		activeProcesses++;
		spawnDownloadProcess(animeArray.shift(), function(name, success) {
			if(success) {
				process.stdout.write("Successfully downloaded " + name);
			} else {
				process.stdout.write("Failed to download " + name);
			}
			activeProcesses--;
		});
	}
})

cloudscraper.get(animeLink.toString(), function(err, res, body) {
	if(err) {
		throw err;
	} else {
		const $ = cheerio.load(body);
		const result = $(".trAnime td .aAnime").map((i, element) => ({
			url: $(element).attr('href');
		})).get();

		async.eachSeries(result, function(url, callback) {
			process.stdout.write("Indexing episodes of http://kissanime.ru" +url.url+ " for downloadqueue");
			Anime.fromUrl('http://kissanime.ru' + url.url).then(function(anime) {
				dirName = fileSanitizer(anime.name);
				
				if(!fs.existsSync(path.join(basePath, dirName))) {
					fs.mkdirSync(path.join(basePath, dirName));
				}

				async.eachSeries(anime.episodes, function(epi, cb) {
					epi.fetch().then(function(episode) {
						episodeName = fileSanitizer(episode.name);
						var episodePath = path.join(basePath, dirName, episodeName + ".mp4");

						var animeObject = {
							url: episode.video_links[0].url,
							path: episodePath
						};

						animeArray.push(animeObject);
						cb();
					});
				}, function(err) {
					callback();
				});
			});
		}, function(err) {
			process.stdout.write("Collection done: monitoring download progress \n");
			setInterval(function() {
				readline.clearLine();
				readline.cursorTo(0);
				process.stdout.write(animeArray.length + " episodes still in download queue");
				if(activeProcesses < maxProcesses && animeArray.length != 0) {
					activeProcesses++;
					spawnDownloadProcess(animeArray.shift(), function(name, success) {
						activeProcesses--;
					});
				} else if(animeArray.length == 0) {
					process.stdout.write("All episodes downloaded, running integrity checks now!");
					checkFileIntegrity(function() {
						process.exit();
					});
				}
			}, 5000);
		});
	}
});

//TODO: Make function that implements singleDownloader.js with children
function spawnDownloadProcess(animeObject, callback) {
	var thread = child_process.spawn('node', ['singleDownloader.js', animeObject.url, animeObject.path]);

	thread.stdout.pipe(process.stdout);
	thread.stderr.pipe(process.stdout);
	thread.on('close' (code) => {
		if(code != 0) {
			iterator++;
		}
		callback(animeObject.path, (code == 0));
	});
}

function checkFileIntegrity(callback) {
	fs.readdir(basePath, function(err, dirs) {
		if(err) {
			process.stdout.write("Unable to verify files!");
			process.exit(1);
		}

		async.each(dirs, function(item, callback) {
			if(!fs.lstatSync(item).isDirectory()) {
				process.stdout.write("Tried to check a file as a directory, was this directory in use?");
				callback();
			} else if(fs.lstatSync(item).isDirectory()) {
				fs.readdir(item, function(err, files) {
					if(err) {
						process.stdout.write("Unable to read discovered directory: " + item + ". Do we not have access?");
						callback();
					} else {
						async.each(files, function(episode, cb) {
							if(fs.statSync(episode).size < 10000000.0) {
								fs.unlinkSync(episode);
								process.stdout.write("Removed " + episode + " because it failed the integrity checks!");
							} else {
								process.stdout.write("verified integrity of " + episode + ". Seems to be valid!");
							}
							cb();
						}, function(err) {
							callback();
						});
					}
				});
			}
		}, function(err) {
			process.stdout.write("Verified all items!");
			callback();
		})
	})
}