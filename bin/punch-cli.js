#!/usr/bin/env node

var cli = require('cli');
var path = require("path")
var punch = require('../lib/punch')
cli.enable("help", "glob");


var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

cli.parse({
	file: [ "f", "Punch data file", "path", path.join(home, ".punch.json") ]
}, ["in", "out", "what", "status", "report"]);

function checkArgLength(length) {
	if (cli.argc !== length) { cli.getUsage(1); }
}


cli.main(function() {
	var options = {file: this.options.file};
	switch(this.command) {
		case 'in':
			checkArgLength(1);
			options.what = this.args[0];
			return punch.in(options);
		case 'out':
			checkArgLength(0);
			return punch.out(options);
		case 'report':
			checkArgLength(0);
			return punch.report(options);
		case 'status':
		case 'what':
			checkArgLength(0);
			return punch.status(options);
	}
});
