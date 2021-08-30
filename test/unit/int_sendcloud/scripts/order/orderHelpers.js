'use strict';

/* global describe it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('orderHelpers', function () {
    var inTransaction = false;

    var orderHelpers = proxyquire('../../../../../cartridges/int_sendcloud/cartridge/scripts/order/orderHelpers', {
        'dw/system/Transaction': {
            wrap: function (func) {
                inTransaction = true;
                var result = func();
                inTransaction = false;
                return result;
            }
        }
    });

    describe('addOrderNotes', function () {
        it('Should add 1 note if no text is supplied', function () {
            var notes = [];
            var lineItemCtnr = {
                addNote: function (subj, txt) {
                    if (!inTransaction) assert.fail('Note should be added in a transaction');
                    notes.push({ subject: subj, text: txt });
                },
                notes: { length: 10 }
            };
            orderHelpers.addOrderNotes(lineItemCtnr, 'SUBJECT');
            assert.equal(notes.length, 1, 'A note should be added');
            assert.equal(notes[0].subject, 'SUBJECT', 'The subject is not correct');
            assert.equal(notes[0].text, '', 'The text is not correct');
        });

        it('Should add 1 note if short text is supplied', function () {
            var notes = [];
            var lineItemCtnr = {
                addNote: function (subj, txt) {
                    if (!inTransaction) assert.fail('Note should be added in a transaction');
                    notes.push({ subject: subj, text: txt });
                },
                notes: { length: 10 }
            };
            orderHelpers.addOrderNotes(lineItemCtnr, 'SUBJECT', 'TEXT');
            assert.equal(notes.length, 1, 'A note should be added');
            assert.equal(notes[0].subject, 'SUBJECT', 'The subject is not correct');
            assert.equal(notes[0].text, 'TEXT', 'The text is not correct');
        });

        it('Should add 1 note if text with length 4000 is supplied', function () {
            var text = 'a'.repeat(4000);
            var notes = [];
            var lineItemCtnr = {
                addNote: function (subj, txt) {
                    if (!inTransaction) assert.fail('Note should be added in a transaction');
                    notes.push({ subject: subj, text: txt });
                },
                notes: { length: 10 }
            };
            orderHelpers.addOrderNotes(lineItemCtnr, 'SUBJECT', text);
            assert.equal(notes.length, 1, 'A note should be added');
            assert.equal(notes[0].subject, 'SUBJECT', 'The subject is not correct');
            assert.equal(notes[0].text, text, 'The text is not correct');
        });

        it('Should add 2 notes if text with length 4001 is supplied', function () {
            var partA = 'a'.repeat(4000);
            var partB = 'b';
            var text = partA + partB;
            var notes = [];
            var lineItemCtnr = {
                addNote: function (subj, txt) {
                    if (!inTransaction) assert.fail('Note should be added in a transaction');
                    notes.push({ subject: subj, text: txt });
                },
                notes: { length: 10 }
            };
            orderHelpers.addOrderNotes(lineItemCtnr, 'SUBJECT', text);
            assert.equal(notes.length, 2, 'Two notes should be added');
            assert.equal(notes[0].subject, 'SUBJECT (1)', 'The subject of note 1 is not correct');
            assert.equal(notes[0].text, partA, 'The text of note 1 is not correct');
            assert.equal(notes[1].subject, 'SUBJECT (2)', 'The subject of note 2 is not correct');
            assert.equal(notes[1].text, partB, 'The text of note 2 is not correct');
        });

        it('Should add 3 notes if text longer than 8000 is supplied', function () {
            var partA = 'a'.repeat(4000);
            var partB = 'b'.repeat(4000);
            var partC = 'c'.repeat(2000);
            var text = partA + partB + partC;
            var notes = [];
            var lineItemCtnr = {
                addNote: function (subj, txt) {
                    if (!inTransaction) assert.fail('Note should be added in a transaction');
                    notes.push({ subject: subj, text: txt });
                },
                notes: { length: 10 }
            };
            orderHelpers.addOrderNotes(lineItemCtnr, 'SUBJECT', text);
            assert.equal(notes.length, 3, 'Three notes should be added');
            assert.equal(notes[0].subject, 'SUBJECT (1)', 'The subject of note 1 is not correct');
            assert.equal(notes[0].text, partA, 'The text of note 1 is not correct');
            assert.equal(notes[1].subject, 'SUBJECT (2)', 'The subject of note 2 is not correct');
            assert.equal(notes[1].text, partB, 'The text of note 2 is not correct');
            assert.equal(notes[2].subject, 'SUBJECT (3)', 'The subject of note 3 is not correct');
            assert.equal(notes[2].text, partC, 'The text of note 3 is not correct');
        });

        it('Should add note if max notes has not been reached', function () {
            var notes = [];
            var lineItemCtnr = {
                addNote: function (subj, txt) {
                    if (!inTransaction) assert.fail('Note should be added in a transaction');
                    notes.push({ subject: subj, text: txt });
                },
                notes: { length: 9 }
            };
            orderHelpers.addOrderNotes(lineItemCtnr, 'SUBJECT', 'TEXT', 10);
            assert.equal(notes.length, 1, 'A note should be added');
        });

        it('Should not add note if max notes has been reached', function () {
            var notes = [];
            var lineItemCtnr = {
                addNote: function (subj, txt) {
                    if (!inTransaction) assert.fail('Note should be added in a transaction');
                    notes.push({ subject: subj, text: txt });
                },
                notes: { length: 10 }
            };
            orderHelpers.addOrderNotes(lineItemCtnr, 'SUBJECT', 'TEXT', 10);
            assert.equal(notes.length, 0, 'A note should not be added');
        });

        it('Should add note if default max notes has not been reached', function () {
            var notes = [];
            var lineItemCtnr = {
                addNote: function (subj, txt) {
                    if (!inTransaction) assert.fail('Note should be added in a transaction');
                    notes.push({ subject: subj, text: txt });
                },
                notes: { length: 49 }
            };
            orderHelpers.addOrderNotes(lineItemCtnr, 'SUBJECT', 'TEXT');
            assert.equal(notes.length, 1, 'A note should be added');
        });

        it('Should not add note if default max notes has been reached', function () {
            var notes = [];
            var lineItemCtnr = {
                addNote: function (subj, txt) {
                    if (!inTransaction) assert.fail('Note should be added in a transaction');
                    notes.push({ subject: subj, text: txt });
                },
                notes: { length: 500 }
            };
            orderHelpers.addOrderNotes(lineItemCtnr, 'SUBJECT', 'TEXT');
            assert.equal(notes.length, 0, 'A note should not be added');
        });
    });
});
