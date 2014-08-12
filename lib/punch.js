var punch = module.exports = {};
var fs = require("fs");
var jf = require("jsonfile");
var util = require("util");
var moment = require("moment");
(function(moment){
	var plurals = {
		"year":"years",
		"month": "months",
		"day": "days",
		"hour": "hours",
		"minute": "minutes",
		"second": "seconds"
	};
	moment.duration.fn.precise = function() {
		return moment.precise(this);
	};
	moment.precise = function(d) {
		var d = moment.duration(d);
		if (d.minutes() === 0) {
			return d.humanize();
		}

		var durations = [];

		function handle(type) {
			var amount = d.get(type);
			if (amount > 0) {
				if (amount === 1) {
					durations.push(amount + " " + type)
				} else {
					durations.push(amount + " " + plurals[type])
				}
			}
		}
		handle("year");
		handle("month");
		handle("day");
		handle("hour");
		handle("minute");
		handle("second");
		if (durations.length==0){
			return "";
		} else if (durations.length == 1) {
			return durations[0];
		} else {
			return durations.slice(0, durations.length-1).join(", ")
						+ " and " + durations[durations.length-1];
		}
	};
})(moment)


function punchCommand(fun) {
	return function(options) {
		var callback = function(data) {
			options.data = data;
			var ndata = fun(options);
			if (ndata) {
				jf.writeFile(file, ndata, function(err) {
					if (err) { throw err; }
				});
			}
		}

		var file = options.file;
		delete options.file;

		fs.exists(file, function(exists){
			if (!exists) {
				callback({});
			} else {
				jf.readFile(file, function(err, data) {
					if (err) { throw err; } else { callback(data); }
				});
			}
		});
	};
}

function toISODateString(date) { return date ? date.toISOString().substring( 0,10) : null; }
function toISOTimeString(date) { return date ? date.toISOString().substring(11,19) : null; }

var PunchData = function(days) {
	this.days = days || {};
};

PunchData.decode = function(data) {
	var days = {};
	var key;
	data = data || {};
	for (key in data) {
		if (data.hasOwnProperty(key)) {
			days[key] = Day.decode(key, data[key]);
		}
	}
	return new PunchData(days);
};

PunchData.prototype = {
	today: function() {
		var today = toISODateString(new Date());
		var day = this.days[today];
		if (!day) {
			day = this.days[today] = new Day();
		}
		return day;
	},
	encode: function() {
		var day, json = {};
		for (day in this.days) {
			if (this.days.hasOwnProperty(day)) {
				json[day] = this.days[day].encode();
			}
		}
		return json;
	},
	report: function() {
		var day, summary, report = "";
		for (day in this.days) {
			duration = moment.duration()
			if (this.days.hasOwnProperty(day)) {
				summary = this.days[day].summary();
				report += day + " (" + summary.duration.precise() + ")\n";
				for (task in summary.tasks) {
					if (summary.tasks.hasOwnProperty(task)) {
						report += "\t" + task + " (" + summary.tasks[task].precise() + ")\n";
					}
				}


			}
		}
		return report;
	}
};

var Day = function(tasks) {
	this.tasks = tasks || [];
};

Day.decode = function(date, data) {
	var tasks = new Array(data.length);
	var i;
	data = data || [];
	for (i = 0; i < data.length; ++i) {
		tasks[i] = Task.decode(date, data[i]);
	}
	return new Day(tasks);
};

Day.prototype = {
	getTasks: function() {
		return this.tasks;
	},
	getLastTask: function() {
		return this.tasks[this.tasks.length-1];
	},
	isTaskActive: function() {
		var task = this.getLastTask();
		return task && task.isActive();
	},
	add: function(what) {
		var task = new Task(what);
		this.tasks.push(task);
		return task;
	},
	encode: function() {
		var i, json = new Array(this.tasks.length);
		for (i = 0; i < this.tasks.length; ++i) {
			json[i] = this.tasks[i].encode();
		}
		return json;
	},
	summary: function() {
		var i, task, diff, rep = "", summary = {duration: moment.duration(), tasks: {}};
		for (i = 0; i < this.tasks.length; ++i) {
			task = this.tasks[i];
			summary.tasks[task.what] = summary.tasks[task.what] || moment.duration();
			if (task.isActive()) {
				diff = moment().diff(moment(task.begin));
			} else {
				diff = moment(task.end).diff(moment(task.begin));
			}
			summary.tasks[task.what].add(moment.duration(diff));
			summary.duration.add(moment.duration(diff));
		}
		return summary;
	}
};

var Task = function(what, begin, end) {
	this.what = what;
	this.begin = begin;
	this.end = end;
};

Task.decode = function(date, data) {
	var what, begin, end;
	data = data || {};
	data.when = data.when || [];
	what = data.what || "nothing";
	begin = data.when[0] ? new Date(date + "T" + data.when[0]) : null;
	end = data.when[1] ? new Date(date + "T" + data.when[1]) : null;
	return new Task(what, begin, end);
};

Task.prototype = {
	isActive: function() {
		return !this.end;
	},
	getBegin: function() {
		return this.begin;
	},
	getEnd: function() {
		return this.end;
	},
	getWhat: function() {
		return this.what;
	},
	start: function() {
		if (this.begin) throw new Error("This task has already begun.");
		this.begin = new Date();
	},
	stop: function() {
		if (!this.begin) throw new Error("This task has not yet begun.");
		if (this.end) throw new Error("This task is already finished");
		this.end = new Date();
	},
	encode: function() {
		return {
			what: this.what,
			when:[
				toISOTimeString(this.begin),
				toISOTimeString(this.end)
			]
		};
	}
};

punch.status = punchCommand(function(options){
	var data = PunchData.decode(options.data);
	var today = data.today();
	var task = today.getLastTask();
	if (task) {
		if (task.isActive()) {
			console.log(task.what + " (since " + moment(task.begin).fromNow(true) + ")");
		} else {
			console.log("Nothing. " + what + " finished " + moment(task.end).fromNow());
		}
	} else {
		console.log("Nothing.")
	}
})

punch.in = punchCommand(function(options) {
	var data = PunchData.decode(options.data);
	var today = data.today();
	var task = today.getLastTask();
	if (task && task.isActive()) {
		if (task.what === options.what) {
			return;
		} else {
			task.stop();
		}
	}
	today.add(options.what).start();
	return data.encode();
});
punch.out = punchCommand(function(options) {
	var data = PunchData.decode(options.data);
	var today = data.today();
	var task = today.getLastTask();
	if (task && task.isActive()) {
		task.stop();
		return data.encode();
	} else {
		console.error("No task to end");
		process.exit(1);
	}
});
punch.report = punchCommand(function(options) {
	var data = PunchData.decode(options.data);
	console.log(data.report());
});
