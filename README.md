# Licenses

Fork of https://github.com/3rd-Eden/licenses designed to run against pre-fetched 
`node_modules/` instead of fetching info from registry and Github. So you need
to do `npm install` for your main project before using it.
 
## Why fork? 
* This approach required a significant rewrite of the logic.
* It was not planned by 3rd-eden (see https://github.com/3rd-Eden/licenses/issues/14#issuecomment-57770759).

As I needed to fetch data for all devDependencies, and there were often hundreds
of them, initial code ran too slow for me.

## API differences

The main difference is that `licenses()` accept an object as the first parameter.
The object must have 2 properties:
* `path`: absolute path to folder with the dependency;
* `data`: `package.json` contents for the dependency (you may use e.g. https://github.com/npm/read-package-json or https://github.com/npm/read-package-tree to get the data).

So the call may look like this:

```js
'use strict';

var licenses = require('licenses');

licenses({
  path: 'C:\My Project\node_modules\grunt-contrib-connect\',
  data: {/* package.json contents*/}
}, function fetched(err, license) {
  console.log(license.join(',')); // MIT
});
```

Or, combined with `read-package-tree`, like this:

```js
'use strict';

var licenses = require('licenses'),
  readPackageTree = require('read-package-tree');
  
readPackageTree('./node_modules/grunt-contrib-connect', function(err, data) {
  if (err) throw err;
  licences({
    path: data.realpath,
    data: data.package
  }, function fetched(err, license) {
    console.log(license.join(',')); // MIT
  });
});
```
### Getting additional info about licenses

The great thing about the initial licenses module is that it stores a lot of 
knowledge about existing licenses. To get it, use the static `licenses.info()` method:

```js
'use strict';

var licenses = require('licenses');

licenses({
  path: 'C:\My Project\node_modules\grunt-contrib-connect\',
  data: {/* package.json contents*/}
}, function fetched(err, license) {
  var info = licenses.info(license[0]/*MIT*/);
  console.log(Object.keys(info)); // id,name,full,url,tldr,file,content
  console.log(info.url); // http://opensource.org/licenses/MIT
});
```
  
### License

MIT
