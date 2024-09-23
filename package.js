Package.describe({
  name: 'jam:soft-delete',
  version: '0.2.1',
  summary: 'An easy way to add soft deletes to your Meteor app',
  git: 'https://github.com/jamauro/soft-delete',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom(['2.8.1', '3.0']);
  api.use('ecmascript');
  api.use('mongo');
  api.use('check');
  api.use('accounts-base');
  api.use('jam:easy-schema@1.3.1', { weak: true });
  api.use('zodern:types@1.0.13');
  api.mainModule('soft-delete.js');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('accounts-password')
  api.use('jam:soft-delete');
  api.mainModule('tests.js');
});
