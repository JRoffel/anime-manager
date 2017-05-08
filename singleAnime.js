"use strict";
let Anime = require('anime-scraper').Anime;
let readline = require('readline');
let async = require('async');
let child_process = require('child_process');
let fs = require('fs');
let fileSanitizer = require('sanitize-filename');
let Promise = require('promise');
let path = require('path');
let cheerio = require('cheerio');
let cloudscraper = require('cloudscraper');

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

let animeName = process.argv[2];
let basePath = process.argv[3];
let maxProcesses = process.argv[4];

Anime.setDelay(10000);

console.log("Searching for anime, this can take up to 10 seconds to prevent kissanime blocking us");
Anime.search(animeName).then((results) => {
    if (results.length == 0) {
        console.log("No anime matching search term found!");
        process.exit();
    }

    results.forEach(function (result, index) {
        console.log(index + 1 + ": " + result.name);
    });

    rl.question("Please enter the number corresponding to the correct anime above: ", (answer) => {
        answer = answer - 1;
        if (answer < 0 || answer > results.length) {
            console.log("Please enter a valid number next time");
            process.exit();
        } else {
            results[answer].toAnime().then((anime) => {
                let dirName = fileSanitizer(anime.name);
                console.log(anime.url);

                let thread = child_process.spawn('node', ['thread.js', anime.url, basePath, maxProcesses]);
                thread.stdout.pipe(process.stdout);
                thread.stderr.pipe(process.stderr);
                thread.on('close', (code) => {
                    process.exit(code);
                })
            })
        }
    })
}, (err) => {
    console.log(err);
});