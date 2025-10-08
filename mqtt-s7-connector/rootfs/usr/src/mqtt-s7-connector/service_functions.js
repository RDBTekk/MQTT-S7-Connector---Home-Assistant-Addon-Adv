// Log levels:
// 0: Trace
// 1: Debug
// 2: Info
// 3: Notice
// 4: Warning
// 5: Error 	> Exit program
// 6: Fatal		> Exit program

function datetime() {
	let ts = Date.now();

	let date_time = new Date(ts);
	let date = date_time.getDate();
	let month = date_time.getMonth() + 1;
	let year = date_time.getFullYear();
	let hour = date_time.getHours();
	let minute = date_time.getMinutes();
	let second = date_time.getSeconds();

	return year + "-" + month + "-" + date + " " + hour + ":" + minute + ":" + second;
}

module.exports.trace = function trace(msg) {
	if (global.log_level < 1) {
		console.log(datetime() + " ## TRACE   ## " + msg);
	}
}

module.exports.debug = function debug(msg) {
	if (global.log_level <= 1) {
		console.log(datetime() + " ## DEBUG   ## " + msg);
	}
}

module.exports.info = function info(msg) {
	if (global.log_level <= 2) {
		console.log(datetime() + " ## INFO    ## " + msg);
	}
}

module.exports.notice = function notice(msg) {
	if (global.log_level <= 3) {
		console.log(datetime() + " ## NOTICE  ## " + msg);
	}
}

module.exports.warning = function warning(msg) {
	if (global.log_level <= 4) {
		console.log(datetime() + " ## WARNING ## " + msg);
	}
}

module.exports.error = function error(msg) {
	if (global.log_level <= 5) {
		console.log(datetime() + " ## ERROR  ## " + msg)
		throw new Error(msg);
	}
	process.exit(-1);
}

module.exports.fatal = function fatal(msg) {
	console.log(datetime() + " ## FATAL  ## " + msg)
	throw new Error(msg);
}