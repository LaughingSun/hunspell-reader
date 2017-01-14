#!/usr/bin/env node
"use strict";
const commander = require("commander");
const HunspellReader_1 = require("./HunspellReader");
const findup = require('findup-sync');
const fs = require("fs");
const RxNode = require("rx-node");
const fileReader_1 = require("./fileReader");
const trieCompact_1 = require("./trieCompact");
const patternModeler_1 = require("./patternModeler");
const packageInfo = require(findup('package.json'));
const version = packageInfo['version'];
commander
    .version(version);
commander
    .command('words <hunspell_dic_file>')
    .option('-o, --output <file>', 'output file')
    .option('-s, --sort', 'sort the list of words')
    .description('list all the words in the <hunspell.dic> file.')
    .action((hunspellDicFilename, options) => {
    const outputFile = options.output;
    notify('Write words', !!outputFile);
    notify(`Sort: ${options.sort ? 'yes' : 'no'}`, !!outputFile);
    const outputStream = createWriteStream(outputFile);
    const baseFile = hunspellDicFilename.replace(/(\.dic)?$/, '');
    const dicFile = baseFile + '.dic';
    const affFile = baseFile + '.aff';
    notify(`Dic file: ${dicFile}`, !!outputFile);
    notify(`Aff file: ${affFile}`, !!outputFile);
    notify(`Generating Words`, !!outputFile);
    const reader = new HunspellReader_1.HunspellReader(affFile, dicFile);
    const wordsRx = reader.readWords().map(word => word + '\n');
    const wordsOutRx = options.sort ? sortWordListAndRemoveDuplicates(wordsRx) : wordsRx;
    RxNode.writeToStream(wordsOutRx, outputStream, 'UTF-8');
});
commander
    .command('compact <sorted_word_list_file>')
    .option('-o, --output <file>', 'output file')
    .description('compacts the file')
    .action((sortedWordListFilename, options) => {
    const outputFile = options.output;
    const outputStream = createWriteStream(outputFile);
    const lines = fileReader_1.lineReader(sortedWordListFilename);
    const compactStream = trieCompact_1.trieCompactSortedWordList(lines);
    let x;
    patternModeler_1.patternModeler(compactStream).subscribe(node => {
        x = node;
        const stopHere = node;
    }, () => { }, () => {
        const stopHere = x;
    });
    // RxNode.writeToStream(compactStream, outputStream, 'UTF-8');
});
commander.parse(process.argv);
if (!commander.args.length) {
    commander.help();
}
function createWriteStream(filename) {
    return filename ? fs.createWriteStream(filename) : process.stdout;
}
function sortWordListAndRemoveDuplicates(words) {
    return words
        .toArray()
        .concatMap(a => a.sort())
        .scan((acc, word) => ({ prev: acc.word, word }), { prev: '', word: '' })
        .filter(pw => pw.prev !== pw.word)
        .map(pw => pw.word);
}
function notify(message, useStdOut = true) {
    if (useStdOut) {
        console.log(message);
    }
    else {
        console.error(message);
    }
}
//# sourceMappingURL=index.js.map