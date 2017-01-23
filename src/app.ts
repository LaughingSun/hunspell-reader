#!/usr/bin/env node

// cSpell:ignore findup
import * as commander from 'commander';
import { HunspellReader } from './HunspellReader';
const findup = require('findup-sync');
import * as fs from 'fs';
import {lineReader} from './fileReader';
import {trieCompactSortedWordList} from './trieCompact';
import {patternModeler} from './patternModeler';
import {observableToStream} from 'cspell-tools';
import {mkdirp} from 'fs-promise';
import * as Rx from 'rxjs/Rx';
import * as path from 'path';

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
        const pOutputStream = createWriteStream(outputFile);
        const baseFile = hunspellDicFilename.replace(/(\.dic)?$/, '');
        const dicFile = baseFile + '.dic';
        const affFile = baseFile + '.aff';
        notify(`Dic file: ${dicFile}`, !!outputFile);
        notify(`Aff file: ${affFile}`, !!outputFile);
        notify(`Generating Words`, !!outputFile);
        const reader = new HunspellReader(affFile, dicFile);
        const wordsRx = reader.readWords().map(word => word + '\n');
        const wordsOutRx = options.sort ? sortWordListAndRemoveDuplicates(wordsRx) : wordsRx;
        pOutputStream.then(writeStream => {
            observableToStream(wordsOutRx).pipe(writeStream);
        });
    });

commander
    .command('compact <sorted_word_list_file>')
    .option('-o, --output <file>', 'output file')
    .description('compacts the file')
    .action((sortedWordListFilename, options) => {
        const outputFile = options.output;
        // const pOutputStream = createWriteStream(outputFile);
        const lines = lineReader(sortedWordListFilename);
        const compactStream = trieCompactSortedWordList(lines);
        let x: any;
        patternModeler(compactStream).subscribe(
            node => {
                x = node;
                const stopHere = node;
            },
            () => {},
            () => {
                const stopHere = x;
            }
        );
        // RxNode.writeToStream(compactStream, outputStream, 'UTF-8');
    });

commander.parse(process.argv);

if (!commander.args.length) {
    commander.help();
}

function createWriteStream(filename?: string): Promise<fs.WriteStream> {
    return !filename
        ? Promise.resolve(process.stdout)
        : mkdirp(path.dirname(filename)).then(() => fs.createWriteStream(filename));
}

function sortWordListAndRemoveDuplicates(words: Rx.Observable<string>) {
    return words
        .toArray()
        .concatMap(a => a.sort())
        .scan((acc, word) => ({ prev: acc.word, word }), { prev: '', word: '' })
        .filter(pw => pw.prev !== pw.word)
        .map(pw => pw.word);
}

function notify(message: any, useStdOut = true) {
    if (useStdOut) {
        console.log(message);
    } else {
        console.error(message);
    }
}