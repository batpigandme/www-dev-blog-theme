/**
* @license Apache-2.0
*
* Copyright (c) 2026 The Stdlib Authors.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

/*
* Copy-to-clipboard for the "Cite this post" block (`post.hbs`). Each
* `.gh-citation-copy` button copies the text of the `.gh-citation-text`
* element in its own `.gh-citation-block`, then announces the result
* through the section's shared `.gh-citation-status` live region.
*/
( function() {
	'use strict';

	function copyCitation( button ) {
		var block = button.closest( '.gh-citation-block' );
		var text = block.querySelector( '.gh-citation-text' );
		var section = button.closest( '.gh-citation' );
		var status = section.querySelector( '.gh-citation-status' );
		var format = text.getAttribute( 'data-citation-format' ) === 'bibtex' ? 'BibTeX' : 'APA-style';

		navigator.clipboard.writeText( text.textContent.trim() ).then( function() {
			status.textContent = 'Copied ' + format + ' citation to clipboard.';
		}, function() {
			status.textContent = 'Could not copy the ' + format + ' citation. Please select and copy it manually.';
		});
	}

	document.addEventListener( 'click', function( event ) {
		var button = event.target.closest( '.gh-citation-copy' );
		if ( button ) {
			copyCitation( button );
		}
	});
})();
