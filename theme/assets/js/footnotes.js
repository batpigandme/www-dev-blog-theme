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

'use strict';

/*
* Footnote repair and margin sidenotes.
*
* Ghost emits footnote markup in several inconsistent forms depending on how
* content entered the editor:
*
* 1. Lexical editor paste: refs become `<a><sup>[N]</sup></a>` (no `href`),
*    definitions become a trailing `<hr><ol><li>… <a>↩︎</a></li></ol>` (no
*    `id` attributes), so nothing links.
* 2. Markdown cards: each card renders footnotes independently, producing
*    per-card `.footnotes` sections with duplicate ids and restarted
*    numbering.
* 3. Hand-rolled endnotes: `<sup><a href="#fn-1" id="ref-1">` refs paired
*    with `id="fn-1"` note elements.
* 4. Literal text: `[^1]` and `[^1]: …` that never rendered.
*
* This script normalizes all of the above into a single endnotes section with
* sequential numbering, bidirectional links, and DPUB-ARIA roles, and, on
* wide viewports, mirrors each note into the right margin column beside its
* reference. Margin copies are `aria-hidden` visual clones; the endnotes
* remain the canonical, interactive copy at every viewport width.
*/
(function main() { // eslint-disable-line no-restricted-syntax
	var SIDENOTE_MEDIA = '(min-width: 1200px)';
	var SIDENOTE_MIN_GUTTER = 160;
	var SIDENOTE_GAP = 24;
	var SIDENOTE_MAX_WIDTH = 240;
	var SIDENOTE_SPACING = 12;

	var content;
	var notes;
	var refs;
	var headingCandidate;
	var sidenotes;
	var asides;
	var mql;

	content = document.querySelector( '.gh-article .gh-content' );
	if ( !content ) {
		return;
	}
	notes = []; // [ { 'el': Element, 'html': string, 'number': int, 'refIds': [ string ] } ]
	refs = []; // [ { 'wrapper': Element, 'note': object } ]
	headingCandidate = null;
	sidenotes = [];

	collect();
	if ( refs.length ) {
		render();
	}
	asides = marginAsides();
	if ( notes.length || asides.length ) {
		mql = window.matchMedia( SIDENOTE_MEDIA );
		if ( mql.addEventListener ) {
			mql.addEventListener( 'change', relayout );
		}
		window.addEventListener( 'resize', debounce( relayout, 150 ) );
		window.addEventListener( 'load', relayout );
		if ( document.fonts && document.fonts.ready ) {
			document.fonts.ready.then( relayout );
		}
		relayout();
	}

	/**
	* Finds footnote references and definitions across all supported markup
	* patterns, populating `refs` (document order) and `notes`.
	*
	* @private
	*/
	function collect() {
		var containers;
		var byEl;
		var el;
		var i;

		byEl = new Map(); // note Element -> note object
		containers = noteContainers();

		// Patterns 2 and 3: anchors with fragment hrefs...
		collectLinkedRefs( byEl, containers );

		// Pattern 1: href-less Lexical refs paired with `↩︎` lists...
		collectLexicalRefs( byEl, containers.lexical );

		// Pattern 4: literal `[^label]` text...
		collectLiteralRefs( byEl );

		// Order references by document position...
		refs.sort( documentOrder );

		// Assign sequential numbers in document order (repeat refs to the same note reuse its number)...
		for ( i = 0; i < refs.length; i++ ) {
			el = refs[ i ].note.el;
			if ( !byEl.get( el ).number ) {
				byEl.get( el ).number = notes.length + 1;
				notes.push( byEl.get( el ) );
			}
		}
	}

	/**
	* Locates candidate note containers.
	*
	* @private
	* @returns {Object} lists of container elements
	*/
	function noteContainers() {
		var lexical;
		var lists;
		var ols;
		var ol;
		var i;

		// markdown-it output: `<section class="footnotes">` (or a bare list of `li[id^="fn"]`)...
		lists = toArray( content.querySelectorAll( 'section.footnotes, div.footnotes' ) );

		// Lexical output: an `<ol>` whose items end with an href-less `↩` anchor...
		lexical = [];
		ols = toArray( content.querySelectorAll( 'ol' ) );
		for ( i = 0; i < ols.length; i++ ) {
			ol = ols[ i ];
			if ( lists.indexOf( ol.closest( 'section.footnotes, div.footnotes' ) ) === -1 && isLexicalNoteList( ol ) ) {
				lexical.push( ol );
			}
		}
		return {
			'sections': lists,
			'lexical': lexical
		};
	}

	/**
	* Tests whether a list matches the Lexical footnote-definition shape.
	*
	* @private
	* @param {Element} ol - list element
	* @returns {boolean} boolean result
	*/
	function isLexicalNoteList( ol ) {
		var items;
		var a;
		var i;

		items = ol.children;
		if ( !items.length ) {
			return false;
		}
		for ( i = 0; i < items.length; i++ ) {
			a = items[ i ].querySelector( 'a:not([href])' );
			if ( !a || a.textContent.indexOf( '↩' ) === -1 ) {
				return false;
			}
		}
		return true;
	}

	/**
	* Collects refs whose anchors carry fragment hrefs (markdown cards and hand-rolled endnotes).
	*
	* @private
	* @param {Map} byEl - note registry
	* @param {Object} containers - note containers
	*/
	function collectLinkedRefs( byEl, containers ) {
		var anchors;
		var frag;
		var a;
		var el;
		var i;

		anchors = toArray( content.querySelectorAll( 'sup > a[href^="#fn"], sup.footnote-ref > a, a.footnote-ref' ) );
		for ( i = 0; i < anchors.length; i++ ) {
			a = anchors[ i ];
			frag = fragment( a );

			// Exclude backlinks (`#fnref…`, `#ref-…`) and anchors inside note containers...
			if (
				!frag ||
				frag.indexOf( 'fnref' ) === 0 ||
				frag.indexOf( 'ref-' ) === 0 ||
				insideContainer( a, containers )
			) {
				continue;
			}
			el = resolveFragment( frag, a );
			if ( el ) {
				addRef( byEl, refWrapper( a ), el );
			}
		}
	}

	/**
	* Collects href-less Lexical refs, pairing displayed numbers with list items positionally.
	*
	* @private
	* @param {Map} byEl - note registry
	* @param {Array} lists - qualifying Lexical note lists
	*/
	function collectLexicalRefs( byEl, lists ) {
		var anchors;
		var list;
		var sup;
		var m;
		var n;
		var a;
		var i;
		var j;

		if ( !lists.length ) {
			return;
		}
		anchors = toArray( content.querySelectorAll( 'a:not([href]) > sup' ) );
		for ( i = 0; i < anchors.length; i++ ) {
			sup = anchors[ i ];
			a = sup.parentElement;
			m = /^\[?(\d+)\]?$/.exec( sup.textContent.trim() );
			if ( !m || insideContainer( a, { 'sections': [], 'lexical': lists } ) ) {
				continue;
			}
			n = parseInt( m[ 1 ], 10 );

			// Resolve against the nearest following list (per-card scoping), falling back to the last list...
			list = null;
			for ( j = 0; j < lists.length; j++ ) {
				if ( follows( lists[ j ], a ) ) {
					list = lists[ j ];
					break;
				}
			}
			list = list || lists[ lists.length - 1 ];
			if ( n >= 1 && n <= list.children.length ) {
				addRef( byEl, refWrapper( a ), list.children[ n - 1 ] );
			}
		}
	}

	/**
	* Collects literal `[^label]` refs and `[^label]: …` definition paragraphs.
	*
	* @private
	* @param {Map} byEl - note registry
	*/
	function collectLiteralRefs( byEl ) {
		var defsByLabel;
		var paragraphs;
		var walker;
		var node;
		var text;
		var m;
		var p;
		var i;

		// Definitions: paragraphs beginning with `[^label]:`...
		defsByLabel = {};
		paragraphs = toArray( content.querySelectorAll( 'p' ) );
		for ( i = 0; i < paragraphs.length; i++ ) {
			p = paragraphs[ i ];
			m = /^\[\^([^\]\s]+)\]:/.exec( p.textContent.trim() );
			if ( m && !defsByLabel[ m[ 1 ] ] ) {
				defsByLabel[ m[ 1 ] ] = p;
				p.setAttribute( 'data-gh-fn-def', m[ 1 ] );
			}
		}
		if ( !objectKeys( defsByLabel ).length ) {
			return;
		}
		// References: `[^label]` occurrences in text nodes (definitions, code, links, and math excluded)...
		walker = document.createTreeWalker( content, NodeFilter.SHOW_TEXT, {
			'acceptNode': acceptTextNode
		});
		node = walker.nextNode();
		while ( node ) {
			text = node.nodeValue;
			m = /\[\^([^\]\s]+)\](?!:)/.exec( text );
			if ( m && defsByLabel[ m[ 1 ] ] ) {
				// The remainder text node is visited next, so repeated refs within one text node are handled naturally...
				splitLiteralRef( byEl, node, m, defsByLabel[ m[ 1 ] ] );
			}
			node = walker.nextNode();
		}
	}

	/**
	* Filters text nodes for literal-ref scanning.
	*
	* @private
	* @param {Node} node - text node
	* @returns {number} filter result
	*/
	function acceptTextNode( node ) {
		var el = node.parentElement;
		if ( !el || el.closest( 'pre, code, a, sup, script, style, mjx-container, .MathJax, [data-gh-fn-def], .gh-footnotes' ) ) {
			return NodeFilter.FILTER_REJECT;
		}
		return NodeFilter.FILTER_ACCEPT;
	}

	/**
	* Splits a text node around a literal `[^label]` match, inserting a placeholder ref element.
	*
	* @private
	* @param {Map} byEl - note registry
	* @param {Node} node - text node containing the match
	* @param {Array} m - regexp match
	* @param {Element} def - definition paragraph
	*/
	function splitLiteralRef( byEl, node, m, def ) {
		var placeholder;
		var rest;

		rest = node.splitText( m.index );
		rest.nodeValue = rest.nodeValue.slice( m[ 0 ].length );
		placeholder = document.createElement( 'sup' );
		node.parentNode.insertBefore( placeholder, rest );
		addRef( byEl, placeholder, def );
	}

	/**
	* Registers a reference and its note element.
	*
	* @private
	* @param {Map} byEl - note registry
	* @param {Element} wrapper - reference element to be replaced
	* @param {Element} el - note element (list item or paragraph)
	*/
	function addRef( byEl, wrapper, el ) {
		var note = byEl.get( el );
		if ( !note ) {
			note = {
				'el': el,
				'html': null,
				'number': 0,
				'refIds': []
			};
			byEl.set( el, note );
		}
		refs.push({
			'wrapper': wrapper,
			'note': note
		});
	}

	/**
	* Rewrites references, builds the merged endnotes section, and removes absorbed markup.
	*
	* @private
	*/
	function render() {
		var section;
		var list;
		var note;
		var i;

		// Extract note content before mutating the DOM...
		for ( i = 0; i < notes.length; i++ ) {
			notes[ i ].html = noteHTML( notes[ i ].el );
		}
		// Rewrite references in place...
		for ( i = 0; i < refs.length; i++ ) {
			note = refs[ i ].note;
			note.refIds.push( 'gh-fnref-' + note.number + '-' + ( note.refIds.length + 1 ) );
			refs[ i ].wrapper.replaceWith( refElement( note ) );
		}
		// Build the endnotes section...
		section = document.createElement( 'section' );
		section.className = 'gh-footnotes';
		section.setAttribute( 'role', 'doc-endnotes' );
		section.innerHTML = '<h2 id="footnote-label" class="gh-footnotes-title">Footnotes</h2>';
		list = document.createElement( 'ol' );
		for ( i = 0; i < notes.length; i++ ) {
			list.appendChild( noteElement( notes[ i ] ) );
		}
		section.appendChild( list );

		// Remove absorbed note markup, then append the section...
		for ( i = 0; i < notes.length; i++ ) {
			removeNoteSource( notes[ i ].el );
		}
		content.appendChild( section );

		// Adopt an author heading (e.g., "Sources") stranded directly above the new section...
		if ( headingCandidate && headingCandidate.nextElementSibling === section ) {
			section.querySelector( '#footnote-label' ).textContent = headingCandidate.textContent;
			headingCandidate.remove();
		}
	}

	/**
	* Builds a rewritten reference element.
	*
	* @private
	* @param {Object} note - note object
	* @returns {Element} `<sup class="gh-fnref">` element
	*/
	function refElement( note ) {
		var sup;
		var a;

		sup = document.createElement( 'sup' );
		sup.className = 'gh-fnref';
		a = document.createElement( 'a' );
		a.href = '#gh-fn-' + note.number;
		a.id = note.refIds[ note.refIds.length - 1 ];
		a.setAttribute( 'role', 'doc-noteref' );
		a.setAttribute( 'aria-describedby', 'footnote-label' );
		a.textContent = note.number;
		sup.appendChild( a );
		return sup;
	}

	/**
	* Builds an endnote list item, including backlinks to each reference.
	*
	* @private
	* @param {Object} note - note object
	* @returns {Element} `<li>` element
	*/
	function noteElement( note ) {
		var li;
		var a;
		var i;

		li = document.createElement( 'li' );
		li.id = 'gh-fn-' + note.number;
		li.setAttribute( 'role', 'doc-endnote' );
		li.innerHTML = note.html;
		for ( i = 0; i < note.refIds.length; i++ ) {
			a = document.createElement( 'a' );
			a.href = '#' + note.refIds[ i ];
			a.setAttribute( 'role', 'doc-backlink' );
			if ( note.refIds.length === 1 ) {
				a.setAttribute( 'aria-label', 'Back to reference ' + note.number );
				a.textContent = '↩';
			} else {
				a.setAttribute( 'aria-label', 'Back to occurrence ' + ( i + 1 ) + ' of reference ' + note.number );
				a.innerHTML = '↩<sup>' + ( i + 1 ) + '</sup>';
			}
			li.appendChild( document.createTextNode( ' ' ) );
			li.appendChild( a );
		}
		return li;
	}

	/**
	* Extracts note content, stripping pre-existing backlinks and literal definition markers.
	*
	* @private
	* @param {Element} el - source note element
	* @returns {string} HTML string
	*/
	function noteHTML( el ) {
		var clone;
		var links;
		var html;
		var a;
		var i;

		clone = el.cloneNode( true );
		links = toArray( clone.querySelectorAll( 'a' ) );
		for ( i = 0; i < links.length; i++ ) {
			a = links[ i ];
			if (
				( !a.getAttribute( 'href' ) && a.textContent.indexOf( '↩' ) !== -1 ) ||
				a.classList.contains( 'footnote-backref' ) ||
				( fragment( a ) && ( fragment( a ).indexOf( 'fnref' ) === 0 || fragment( a ).indexOf( 'ref-' ) === 0 ) )
			) {
				a.remove();
			}
		}
		html = clone.innerHTML;
		if ( el.hasAttribute( 'data-gh-fn-def' ) ) {
			html = html.replace( /^\s*\[\^[^\]\s]+\]:\s*/, '' );
		}
		return html.trim();
	}

	/**
	* Removes a consumed note element and any emptied ancestor container.
	*
	* @private
	* @param {Element} el - note element
	*/
	function removeNoteSource( el ) {
		var container;
		var target;
		var prev;

		container = el.closest( 'section.footnotes, div.footnotes' );
		target = el;
		if ( el.tagName === 'LI' ) {
			target = el.parentElement; // the <ol>
			el.remove();
			if ( target.children.length ) {
				return; // other (unconsumed) notes remain
			}
			if ( container && container.querySelectorAll( 'li' ).length === 0 ) {
				target = container;
			}
		}
		prev = target.previousElementSibling;
		if ( prev && prev.tagName === 'HR' ) {
			prev.remove();
			prev = target.previousElementSibling;
		}
		if ( prev && /^H[1-6]$/.test( prev.tagName ) ) {
			headingCandidate = prev;
		}
		target.remove();
	}

	/**
	* Finds author asides eligible for margin placement.
	*
	* @private
	* @returns {Array} aside elements
	*/
	function marginAsides() {
		return toArray( content.querySelectorAll( '.gh-aside:not([data-placement="inline"])' ) );
	}

	/**
	* Activates or deactivates the margin layout to match the current viewport.
	*
	* @private
	*/
	function relayout() {
		deactivate();
		if ( mql.matches ) {
			activate();
		}
	}

	/**
	* Mirrors notes into the margin and lays out margin entries without overlap.
	*
	* @private
	*/
	function activate() {
		var contentRect;
		var entries;
		var mainRight;
		var gutter;
		var bottom;
		var probe;
		var width;
		var left;
		var top;
		var ref;
		var el;
		var i;

		// Measure the main column from a representative child...
		probe = mainColumnProbe();
		if ( !probe ) {
			return;
		}
		contentRect = content.getBoundingClientRect();
		mainRight = probe.getBoundingClientRect().right - contentRect.left;
		gutter = contentRect.width - mainRight - SIDENOTE_GAP;
		if ( gutter < SIDENOTE_MIN_GUTTER ) {
			return;
		}
		left = mainRight + SIDENOTE_GAP;
		width = Math.min( gutter, SIDENOTE_MAX_WIDTH );

		// Batch reads: desired vertical positions keyed by first reference (notes) or natural position (asides)...
		entries = [];
		for ( i = 0; i < notes.length; i++ ) {
			ref = document.getElementById( notes[ i ].refIds[ 0 ] );
			if ( ref ) {
				entries.push({
					'note': notes[ i ],
					'el': null,
					'top': ref.getBoundingClientRect().top - contentRect.top
				});
			}
		}
		for ( i = 0; i < asides.length; i++ ) {
			entries.push({
				'note': null,
				'el': asides[ i ],
				'top': asides[ i ].getBoundingClientRect().top - contentRect.top
			});
		}
		entries.sort( byTop );

		// Batch writes: create clones, absolutize asides, and stack without overlap...
		for ( i = 0; i < entries.length; i++ ) {
			if ( entries[ i ].note ) {
				el = sidenoteElement( entries[ i ].note );
				content.appendChild( el );
				sidenotes.push( el );
			} else {
				el = entries[ i ].el;
				el.classList.add( 'gh-aside--margin' );
			}
			el.style.left = left + 'px';
			el.style.width = width + 'px';
			entries[ i ].el = el;
		}
		bottom = 0;
		for ( i = 0; i < entries.length; i++ ) {
			top = Math.max( entries[ i ].top, bottom );
			entries[ i ].el.style.top = top + 'px';
			bottom = top + entries[ i ].el.offsetHeight + SIDENOTE_SPACING;
		}
	}

	/**
	* Removes sidenote clones and restores asides to the document flow.
	*
	* @private
	*/
	function deactivate() {
		var i;
		for ( i = 0; i < sidenotes.length; i++ ) {
			sidenotes[ i ].remove();
		}
		sidenotes = [];
		for ( i = 0; i < asides.length; i++ ) {
			asides[ i ].classList.remove( 'gh-aside--margin' );
			asides[ i ].style.left = '';
			asides[ i ].style.width = '';
			asides[ i ].style.top = '';
		}
	}

	/**
	* Builds an `aria-hidden` margin clone of a note.
	*
	* @private
	* @param {Object} note - note object
	* @returns {Element} sidenote element
	*/
	function sidenoteElement( note ) {
		var el;
		var f;
		var i;

		el = document.createElement( 'div' );
		el.className = 'gh-sidenote';
		el.setAttribute( 'aria-hidden', 'true' );
		el.innerHTML = '<span class="gh-sidenote-number">' + note.number + '</span>' + note.html;

		// Clones must not add tab stops or duplicate ids...
		f = toArray( el.querySelectorAll( 'a, button, [tabindex]' ) );
		for ( i = 0; i < f.length; i++ ) {
			f[ i ].setAttribute( 'tabindex', '-1' );
		}
		f = toArray( el.querySelectorAll( '[id]' ) );
		for ( i = 0; i < f.length; i++ ) {
			f[ i ].removeAttribute( 'id' );
		}
		return el;
	}

	/**
	* Finds a static main-column child for measuring column geometry.
	*
	* @private
	* @returns {(Element|null)} probe element
	*/
	function mainColumnProbe() {
		var children;
		var el;
		var i;

		children = content.children;
		for ( i = 0; i < children.length; i++ ) {
			el = children[ i ];
			if (
				el.tagName === 'P' &&
				!el.className &&
				el.getBoundingClientRect().width > 0
			) {
				return el;
			}
		}
		return null;
	}

	/**
	* Resolves a fragment to a note element, preferring elements which follow the reference (per-card scoping).
	*
	* @private
	* @param {string} frag - fragment identifier (without `#`)
	* @param {Element} ref - reference anchor
	* @returns {(Element|null)} note element
	*/
	function resolveFragment( frag, ref ) {
		var matches;
		var i;

		matches = toArray( content.querySelectorAll( '[id="' + cssEscape( frag ) + '"]' ) );
		for ( i = 0; i < matches.length; i++ ) {
			if ( follows( matches[ i ], ref ) ) {
				return matches[ i ];
			}
		}
		return matches[ 0 ] || null;
	}

	/**
	* Finds the outermost element wrapping a reference anchor (e.g., `<sup><a>` or `<a><sup>`).
	*
	* @private
	* @param {Element} el - innermost reference element
	* @returns {Element} wrapper element
	*/
	function refWrapper( el ) {
		var w = el;
		var p = w.parentElement;
		while ( p && ( p.tagName === 'SUP' || p.tagName === 'A' ) && p.children.length === 1 && p.textContent.trim() === w.textContent.trim() ) {
			w = p;
			p = w.parentElement;
		}
		return w;
	}

	/**
	* Tests whether an anchor sits inside any detected note container.
	*
	* @private
	* @param {Element} el - element to test
	* @param {Object} containers - note containers
	* @returns {boolean} boolean result
	*/
	function insideContainer( el, containers ) {
		var i;
		for ( i = 0; i < containers.sections.length; i++ ) {
			if ( containers.sections[ i ].contains( el ) ) {
				return true;
			}
		}
		for ( i = 0; i < containers.lexical.length; i++ ) {
			if ( containers.lexical[ i ].contains( el ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	* Extracts a fragment identifier from an anchor's `href`.
	*
	* @private
	* @param {Element} a - anchor element
	* @returns {(string|null)} fragment (without `#`)
	*/
	function fragment( a ) {
		var href = a.getAttribute( 'href' );
		if ( href && href.charAt( 0 ) === '#' && href.length > 1 ) {
			try {
				return decodeURIComponent( href.slice( 1 ) );
			} catch ( err ) { // eslint-disable-line no-unused-vars
				return href.slice( 1 );
			}
		}
		return null;
	}

	/**
	* Tests whether element `a` follows element `b` in document order.
	*
	* @private
	* @param {Element} a - first element
	* @param {Element} b - second element
	* @returns {boolean} boolean result
	*/
	function follows( a, b ) {
		/* eslint-disable no-bitwise */
		return ( b.compareDocumentPosition( a ) & Node.DOCUMENT_POSITION_FOLLOWING ) !== 0;
		/* eslint-enable no-bitwise */
	}

	/**
	* Comparator ordering references by document position.
	*
	* @private
	* @param {Object} a - first reference
	* @param {Object} b - second reference
	* @returns {number} comparison result
	*/
	function documentOrder( a, b ) {
		if ( a.wrapper === b.wrapper ) {
			return 0;
		}
		return follows( b.wrapper, a.wrapper ) ? -1 : 1;
	}

	/**
	* Comparator ordering margin entries by desired vertical position.
	*
	* @private
	* @param {Object} a - first entry
	* @param {Object} b - second entry
	* @returns {number} comparison result
	*/
	function byTop( a, b ) {
		return a.top - b.top;
	}

	/**
	* Escapes a string for use in a CSS attribute selector.
	*
	* @private
	* @param {string} str - input string
	* @returns {string} escaped string
	*/
	function cssEscape( str ) {
		if ( window.CSS && window.CSS.escape ) {
			return window.CSS.escape( str );
		}
		return str.replace( /["\\]/g, '\\$&' );
	}

	/**
	* Converts an array-like collection to an array.
	*
	* @private
	* @param {ArrayLike} collection - input collection
	* @returns {Array} array
	*/
	function toArray( collection ) {
		return Array.prototype.slice.call( collection );
	}

	/**
	* Returns an object's own enumerable keys.
	*
	* @private
	* @param {Object} obj - input object
	* @returns {Array} keys
	*/
	function objectKeys( obj ) {
		return Object.keys( obj );
	}

	/**
	* Debounces a function.
	*
	* @private
	* @param {Function} fcn - function to debounce
	* @param {number} ms - delay in milliseconds
	* @returns {Function} debounced function
	*/
	function debounce( fcn, ms ) {
		var id;
		return function debounced() {
			clearTimeout( id );
			id = setTimeout( fcn, ms );
		};
	}
})();
