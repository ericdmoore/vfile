<h1>
  <img src="https://raw.githubusercontent.com/vfile/vfile/fc8164b/logo.svg?sanitize=true" alt="vfile" />
</h1>

> vfile for deno

**vfile** is a small and browser friendly virtual file format that tracks
metadata (such as a file’s `path` and `value`) and [messages][].

It was made specifically for **[unified][]** and generally for the common task
of parsing, transforming, and serializing data, where `vfile` handles everything
about the document being compiled.
This is useful for example when building linters, compilers, static site
generators, or other build tools.
**vfile** is part of the [unified collective][site].

*   for more about us, see [`unifiedjs.com`](https://unifiedjs.com)

For More info see [source package][vfile]

```js
<script>
  import {VFile} from "https://denopkg.com/ericdmoore/vfile@main/mod.ts"
</script>
```

[vfile]: https://github.com/vfile/vfile
