module.exports = function(grunt) {
  grunt.initConfig({
    includes: {
      files: {
        src: 'src/main.js',
        dest: 'Batch-processor.user.js',
        silent: false
      }
    },
    watch: {
      scripts: {
        files: ['src/**/*.js'],
        tasks: ['wait:task', 'includes'],
        options: {
          spawn: false,
        },
      },
    },
    wait: {
      task: {
        options: {
          delay: 200
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-wait');
  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('wait-watch', ['wait', 'watch']);
  grunt.registerTask('default', ['wait-watch', 'includes']);
};
