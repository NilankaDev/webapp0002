/// <binding Clean='clean' ProjectOpened='default' />

/*
This file in the main entry point for defining Gulp tasks and using Gulp plugins.
Click here to learn more. http://go.microsoft.com/fwlink/?LinkId=518007
*/

var gulp = require("gulp"),
	cssmin = require("gulp-cssmin"),
	uglify = require("gulp-uglify"),
	concat = require("gulp-concat"),
	ts = require("gulp-typescript"),
	print = require("gulp-print"),
	order = require("del"),
	del = require("del"),
	series = require("stream-series"),
	uniqueFiles = require("gulp-unique-files"),
	inject = require("gulp-inject"),
	runSequence = require("run-sequence"),
	ngAnnotate = require("gulp-ng-annotate"),
	filesExist = require("files-exist"),
	gutil = require("gulp-util"),
	gulpTypings = require("gulp-typings");

var root = "./wwwroot";
var destLibs = root + "/libs";
var runtime = root + "/App";

gulp.task("一copy:libs:css", function () {
    return gulp.src(filesExist(libCssFiles)).pipe(gulp.dest(destLibs + "/css"));
});

/** These files will be injected into the website in the order they are listed here */
var libJsFiles = [
		"node_modules/jquery/dist/jquery.min.js",
		"node_modules/moment/min/moment.min.js",
		"node_modules/chartist/dist/chartist.min.js",
		"node_modules/chart.js/dist/Chart.min.js",
		"node_modules/angular/angular.min.js",
		"node_modules/angular-messages/angular-messages.js",

		"node_modules/angular-material/angular-material.min.js",
		"node_modules/angular-busy/dist/angular-busy.min.js",
		"node_modules/angular-loading-bar/build/loading-bar.min.js",

		"node_modules/angular-aria/angular-aria.min.js",
		"node_modules/angular-animate/angular-animate.min.js",
		"node_modules/angular-resource/angular-resource.min.js",
		"node_modules/angular-route/angular-route.min.js",
		"node_modules/angular-cookies/angular-cookies.min.js",
		"node_modules/angular-sanitize/angular-sanitize.min.js",
		"node_modules/angular-chart.js/dist/angular-chart.min.js",
		"node_modules/angular-chartist.js/dist/angular-chartist.js",

		"node_modules/angulartics/dist/angulartics.min.js",
		"node_modules/angulartics-google-analytics/dist/angulartics-ga.min.js",
		"node_modules/c3-angular/c3-angular.min.js"

];
function getJsLibFilenames() {
    var libFiles = [];
    // Remove any previous fluff to just get the important info
    for (var i = 0; i < libJsFiles.length; i++) {
        libFiles.push(destLibs + "/scripts" + libJsFiles[i].substr(libJsFiles[i].lastIndexOf("/")));
    }
    return libFiles;
}
var libCssFiles = [
		"node_modules/angular-material/angular-material.min.css",
		"node_modules/angular-busy/dist/angular-busy.min.css",
		"node_modules/angular-loading-bar/build/loading-bar.min.css",
		"node_modules/chartist/dist/chartist.min.css"
];

function getCSSLibFilenames() {
    var libFiles = [];
    // Remove any previous fluff to just get the important info
    for (var i = 0; i < libCssFiles.length; i++) {
        libFiles.push(destLibs + "/scripts" + libCssFiles[i].substr(libCssFiles[i].lastIndexOf("/")));
    }
    return libFiles;
}

/** Gets the ordered app filestream in the order required to compile correctly 
 * @returns {string[]} of filenames
 */
function getAppFilestream() {
    return series(
						gulp.src([runtime + "/**/*.css"], { read: false }),
						gulp.src([runtime + "/App.js"], { read: false }),
						gulp.src([runtime + "/Factories/**/*.js"], { read: false }),
						gulp.src([runtime + "/Configuration/**/*.js"], { read: false }),
						gulp.src([runtime + "/**/*.js"], { read: false })
					).pipe(uniqueFiles());
}

gulp.task("一copy:libs:js", function () {
    return gulp.src(filesExist(libJsFiles))
		.pipe(gulp.dest(destLibs + "/scripts"));
});



gulp.task("一min:js", function () {
    return series(gulp.src(getJsLibFilenames()), getAppFilestream())
	.pipe(concat("bundled.min.js"))
	.pipe(uglify())
	.pipe(gulp.dest(root));
});


gulp.task("一min:css", function () {
    return series(gulp.src(getCSSLibFilenames()), gulp.src([runtime + "/**/*.css"]))
		.pipe(concat("bundled.min.css"))
		.pipe(cssmin())
		.pipe(gulp.dest(root));
});

function visualStudioReporter() {
    return {
        error: function (error) {
            //This works
            gutil.log("Typescript: error", error.message);
            //This isn't shown
            console.error(error.message);
        },
        finish: ts.reporter.defaultReporter().finish
    };
}

//var tsProject = ts.createProject(runtime + "/tsconfig.json");
//gulp.task("一compile:ts", function (done) {
//    return gulp.src([
//			"typings/browser.d.ts",
//			runtime + "/**/*.ts"
//    ], { base: root })
//		.pipe(tsProject(visualStudioReporter()))
//		.js /* Gets the JS portion*/
//		.pipe(ngAnnotate())
//		.pipe(gulp.dest(root));
//});



//gulp.task("一watch:ts", function () {
//    return gulp.watch(runtime + "/**/*.ts", function () { runSequence("一inject:scripts:into:index"); });
//});

gulp.task("一inject:scripts:into:index", function () {
    var libStream = series(
			gulp.src(getJsLibFilenames(), { read: false }),
			gulp.src(getCSSLibFilenames(), { read: false }),
			//TODO get rid of this line
			gulp.src([root + "/**/*.css", "!" + runtime + "/**", "!" + root + "/bundled*"], { read: false })
		);

    var fileStream = series(libStream, getAppFilestream()).pipe(uniqueFiles());

    return gulp.src(root + "/index.html")
		.pipe(inject(fileStream, { relative: true }))
		.pipe(gulp.dest(root));
});

gulp.task("installTypings", function () {
    var stream = gulp.src("./typings.json")
		.pipe(gulpTypings()); //will install all typingsfiles in pipeline. 
    return stream; // by returning stream gulp can listen to events from the stream and knows when it is finished. 
});


//gulp.task("compile", ["一compile:ts"]);
gulp.task("copy:to:wwwroot", function () { runSequence(["一copy:libs:js", "一copy:libs:css"], "一inject:scripts:into:index"); });

gulp.task("watch", ["一watch:ts"]);

gulp.task("clean", function () { return del(["./**/desktop.ini", runtime + "/**/*.js", runtime + "/**/*.js**.map", destLibs + "/**/*.*", root + "/bundled*.*"]); });

gulp.task("build", function () { runSequence("clean", "copy:to:wwwroot", "min"); });

gulp.task("default", ["build", "watch"]);

gulp.task("min", function () { runSequence("copy:to:wwwroot", "一min:js", "一min:css"); });
