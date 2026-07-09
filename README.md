<!--

@license Apache-2.0

Copyright (c) 2022 The Stdlib Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

-->

# Theme

> A Ghost theme for the official stdlib development blog.

A theme for [Ghost][ghost].

## Footnotes, sidenotes, and asides

The theme repairs and upgrades footnotes at render time via [`theme/assets/js/footnotes.js`][footnotes-js] and [`theme/assets/css/footnotes.css`][footnotes-css] (loaded directly, unminified, as the theme's CSS/JS minification pipeline is currently unavailable).

### Footnotes

Ghost emits inconsistent (and often broken) footnote markup depending on how content enters the editor. On each post, the script detects and normalizes all of the following into a single endnotes section with sequential numbering, working bidirectional links, and [DPUB-ARIA][dpub-aria] roles (`doc-noteref`, `doc-endnotes`, `doc-endnote`, `doc-backlink`):

-   content pasted into the Lexical editor, which strips footnote `id` and fragment `href` attributes;
-   Markdown cards, including posts split across multiple cards (which otherwise produce duplicate `id`s and per-card renumbering);
-   hand-rolled endnotes (`<sup><a href="#fn-1" id="ref-1">` references paired with `id="fn-1"` notes);
-   literal, unrendered `[^label]` references and `[^label]: …` definition paragraphs.

If a heading (e.g., "Sources") directly precedes the absorbed notes, its text is adopted as the endnotes-section title.

On viewports at least 1200px wide, each note is also mirrored into the right margin beside its reference as a sidenote. Margin copies are `aria-hidden` visual clones (non-tabbable, `id`-stripped); the endnotes remain the canonical, interactive copy at every viewport width.

**Known limitation**: a Markdown card containing *only* footnote definitions (no in-card references) may be dropped entirely by Ghost at render time and cannot be recovered client-side. When authoring in Markdown cards, paste the whole post as a single card.

### Asides

Authors can add a sidenote that is not a footnote with an HTML card:

```html
<aside class="gh-aside" role="note" aria-label="Side note">
    <p>Aside text here. Links are fine.</p>
</aside>
```

On wide viewports, the aside floats in the right margin; on narrow viewports (or if JavaScript is unavailable), it renders as a visually delineated in-flow block. Add `data-placement="inline"` to keep it a full-width callout at all widths. The `aria-label` may be customized (e.g., `aria-label="Historical note"`).

## License

See [LICENSE][stdlib-license].

## Copyright

Copyright (c) 2022. The Stdlib [Authors][stdlib-authors].

<!-- links -->

[ghost]: http://github.com/tryghost/ghost/

[footnotes-js]: https://github.com/stdlib-js/www-dev-blog-theme/blob/main/theme/assets/js/footnotes.js

[footnotes-css]: https://github.com/stdlib-js/www-dev-blog-theme/blob/main/theme/assets/css/footnotes.css

[dpub-aria]: https://www.w3.org/TR/dpub-aria-1.0/

[stdlib-authors]: https://github.com/stdlib-js/www-dev-blog-theme/graphs/contributors

[stdlib-license]: https://raw.githubusercontent.com/stdlib-js/www-dev-blog-theme/main/LICENSE

<!-- /.links -->
