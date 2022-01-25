/*
	JavaScript autoComplete v1.0.4
	Copyright (c) 2014 Simon Steinberger / Pixabay
	GitHub: https://github.com/Pixabay/JavaScript-autoComplete
	License: http://www.opensource.org/licenses/mit-license.php
*/

export default function(options) {
	// helpers
	let hasClass = (el, className) => el.classList.contains(className),

	live = (elClass, event, cb, context) => {
		(context || document).addEventListener(event, e => {
			let found, el = e.target;
			while (el && !(found = hasClass(el, elClass))) el = el.parentElement;
			if (found) cb.call(el, e);
		});
	},

	o = Object.assign({
		selector: 0,
		source: 0,
		minChars: 3,
		delay: 150,
		offsetLeft: 0,
		offsetTop: 1,
		cache: 1,
		menuClass: '',
		renderItem(item, search){
			// escape special characters
			search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
			let re = RegExp("(" + search.replace(/ /g,'|') + ")", "gi");
			return '<div class="autocomplete-suggestion" data-val="' + item + '">' + item.replace(re, "<b>$1</b>") + '</div>';
		},
		onSelect(e, term, item){}
	}, options),
	// init
	elems = typeof o.selector == 'object' ? [o.selector] : document.querySelectorAll(o.selector);
	for (let that of elems) {
		// create suggestions container "sc"
		that.sc = document.createElement('div');
		that.sc.className = 'autocomplete-suggestions '+o.menuClass;

		that.autocompleteAttr = that.getAttribute('autocomplete');
		that.setAttribute('autocomplete', 'off');
		that.cache = {};
		that.last_val = '';

		that.updateSC = (resize, next) => {
			let rect = that.getBoundingClientRect();
			that.sc.style.left = Math.round(rect.left + (window.pageXOffset || document.documentElement.scrollLeft) + o.offsetLeft) + 'px';
			that.sc.style.top = Math.round(rect.bottom + (window.pageYOffset || document.documentElement.scrollTop) + o.offsetTop) + 'px';
			that.sc.style.width = Math.round(rect.right - rect.left) + 'px'; // outerWidth
			if (!resize) {
				that.sc.style.display = 'block';
				if (!that.sc.maxHeight) { that.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(that.sc, null) : that.sc.currentStyle).maxHeight); }
				if (!that.sc.suggestionHeight) that.sc.suggestionHeight = that.sc.querySelector('.autocomplete-suggestion').offsetHeight;
				if (that.sc.suggestionHeight)
					if (!next) that.sc.scrollTop = 0;
					else {
						let scrTop = that.sc.scrollTop, selTop = next.getBoundingClientRect().top - that.sc.getBoundingClientRect().top;
						if (selTop + that.sc.suggestionHeight - that.sc.maxHeight > 0)
							that.sc.scrollTop = selTop + that.sc.suggestionHeight + scrTop - that.sc.maxHeight;
						else if (selTop < 0)
							that.sc.scrollTop = selTop + scrTop;
					}
			}
		}
		window.addEventListener('resize', that.updateSC);
		document.body.appendChild(that.sc);

		live('autocomplete-suggestion', 'mouseleave', e => {
			let sel = that.sc.querySelector('.autocomplete-suggestion.selected');
			if (sel) setTimeout(() => { sel.className = sel.className.replace('selected', ''); }, 20);
		}, that.sc);

		live('autocomplete-suggestion', 'mouseover', e => {
			let sel = that.sc.querySelector('.autocomplete-suggestion.selected');
			if (sel) sel.className = sel.className.replace('selected', '');
			this.className += ' selected';
		}, that.sc);

		live('autocomplete-suggestion', 'mousedown', e => {
			if (hasClass(this, 'autocomplete-suggestion')) { // else outside click
				let v = this.getAttribute('data-val');
				that.value = v;
				o.onSelect(e, v, this);
				that.sc.style.display = 'none';
			}
		}, that.sc);

		that.blurHandler = () => {
			let over_sb;
			try { over_sb = document.querySelector('.autocomplete-suggestions:hover'); } catch(e){}
			if (!over_sb) {
				that.last_val = that.value;
				that.sc.style.display = 'none';
				setTimeout(() => { that.sc.style.display = 'none'; }, 350); // hide suggestions on fast input
			} else if (that != document.activeElement) setTimeout(() => { that.focus(); }, 20);
		};
		that.addEventListener('blur', that.blurHandler);

		let suggest = data => {
			let val = that.value;
			that.cache[val] = data;
			if (data.length && val.length >= o.minChars) {
				let s = '';
				for (let item of data) s += o.renderItem(item, val);
				that.sc.innerHTML = s;
				that.updateSC(0);
			}
			else
				that.sc.style.display = 'none';
		}

		that.keydownHandler = e => {
			let key = e.which;
			// down (40), up (38)
			if ((key == 40 || key == 38) && that.sc.innerHTML) {
				let next, sel = that.sc.querySelector('.autocomplete-suggestion.selected');
				if (!sel) {
					next = key == 40 ? that.sc.querySelector('.autocomplete-suggestion') : that.sc.childNodes[that.sc.childNodes.length - 1]; // first : last
					next.className += ' selected';
					that.value = next.getAttribute('data-val');
				} else {
					next = key == 40 ? sel.nextSibling : sel.previousSibling;
					if (next) {
						sel.className = sel.className.replace('selected', '');
						next.className += ' selected';
						that.value = next.getAttribute('data-val');
					}
					else { sel.className = sel.className.replace('selected', ''); that.value = that.last_val; next = 0; }
				}
				that.updateSC(0, next);
				return false;
			}
			// esc
			else if (key == 27) { that.value = that.last_val; that.sc.style.display = 'none'; }
			// enter
			else if (key == 13 || key == 9) {
				if (that.sc.style.display != 'none') {
					e.preventDefault();
				}
				let sel = that.sc.querySelector('.autocomplete-suggestion.selected');
				if (sel && that.sc.style.display != 'none') { o.onSelect(e, sel.getAttribute('data-val'), sel); setTimeout(() => { that.sc.style.display = 'none'; }, 20); }
			}
		};
		that.addEventListener('keydown', that.keydownHandler);

		that.keyupHandler = e => {
			let key = window.event ? e.keyCode : e.which;
			if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
				let val = that.value;
				if (val.length >= o.minChars) {
					if (val != that.last_val) {
						that.last_val = val;
						clearTimeout(that.timer);
						if (o.cache) {
							if (val in that.cache) {
								return suggest(that.cache[val]);
							}
							// no requests if previous suggestions were empty
							for (let i=1; i<val.length-o.minChars; i++) {
								let part = val.slice(0, val.length-i);
								if (part in that.cache && !that.cache[part].length) {
									return suggest([]);
								}
							}
						}
						that.timer = setTimeout(() => { o.source(val, suggest) }, o.delay);
					}
				} else {
					that.last_val = val;
					that.sc.style.display = 'none';
				}
			}
		};
		that.addEventListener('keyup', that.keyupHandler);

		that.focusHandler = e => {
			that.last_val = '\n';
			that.keyupHandler(e)
		};
		if (!o.minChars) that.addEventListener('focus', that.focusHandler);
	}

	// public destroy method
	this.destroy = () => {
		for (let that of elems) {
			window.removeEventListener('resize', that.updateSC);
			that.removeEventListener('blur', that.blurHandler);
			that.removeEventListener('focus', that.focusHandler);
			that.removeEventListener('keydown', that.keydownHandler);
			that.removeEventListener('keyup', that.keyupHandler);
			if (that.autocompleteAttr)
				that.setAttribute('autocomplete', that.autocompleteAttr);
			else
				that.removeAttribute('autocomplete');
			document.body.removeChild(that.sc);
		}
		elems = null;
	};
};