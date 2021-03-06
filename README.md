gulp-closurizer
============

closure compiler plugin for gulp.

getting started
---------------

Make sure that you have a copy of the [closure compiler jar](https://github.com/google/closure-compiler) file accessible to your project. By default the plugin will look for:

`PROJECT_HOME/closure/compiler.jar`

Install the plugin with

`npm install gulp-closurizer --save-dev`

example gulp setup
------------------
```javascript
var gulp      = require('gulp'),
    compiler  = require('gulp-closure');

gulp.task('compile' function() {

  gulp.src('src/**/*.js')
  .pipe(compiler())
  .pipe(gulp.dest('/output'));
});
```

You can pass a plethora of configuration options to the plugin via a configuration object passed at config time.

```javascript
var gulp      = require('gulp'),
    glob      = require('glob'),
    compiler  = require('gulp-closure')({
      plugin    : {
        compiler                 : 'closure/build/compiler.jar',
        maxBuffer                : 1024 * 1024 * 20
      },
      compiler  : {
        '--angular_pass'         : null,
        '--compilation_level'    : 'ADVANCED_OPTIMIZATIONS',
        '--externs'              : glob.sync('closure/externs/**/*.jsx')
      },
      java      : {
        '-XX:+TieredCompilation' : null
      }
    });

gulp.task('compile' function() {

  gulp.src('src/**/*.js')
  .pipe(compiler)
  .pipe(gulp.dest('/output'));
});
```

options
-------

The `options` object contains 3 sub-objects: `plugin`, `compiler` and `java`.

The `plugin` object change the behaviour of the plugin itself:
- `sourcePass` this option is a boolean which determines whether the source files should be passed through to the output with the compiled js. Useful when dealing with sourcemaps. Default is `false`
- `mapComment` this option is a boolean which determines whether a `//# sourceMappingURL=` comment should be added to the end of your compiled js. This option defaults to `true` but does nothing if the `--create_source_map` compiler option isn't set.
- `compiler` this option is a string which is the relative path to the compiler jar.
- `flagfile` this option is the name of the flagfile that will be generated by the plugin. You shouldn't need to change this unless the default ('flagfile.tmp') clashes with any of the other temporary files that will be created during compilation.
- `output` this option sets the name of the output file that will be passed back to the gulp stream. Default is `output.min.js`
- `maxBuffer` this option sets the maxBuffer options for the process that node creates. Default is `1024 * 1024 * 20`

The `compiler` object is serialized into the flags to be passed to the compiler, By default we don't pass any options that aren't required to the compiler.
- The keys of the objecct will map directly to the flag name created.
- If you want to create a flag which has no value, simply set its value to `null`

_example_
```javascript
compiler : {
  '--angular_pass' : null,
  '--compilation_level' : 'ADVANCED_OPTIMIZATIONS'
}
```

Will become

`--angular_pass --compilation_level="ADVANCED_OPTIMIZATIONS"`

There are some options that are not supported currently by the plugin, these are:
- `--module`
- `--flag_file`
- `--js_output_file`

For more information see source code.

The `java` object is used to set options for the java instance used to run the compiler. This object is serialized in the same way that the compiler object is. 

_example_
```javascript
java : {
  '-XX:+TieredCompilation' : null
}
```

Sourcemaps
----------

[Sourcemaps](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/) are awesome!

Basic sourcemap example:

```javascript
var gulp = require('gulp'),
    compiler = require('gulp-closurizer')({
        plugin : {
            mapComment : true,
            sourcePass : true
        },
        compiler: {
            '--create_source_map' : 'source.map'
        }
    });
    
gulp.task('compile', function() {

    gulp.src('src/**/*.js')
    .pipe(compiler)
    .pipe(gulp.dest('output'));
});
```

In this example the `output` folder will contain the `source.map` file, the compiled js file, and the uncompiled source files. The compiled js will also have a comment appended to the bottom which will link it with the soucemap file. 

It's good to bear in mind that the source js files must be available on the server where your sourcemap is hosted. We output the soucemap with relative paths to the files by default.

TODO
----
- Come up with some kind of solution for creating modules.
- Possibly use `--js_output_file` instead of `stdout` to save files, as this may cause issues.
- Possibly do something with the compiler warning/error output.
