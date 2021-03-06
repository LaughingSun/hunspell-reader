import * as aff from './affReader';
import { expect } from 'chai';
import * as util from 'util';

const showLog = false;

describe('parse an aff file', () => {
    const filename = __dirname + '/../dictionaries/nl.aff';

    it ('reads an aff file', () => {
        return aff.parseAffFile(filename)
            .then(result => {
                if (showLog) console.log(util.inspect(result, { showHidden: true, depth: 5, colors: true }));
            },
            error => {
                expect(error, 'Error').to.be.empty;
            });
    });
});