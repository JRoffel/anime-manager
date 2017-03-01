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
	//TODO: Double check logic on if statement and process counter (Do this when awake)
	if(activeProcesses < maxProcesses && animeArray.length != 0) {
		activeProcesses++;
		spawnDownloadProcess(animeArray.shift(), function(name, success) {
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
						//TODO: Fill in path
						var animeObject = {
							url: episode.video_links[0].url,
							path: 
						}
					});
				});
			});
		});
	}
});

//TODO: Make function that implements singleDownloader.js with children
function spawnDownloadProcess() {

}