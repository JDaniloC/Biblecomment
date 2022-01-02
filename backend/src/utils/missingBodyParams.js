function isUndefined(variable) {
	return typeof variable === "undefined";
}

function missingBodyParams(variableList) {
	return variableList.filter(isUndefined).length > 0;
}

module.exports = missingBodyParams;
