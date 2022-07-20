function parseBookAbbrev(abbrev) {
	let bookAbbrev = abbrev.charAt(0).toUpperCase() +
                     abbrev.slice(1);
    if (bookAbbrev === "Job") {
        bookAbbrev = "Jó";
    }
    return bookAbbrev;
}

module.exports = parseBookAbbrev;
