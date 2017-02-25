var cloudscraper = require('cloudscraper');
var readline = require('readline');
var Anime = require('anime-scraper').Anime;
var cheerio = require('cheerio');

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.question('Please give your kissanime bookmarklist url: ', (answer) => {
	cloudscraper.get(answer.toString(), function(err, res, body) {
		if(err) {
			throw err;
		} else {
			const $ = cheerio.load(body);
			const result = $(".trAnime td .aAnime").map((i, element) => ({
				url: $(element).attr('href')
			})).get();

			result.forEach(function(url) {
				console.log("Working on: http://kissanime.ru" + url.url + " now!");
				Anime.fromUrl('http://kissanime.ru' + url.url).then(function(anime) {
					anime.episodes.forEach(function(epi) {
						epi.fetch().then(function(episode) {
							console.log(episode.video_links[0].url);
						})
					})
				});
			});
		}
	});
});