'use strict';

// expose same methods as base
var base = module.superModule;
if (base) {
    Object.keys(base).forEach(function (key) {
        module.exports[key] = base[key];
    });
}

/**
 * Adds one or more notes on the specified basket or order, ensuring that each note contains no more than 4000 characters.
 * @param {dw.order.LineItemCtnr} lineItemCtnr - The basket or order.
 * @param {string} subject - The subject of the note.
 * @param {string} text - The text of the note.
 * @param {number} maxNotes - Only add the note if less than this amount of notes is present on the order. Optional, the default is 500.
 */
function addOrderNotes(lineItemCtnr, subject, text, maxNotes) {
    if (lineItemCtnr.notes.length < (maxNotes || 500)) {
        var Transaction = require('dw/system/Transaction');
        var msg = text || '';
        Transaction.wrap(function () {
            var nr = 1;
            do {
                lineItemCtnr.addNote(subject + (msg.length > 4000 || nr > 1 ? ' (' + nr + ')' : ''), msg.substr(0, 4000));
                msg = msg.substr(4000);
                nr++;
            } while (msg.length > 0);
        });
    }
}
module.exports.addOrderNotes = addOrderNotes;
