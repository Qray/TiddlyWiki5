/*\
title: $:/core/modules/macros/version.js
type: application/javascript
module-type: macro

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.info = {
	name: "version",
	params: {
	}
};

exports.executeMacro = function() {
	return [$tw.Tree.Text($tw.utils.getVersionString())];
};

})();
