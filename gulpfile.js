var path = require('path');
var fs = require('fs');
var gulp = require('gulp');
var less = require('gulp-less');
var header = require('gulp-header');
var tap = require('gulp-tap');
var nano = require('gulp-cssnano');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var comments = require('postcss-discard-comments');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var childProcess = require('child_process');
var pkg = require('./package.json');
var convertCssVar = require('gulp-convert-css-var');
var exec = require('child_process').exec;
const { promises } = require('dns');

const { Observable } = require('rxjs');

var yargs = require('yargs').options({
    w: {
        alias: 'watch',
        type: 'boolean',
    },
    s: {
        alias: 'server',
        type: 'boolean',
    },
    p: {
        alias: 'port',
        type: 'number',
    },
}).argv;

var option = { base: 'src' };
var dist = __dirname + '/dist';

function exec(cmd) {
    return new Promise((resolve, reject) => {
        const process = childProcess.exec(cmd, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
        process.stdout.on('data', function(data) {
            console.log(data);
        });
    });
}

gulp.task('build:style', function() {
    var banner = [
        '/*!',
        ' * WeUI v<%= pkg.version %> (<%= pkg.homepage %>)',
        ' * Copyright <%= new Date().getFullYear() %> Tencent, Inc.',
        ' * Licensed under the <%= pkg.license %> license',
        ' */',
        '',
    ].join('\n');
    return gulp
    .src('src/style/weui.less', option)
    .pipe(sourcemaps.init())
    .pipe(
        less().on('error', function(e) {
            console.error(e.message);
            this.emit('end');
        }),
    )
    .pipe(postcss([autoprefixer(['iOS >= 7', 'Android >= 4.1']), comments()]))
    .pipe(convertCssVar())
    .pipe(header(banner, { pkg: pkg }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(dist))
    .pipe(browserSync.reload({ stream: true }))
    .pipe(
        nano({
            zindex: false,
            autoprefixer: false,
            svgo: false,
        }),
    )
    .pipe(
        rename(function(path) {
            path.basename += '.min';
        }),
    )
    .pipe(gulp.dest(dist));
});

gulp.task('build:example:assets', function() {
    return gulp
    .src('src/example/**/*.?(png|jpg|gif|js)', option)
    .pipe(gulp.dest(dist))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('build:example:style', function() {
    return gulp
    .src('src/example/example.less', option)
    .pipe(
        less().on('error', function(e) {
            console.error(e.message);
            this.emit('end');
        }),
    )
    .pipe(postcss([autoprefixer(['iOS >= 7', 'Android >= 4.1'])]))
    .pipe(
        nano({
            zindex: false,
            autoprefixer: false,
        }),
    )
    .pipe(gulp.dest(dist))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('build:example:html', function() {
    return gulp
    .src('src/example/index.html', option)
    .pipe(
        tap(function(file) {
            var dir = path.dirname(file.path);
            var contents = file.contents.toString();
            contents = contents.replace(
                /<link\s+rel="import"\s+href="(.*)">/gi,
                function(match, $1) {
                    var filename = path.join(dir, $1);
                    var id = path.basename(filename, '.html');
                    var content = fs.readFileSync(filename, 'utf-8');
                    return (
                        '<script type="text/html" id="tpl_' +
                        id +
                        '">\n' +
                        content +
                        '\n</script>'
                    );
                },
            );
            file.contents = new Buffer(contents);
        }),
    )
    .pipe(gulp.dest(dist))
    .pipe(browserSync.reload({ stream: true }));
});

/**
 * 增加study的html数据
 */
gulp.task('build:study:html', function() {
    return gulp
    .src('src/study/index.html', option)
    .pipe(
        tap(function(file) {
            var dir = path.dirname(file.path);
            var contents = file.contents.toString();
            contents = contents.replace(
                /<link\s+rel="import"\s+href="(.*)">/gi,
                function(match, $1) {
                    var filename = path.join(dir, $1);
                    var id = path.basename(filename, '.html');
                    var content = fs.readFileSync(filename, 'utf-8');
                    return (
                        '<script type="text/html" id="tpl_' +
                        id +
                        '">\n' +
                        content +
                        '\n</script>'
                    );
                },
            );
            file.contents = new Buffer(contents);
        }),
    )
    .pipe(gulp.dest(dist))
    .pipe(browserSync.reload({ stream: true }));
});


gulp.task('build:example', gulp.series(
    'build:example:assets',
    'build:example:style',
    'build:example:html',
    ));

gulp.task('build', gulp.series('build:style', 'build:example'));

gulp.task('watch', gulp.series('build', function() {
    var list = [
        {
            path: 'src/style/**/*',
            task: ['build:style'],
        },
        {
            path: 'src/example/example.less',
            task: ['build:example:style'],
        },
        {
            path: 'src/example/**/*.?(png|jpg|gif|js)',
            task: ['build:example:assets'],
        },
        {
            path: 'src/**/*.html',
            task: ['build:example:html'],
        },
    ];
    list.forEach((item) => {
        var timeout = null;
        gulp.watch(path.resolve(__dirname, item.path)).on('change', function() {
            clearTimeout(timeout);

            timeout = setTimeout(() => {
                gulp.run(item.task);
            }, 300);
        });
    });
}));

gulp.task('server', function() {
    console.log("=====\r\nserver" ,yargs.p)
    yargs.p = yargs.p || 8080;
    browserSync.init({
        server: {
            baseDir: './dist',
        },
        ui: {
            port: yargs.p + 1,
            weinre: {
                port: yargs.p + 2,
            },
        },
        port: yargs.p,
        startPath: '/example',
    });
});

gulp.task('tag', function() {
    const tag = `v${pkg.version}`;
    return  exec(`git tag ${tag}`);
});

// 参数说明
//  -w: 实时监听
//  -s: 启动服务器
//  -p: 服务器启动端口，默认8080
gulp.task('default',gulp.series( 'build',  function() {
    
    console.log(yargs.s+" "+yargs.w);
    if (yargs.s) {
        return Observable.of(gulp.series('server'));
    }

    if (yargs.w) {
        return Observable.of(gulp.series('watch'));
    }
    //promises.resolve(yargs.toString());
    //cb();
    return Observable.of(0);
}));


