/*
 *  Micro library R.
 *  Copyright (c) 2011, Miankong.cc, RenYi.
 *
 */

(function () {

    var breaker = {};

    // Save bytes in the minified (but not gzipped) version:
    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

    // Create quick reference variables for speed access to core prototypes.
    var slice            = ArrayProto.slice,
        toString         = ObjProto.toString,
        hasOwnProperty   = ObjProto.hasOwnProperty;

    // All **ECMAScript 5** native function implementations that we hope to use
    // are declared here.
    var
      nativeForEach      = ArrayProto.forEach,
      nativeMap          = ArrayProto.map,
      nativeFilter       = ArrayProto.filter,
      nativeIndexOf      = ArrayProto.indexOf,
      nativeLastIndexOf  = ArrayProto.lastIndexOf,
      nativeIsArray      = Array.isArray,
      nativeKeys         = Object.keys,
      nativeBind         = FuncProto.bind;

    var cssNumber = {
        'column-count': 1,
        'columns': 1,
        'font-weight': 1,
        'line-height': 1,
        'opacity': 1,
        'z-index': 1,
        'zoom': 1
    };
    function appendPxIfNecessary(name, value) {
        if ($.isNumber(value) && !cssNumber[name]) {
            return value + "px";
        }
        return value;
    }

    // Use the '$' as a convention.
    var $ = function(query) {
        var context = arguments.length > 1 ? arguments[1] : undefined;
        return new dollar(query, context);
    };

/*-------------------------- The Usual Helper Functions --------------------*/

    $.slice = function(array, start, end) {
        return slice.call(array, start, end);
    };

    // Expanded stack pointer. pos = 0 means the stack top.
    $.esp = function(arrayLike, pos, value) {
        var len;
        if ((len = arrayLike.length) && (pos >= 0) && (pos < len)) {
            if (value != null) {
                return arrayLike[len - 1 - pos] = value;
            } else {
                return arrayLike[len - 1 - pos];
            }
        }
        return undefined;
    };

    $.delegate = $.call = function(obj, msg) {
        var fn;
        if (obj != null && (fn = obj[msg])) {
            if ($.isFunction(fn)) {
                return fn.apply(obj, $.slice(arguments, 2));
            } else {
                return fn;
            }
        }
    };

    $.capitalize = function(str) {
        return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
    };

    $.camelCase = function (str) {
          return str.replace(/\-(.)/g, function(m, l){return l.toUpperCase()});
    };

    $.escapeHTML = function(string) {
        return string.replace(
            /&(?!\w+;|#\d+;|#x[\da-f]+;)/gi, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27')
        .replace(/\//g, '&#x2F;');
    };

    // Is a given array or object empty?
    $.isEmpty = function(obj) {
        if ($.isArray(obj) || $.isString(obj)) return obj.length === 0;
        for (var key in obj) if (hasOwnProperty.call(obj, key)) return false;
        return true;
    };

    // Is a given value a DOM element?
    $.isElement = function(obj) {
        return !!(obj && obj.nodeType == 1);
    };

    // Is a given value an array?
    // Delegates to ECMA5's native Array.isArray
    $.isArray = nativeIsArray || function(obj) {
        return toString.call(obj) === '[object Array]';
    };

    // Is a given variable an object?
    $.isObject = function(obj) {
        return obj === new Object(obj);
    };

    // Is a given variable an arguments object?
    $.isArguments = function(obj) {
        return !!(obj && hasOwnProperty.call(obj, 'callee'));
    };

    // Is a given value a function?
    $.isFunction = function(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    };

    // Is a given value a string?
    $.isString = function(obj) {
        return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
    };

    // Is a given value a number?
    $.isNumber = function(obj) {
        return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
    };

    // Is the given value `NaN`? `NaN` happens to be the only value in JavaScript
    // that does not equal itself.
    $.isNaN = function(obj) {
        return obj !== obj;
    };

    // Is a given value a boolean?
    $.isBoolean = function(obj) {
        return obj === true || obj === false;
    };

    // Is a given value a date?
    $.isDate = function(obj) {
        return !!(obj && obj.getTimezoneOffset && obj.setUTCFullYear);
    };

    // Is the given value a regular expression?
    $.isRegExp = function(obj) {
        return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
    };

    // Is a given value equal to null?
    $.isNull = function(obj) {
        return obj === null;
    };

    // Is a given variable undefined?
    $.isUndefined = function(obj) {
        return obj === void 0;
    };

    $.identity = function(value) {
        return value;
    };

    var idCounter = 0;
    $.uniqueId = function(prefix) {
        var id = idCounter++;
        return prefix ? prefix + id : id;
    };

    // Perform a deep comparison to check if two objects are equal.
    $.isEqual = function(a, b) {
        // Check object identity.
        if (a === b) return true;
        // Different types?
        var atype = typeof(a), btype = typeof(b);
        if (atype != btype) return false;
        // Basic equality test (watch out for coercions).
        if (a == b) return true;
        // One is falsy and the other truthy.
        if ((!a && b) || (a && !b)) return false;
        // Unwrap any wrapped objects.
        if (a._chain) a = a._wrapped;
        if (b._chain) b = b._wrapped;
        // One of them implements an isEqual()?
        if (a.isEqual) return a.isEqual(b);
        if (b.isEqual) return b.isEqual(a);
        // Check dates' integer values.
        if ($.isDate(a) && $.isDate(b)) return a.getTime() === b.getTime();
        // Both are NaN?
        if ($.isNaN(a) && $.isNaN(b)) return false;
        // Compare regular expressions.
        if ($.isRegExp(a) && $.isRegExp(b))
            return a.source === b.source &&
                a.global === b.global &&
                a.ignoreCase === b.ignoreCase &&
                a.multiline === b.multiline;
        // If a is not an object by this point, we can't handle it.
        if (atype !== 'object') return false;
        // Check for different array lengths before comparing contents.
        if (a.length && (a.length !== b.length)) return false;
        // Nothing else worked, deep compare the contents.
        var aKeys = $.keys(a), bKeys = $.keys(b);
        // Different object sizes?
        if (aKeys.length != bKeys.length) return false;
        // Recursive comparison of contents.
        for (var key in a) if (!(key in b) || !$.isEqual(a[key], b[key])) return false;
        return true;
    };

    $.keys = nativeKeys || function(obj) {
        if (!$.isObject(obj))   throw new TypeError('Invalid object');
        var keys = [];
        for (var key in obj) if (hasOwnProperty.call(obj, key)) keys[keys.length] = key;
        return keys;
    };

    // Retrieve the values of an object's properties.
    $.values = function(obj) {
        return $.map(obj, $.identity);
    };

    $.methods = function(obj) {
        var names = [];
        for (var key in obj) {
            if ($.isFunction(obj[key]))
                names.push(key);
        }
        return names.sort();
    };

    // Extend the 'obj' with the argument object(s).
    $.extend = function(obj) {
        each(slice.call(arguments, 1), function(source) {
            for (var prop in source) {
                if (source[prop] !== void 0) obj[prop] = source[prop];
            }
        });
        return obj;
    };

    $.clone = function(obj) {
        return $.isArray(obj) ? obj.slice() : $.extend({}, obj);
    };

/*------------------------ Use integer instead of Date --------------------*/

    $.Mepoch = {
        S: Date.UTC(1997, 7, 4, 0, 0, 0),
        E: Date.UTC(2100, 1, 1, 0, 0, 0),

        scan: function(s) {
            if ($.isDate(s)) {
                s = s.toUTCString();
            }
            if ($.isString(s)) {
                var t = Date.parse(s);
                if ($.isNaN(t)) {
                    return [-1, "invalid time string."];
                }
                s = t;
            }
            if ($.isNumber(s)) {
                if (s > $.Mepoch.E || s < $.Mepoch.S) {
                    return [-1, "time machine has not been invented, yet."];
                }
                return [s, null];
            }
            return [-1, "invalid input: " + (typeof s)];
        },

        _toString: function(s) {
            var t;
            if ((t = $.Mepoch.scan(s)) && t[1]) {
                return undefined;
            }
            return (new Date(t[0])).toUTCString();
        },

        toLocalTimeString: function(when) {
            var t;
            if ((t = $.Mepoch.scan(when)) && t[1]) {
                return undefined;
            }
            t = new Date(t[0]);
            var m = t.getMinutes();
            return t.getHours() + ":" + (m < 10 ? "0" + m:m);
        },

        toLocalDateString: function(when) {
            var t;
            if ((t = $.Mepoch.scan(when)) && t[1]) {
                return undefined;
            }
            t = new Date(t[0]);
            return (t.getMonth() + 1) + "." + t.getDate();
        },

        toLocalString: function(when) {
            var t;
            if ((t = $.Mepoch.scan(when)) && t[1]) {
                return undefined;
            }
            return (new Date(t[0])).toString();
        },

        toDisplayString: function(when) {
            var t;
            if ((t = $.Mepoch.scan(when)) && t[1]) {
                return undefined;
            }
            t = new Date(t[0]);
            var m = t.getMinutes();
            return t.getFullYear() + "." + (t.getMonth() + 1) + "." + t.getDate()
            + " " + t.getHours() + ":" + (m < 10 ? "0" + m:m);
        },

        time: function(when) {
            if (!when)  when = (new Date).toUTCString();
            var x;
            if ((x = $.Mepoch.scan(when)) && x[1])    return undefined;
            return x[0];
        },

        daysToToday: function(when) {
            when = new Date($.Mepoch.time(when));
            var now = new Date();
            var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            when = new Date(when.getFullYear(), when.getMonth(), when.getDate());
            return Math.floor((when - today) / (24 * 60 * 60000));
        }
    };

/*-------------------------- Makes up a functional mind --------------------*/

    var each = $.each = $.forEach = function(obj, iterator, context) {
        if (obj == null) return;
        if (nativeForEach && obj.forEach === nativeForEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
                if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
            }
        } else {
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    if (iterator.call(context, obj[key], key, obj) === breaker) return;
                }
            }
        }
    };

    $.map = function(obj, iterator, context) {
        var results = [];
        if (obj == null) return results;
        if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
        each(obj, function(value, index, list) {
            results[results.length] = iterator.call(context, value, index, list);
        });
        return results;
    };

    $.filter = function(obj, iterator, context) {
        var results = [];
        if (obj == null) return results;
        if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
        each(obj, function(value, index, list) {
            if (iterator.call(context, value, index, list)) results[results.length] = value;
        });
        return results;
    };

    $.pluck = function(obj, key) {
        return $.map(obj, function(value){ return value[key]; });
    };

    $.sortBy = function(obj, iterator, context) {
        return $.pluck($.map(obj,
            function(value, index, list) {
                return {
                    value : value,
                    criteria : iterator.call(context, value, index, list)
                };
            }).sort(function(left, right) {
                var a = left.criteria, b = right.criteria;
                return a < b ? -1 : a > b ? 1 : 0;
            }), 'value');
    };

    $.sortedIndex = function(array, obj, iterator) {
        iterator || (iterator = $.identity);
        var low = 0, high = array.length;
        while (low < high) {
            var mid = (low + high) >> 1;
            iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
        }
        return low;
    };

    $.indexOf = function(array, item, isSorted) {
        if (array == null) return -1;
        var i, l;
        if (isSorted) {
            i = $.sortedIndex(array, item);
            return array[i] === item ? i : -1;
        }
        if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
        for (i = 0,l = array.length; i < l; i++) if (array[i] === item) return i;
        return -1;
    };

    $.lastIndexOf = function(array, item) {
        if (array == null) return -1;
        if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
        var i = array.length;
        while (i--) if (array[i] === item) return i;
        return -1;
    };

    $.toArray = function(iterable) {
        if (!iterable)                return [];
        if (iterable.toArray)         return iterable.toArray();
        if ($.isArray(iterable))      return slice.call(iterable);
        if ($.isArguments(iterable))  return slice.call(iterable);
        return $.values(iterable);
    };

    // Return the number of elements in an object.
    $.size = function(obj) {
        return $.toArray(obj).length;
    };

    $.bind = function(func, obj) {
        if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
        var args = slice.call(arguments, 2);
        return function() {
            return func.apply(obj, args.concat(slice.call(arguments)));
        };
    };

    $.bindAll = function(obj) {
        var funcs = slice.call(arguments, 1);
        if (funcs.length == 0)  funcs = $.methods(obj);
        each(funcs, function(f) { obj[f] = $.bind(obj[f], obj); });
        return obj;
    };

    // Returns the first function passed as an argument to the second,
    // allowing you to adjust arguments, run code before and after, and
    // conditionally execute the original function.
    $.wrap = function(func, wrapper) {
        return function() {
            var args = [func].concat(slice.call(arguments));
            return wrapper.apply(this, args);
        };
    };

    // Returns a function that is the composition of a list of functions, each
    // consuming the return value of the function that follows.
    $.compose = function() {
        var funcs = slice.call(arguments);
        return function() {
            var args = slice.call(arguments);
            for (var i = funcs.length - 1; i >= 0; i--) {
                args = [funcs[i].apply(this, args)];
            }
            return args[0];
        };
    };

    $.delay = function(func, wait) {
        var args = slice.call(arguments, 2);
        return setTimeout(function(){ return func.apply(func, args); }, wait);
    };

    // Defers a function, scheduling it to run after the current call stack has
    // cleared.
    $.defer = function(func, ctx) {
        return $.delay.apply($, [func, 1].concat(slice.call(arguments, 1)));
    };


/*-------------------------- Selector functions --------------------*/

    var fragmentRE = /^\s*<(\w+)[^>]*>/,
        table = document.createElement('table'),
        tableRow = document.createElement('tr'),
        containers = {
            'tr': document.createElement('tbody'),
            'tbody': table,
            'thead': table,
            'tfoot': table,
            'td': tableRow,
            'th': tableRow,
            '*': document.createElement('div')
        },
        elementTypes = [1, 9, 11];

    function fragment(html, name) {
        if (name === undefined)
            name = fragmentRE.test(html) && RegExp.$1;
        if (!(name in containers))
            name = '*';
        var container = containers[name];
        container.innerHTML = '' + html;
        return $.filter($.slice(container.childNodes), function(node){
            if (node.nodeType == 3 && !node.textContent.replace(/\s*/g, ''))
                return false;
            return true;
        });
    }

	// Dollar type
    //  :param query:   a node, a string selector, a html fragment or an instance of dollar
    //  :param context: a string selector, an instance of dollar (only valid when query is a selector)
    var dollar = function(query, context) {
        if (query == null)
            return null;
        if (query.nodeType || query === window) {
            query = [query];
        } else if ($.isString(query)) {
            if (fragmentRE.test(query)) {
                query = fragment(query, RegExp.$1);
            } else {
                if (context instanceof dollar) {
                    query = context.find(query);
                } else if ($.isString(context)) {
                    var t = [];
                    $.each(webkitSelect(document, context), function(el){
                        var nodes = webkitSelect(el, query);
                        t.length += nodes.length;
                        for(var i = 0; i < nodes.length; i++) {
                            t[t.length - i - 1] = nodes[nodes.length - i - 1];
                        }
                    });
                    query = t;
                } else if (context && context.nodeType) {
                    query = webkitSelect(context, query);
                } else {
                    if (context !== undefined)
                        console.log("dollar: invalid context");
                    query = webkitSelect(document, query);
                }
            }
        } else if (query instanceof dollar) {
            // clone query.
        } else if ($.isUndefined(query.length)) {
            return null;
        }

        this.length = query.length;
        for(var i = 0; i < this.length; i++) {
            this[i] = query[i];
        }
        return this;
    };

    var webkitSelect = function(element, selector) {
        try {
            var res = element.querySelectorAll(selector);
        } catch (e) {
            console.log(element + ":" + selector);
            throw e;
        }
        return res;
    };

    var domInsert = function(opname, to, contentNode) {
        if (opname && opname == "append") {
            to.insertBefore(contentNode, null);
        } else if (opname && opname == "prepend" ) {
            to.insertBefore(contentNode, to.firstChild);
            //to.parentNode.insertBefore(contentNode, to.parentNode.firstChild);
            //to.insertBefore(contentNode, to.parentNode.firstChild);
        } else if (opname == "after") {
            //to.insertBefore(contentNode, to.nextSibling);
            to.parentNode.insertBefore(contentNode, to.nextSibling);
        } else if (opname == "before") {
            to.parentNode.insertBefore(contentNode, to);
        }
    };

    var domAdjacent = function(opname, $to, content) {
        content = $(content);
        if (!content || !content.length) {
            return;
        }
        var reverse = (opname == "prepend" || opname == "after");
        $.each($to, function(el, ndx){
            var copy = ($to.length > 1 && ndx < $to.length);
            for(var i = 0; i < content.length; i++) {
                var node = content[reverse ? content.length - i - 1 : i];
                if (copy)
                    node = node.cloneNode(true);
                domInsert(opname, el, node);
            }
        });
    };

    $.each(["prepend", "after", "before", "append"], function(opname) {
        dollar.prototype[opname] = function(content){
            domAdjacent(opname, this, content);
            return this;
        };
    });
    $.each(["prepend", "after", "before", "append"], function(opname) {
        dollar.prototype[opname + "To"] = function(content){
            domAdjacent(opname, $(content), this);
            return this;
        };
    });

    // Custom NodeList prototypes
    $.extend(dollar.prototype, {
        find: function(selector){
            var result = [];
            if (this.length == 1)
                result = webkitSelect(this[0], selector);
            else {
                $.each(this, function(el){
                    var t = webkitSelect(el, selector);
                    result.length += t.length;
                    for(var i=0; i < t.length; i++) {
                        result[result.length - i - 1] = t[t.length - i - 1];
                    }
                });
            }
            return $(result, undefined);
        },

        remove: function() {
            $.each(this, function(el){
                if (el.parentNode != null) {
                    el.parentNode.removeChild(el);
                }
            });
        },

        empty: function() {
            $.each(this, function(el){
                el.innerHTML = '';
            });
            return this;
        },

        bind: function (type, fn, capture) {
            $.each(this, function(el){
                el.addEventListener(type, fn, capture ? true: false);
            });
            return this;
        },

        unbind: function (type, fn, capture) {
            $.each(this, function(el){
                el.removeEventListener(type, fn, capture ? true:false);
            });
            return this;
        },

        parent: function () {
            var result = [], parent, i, l;
            $.each(this, function(el){
                parent = el.parentNode;
                if (!parent._visited) {
                    result[result.length] = parent;
                    parent._visited = true;
                }
            });
            $.each(result, function(el){
                delete el._visited;
            });
            return $(result);
        },

        // Returns the first element className
        klass: function(classes) {
            if (!this.length)   return undefined;
            if (!classes) {
                return this[0].className;
            }
            $.each(this, function(el){
                el.className = classes;
            });
            return this;
        },

        hasClass: function (className) {
            if (!this.length)   return false;
            return $.hasClass(this[0], className);
        },

        // Add one or more classes to all elements
        addClass: function () {
            $.each(arguments, function(cls){
                $.each(this, function(el){
                    if (!$.hasClass(el, cls)) {
                        el.className = el.className ? el.className + " " + cls : cls;
                    }
                });
            }, this);
            return this;
        },

        removeClass: function () {
            $.each(arguments, function(cls){
                $.each(this, function(el){
                    if (el.className)
                        el.className = el.className.replace(new RegExp('(^|\\s+)' + cls + '(\\s+|$)'), " ");
                });
            }, this);
            return this;
        },

        toggleClass: function() {
            $.each(arguments, function(cls){
                if (this.hasClass(cls)) {
                    this.removeClass(cls);
                } else {
                    this.addClass(cls);
                }
            }, this);
        },

        html: function (value) {
            if ($.isUndefined(value)) {
                if (!this.length)   return undefined;
                return this[0].innerHTML;
            }
            $.each(this, function(el){
                el.innerHTML = value;
            });
            return this;
        },

        text: function(text){
            if ($.isUndefined(text)) {
                if (!this.length)   return undefined;
                return this[0].textContent;
            }
            $.each(this, function(el){
                el.textContent = text;
            });
            return this;
        },

        attr: function(name, value){
            if ($.isString(name) && $.isUndefined(value)) {
                if (!this.length)   return undefined;
                if (this[0].nodeName == 'INPUT' && this[0].type == 'text' && name == 'value') {
                    return this.val();
                }
                if (!this[0].getAttribute)  return undefined;
                return this[0].getAttribute(name) || (name in this[0] ? this[0][name] : undefined);
            }
            $.each(this, function(el){
                if ($.isObject(name)) {
                    $.each(name, function(v, k){
                        el.setAttribute(k, v);
                    });
                } else {
                    el.setAttribute(name, value);
                }
            });
            return this;
        },

        removeAttr: function(name) {
            $.each(this, function(el){
                el.removeAttribute(name);
            });
            return this;
        },

        val: function(value){
            if ($.isUndefined(value)) {
                if (!this.length)   return undefined;
                return this[0].value;
            }
            $.each(this, function(el){
                el.value = value;
            });
            return this;
        },

        offset: function(){
            if (this.length) {
                var rc = this[0].getBoundingClientRect();
                return {
                    left:   rc.left + document.body.scrollLeft,
                    top:    rc.top + document.body.scrollTop,
                    width:  rc.width,
                    height: rc.height
                }
            }
            return null;
        },

        css: function(property, value){
            if ($.isString(property) && $.isUndefined(value)) {
                if (!this.length)   return null;
                return this[0].style[$.camelCase(property)]
                    || getComputedStyle(this[0], null).getPropertyValue(property);
            }

            var css = '';
            if ($.isString(property)) {
                css = property + ":" + appendPxIfNecessary(property, value);
                var regex = new RegExp(property + "\\s*:\\s*[^;]*", "ig"),
                    old, t;
                $.each(this, function(el){
                    old = el.style.cssText;
                    if (old) {
                        t = old.replace(regex, css);
                        if (t == old) {
                            el.style.cssText = old + ";" + css;
                        } else {
                            el.style.cssText = t;
                        }
                    } else {
                        el.style.cssText = css;
                    }
                });
            } else {
                $.each(this, function(el){
                    var old = el.style.cssText;
                    if (old) {
                        $.each(property, function(v, k){
                            css = k + ":" + appendPxIfNecessary(k, v);
                            var regex = new RegExp(k + "\\s*:\\s*[^;]*", "ig");
                            var t = old.replace(regex, css);
                            if (t == old) {
                                old += ";" + css;
                            } else {
                                old = t;
                            }
                        });
                        css = old;
                    } else {
                        $.each(property, function(v, k){
                            css += k + ":" + appendPxIfNecessary(k, v) + ";";
                        });
                    }
                    el.style.cssText = css;
                });
            }
            return this;
        },

        show: function(visible) {
            if (!this.length)   return;

            var s = this.attr("style");
            s = s && !$.isUndefined(s.cssText) ? "":s;
            var ss = s.replace(/display\s*:\s*none;?/gi, "");
            if (visible) {
                if (!s || s != ss)    this.attr("style", ss);
            } else {
                if (!s || s == ss)    this.attr("style", "display:none;" + ss);
            }
        },

        width: function (value) {
            if (!this.length)   return undefined;
            if (value === undefined) {
                return this[0].clientWidth;
            }

            $.each(this, function (el) {
                el.style.width = value === '' ? "" : value + 'px';
            });
            return this;
        },

        height: function (value) {
            if (!this.length)   return undefined;
            if (value === undefined) {
                return this[0].clientHeight;
            }

            $.each(this, function (el) {
                el.style.height = value === '' ? '' : value + 'px';
            });
            return this;
        }
    });

	// Holds all functions to be executed on DOM ready
	var readyFn = [],
	DOMReady = function () {
		for(var i=0, l=readyFn.length; i<l; i++) {
			readyFn[i]();
		}
		readyFn = null;
		document.removeEventListener('DOMContentLoaded', DOMReady, false);
	};


    $.extend($, {
        isIpad: (/ipad/gi).test(navigator.appVersion),
        isIphone: (/iphone/gi).test(navigator.appVersion),
        isAndroid: (/android/gi).test(navigator.appVersion),
        hasOrientationChange: ('onorientationchange' in window),
        hasHashChange: ('onhashchange' in window),
        isStandalone: window.navigator.standalone,
        has3d: ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix()),

        // Execute functions on DOM ready
        ready: function (fn) {
            if (readyFn.length == 0) {
                document.addEventListener('DOMContentLoaded', DOMReady, false);
            }

            readyFn.push(fn);
        },

        hasClass: function (el, className) {
            return new RegExp('(^|\\s)' + className + '(\\s|$)').test(el.className);
        }
    });

    var templateSettings = {
        evaluate    : /\{%([\s\S]+?)%\}/g,
        interpolate : /\{\{(.+?)\}\}/g // /<%=([\s\S]+?)%>/g
    };

    // JavaScript micro-template, similar to John Resig's implementation.
    $.template = function(str, data) {
        var c = templateSettings;
        var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
            'with(obj||{}){__p.push(\'' +
            str.replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(c.interpolate, function(match, code) {
                    return "'," + code.replace(/\\'/g, "'") + ",'";
                })
                .replace(c.evaluate || null, function(match, code) {
                    return "');" + code.replace(/\\'/g, "'")
                        .replace(/[\r\n\t]/g, ' ') + "__p.push('";
                })
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n')
                .replace(/\t/g, '\\t')
            + "');}return __p.join('');";
        //console.log(tmpl);
        var func = new Function('obj', tmpl);
        return data ? func(data) : func;
    };

    /*-------------------------- Global Touch Handler --------------------*/
    var TAP = "data-tap",       // custom dom attribute
        TOUCHED = "touched",    // css class
        RE_TOUCHED = /(^|\s+)touched(\s+|$)/g,
        MAX_MOVE = 5;
    $.clicker = {
        useTouch: false,
        handlers: {},
        touched: null,
        handler_ndx: -1,
        X: 0,
        Y: 0,

        init: function() {
            $.bindAll(this, "onTouchStart", "onTouchEnd", "onTouchMove");

            this.useTouch = 'ontouchstart' in window;
            if (this.useTouch) {
                document.addEventListener("touchstart", this.onTouchStart, true);
            } else {
                document.addEventListener("mousedown", this.onTouchStart, true);
            }
        },

        clientXY: function(e) {
            if (e.type.indexOf("mouse") == 0) {
                return [e.clientX, e.clientY];
            } else {
                return [e.touches[0].clientX, e.touches[0].clientY];
            }
        },

        onTouchStart: function(e) {
            var res = this.tappable(e);
            if (!res[0])   return;
            var t;
            t = this.clientXY(e);
            this.X = t[0], this.Y = t[1];

            this.touched = res[0];
            this.addTouchedClass();

            this.handler_ndx = res[1];
            if (this.useTouch) {
                this.touched.addEventListener("touchend", this.onTouchEnd, true);
                document.addEventListener("touchmove", this.onTouchMove, true);
            } else {
                this.touched.addEventListener("mouseup", this.onTouchEnd, true);
                document.addEventListener("mousemove", this.onTouchMove, true);
            }
        },

        onTouchMove: function(e) {
            var x = this.clientXY(e), y = x[1];
            x = x[0];
            if (Math.abs(x - this.X) > MAX_MOVE || Math.abs(y - this.Y) > MAX_MOVE) {
                this.reset();
            }
        },

        onTouchEnd: function(e) {
            this.fire(e, this.handler_ndx);
            this.reset();
        },

        reset: function() {
            this.removeTouchedClass();
            if (this.useTouch) {
                this.touched.removeEventListener("touchend", this.onTouchEnd, true);
                document.removeEventListener("touchmove", this.onTouchMove, true);
            } else {
                this.touched.removeEventListener("mouseup", this.onTouchEnd, true);
                document.removeEventListener("mousemove", this.onTouchMove, true);
            }
            this.touched = null;
        },

        tappable: function(e) {
            var el = e.target.nodeType == 3 ? e.target.parentNode : e.target,
                ndx, t;

            if (!(ndx = el.getAttribute(TAP))) {
                if ((t = el.parentNode) && (ndx = t.getAttribute(TAP))) {
                    el = t;
                } else if ((t = el.parentNode) && (t = t.parentNode) && (ndx = t.getAttribute(TAP))) {
                    el = t;
                } else {
                    el = null;
                }
            }
            if (!el)    return [null, null];
            return [el, ndx];
        },

        fire: function(e, ndx) {
            e.stopPropagation();
            e.preventDefault();
            ndx = parseInt(ndx);
            this.handlers[ndx].fn.apply(this.handlers[ndx].ctx, this.handlers[ndx].args);
        },

        bind: function(sel, fn, context) {
            var id = $.uniqueId();
            this.handlers[id] = {
                fn: fn,
                ctx: context,
                args: $.slice(arguments, 3)
            };
            $(sel).attr(TAP, id);
            //console.log("Clicker: " + $.size(this.handlers) + " handlers");
            return this;
        },

        unbind: function(sel) {
            var indices = {};
            $.each($(sel), function(el){
                var ndx = el.getAttribute(TAP);
                if (!ndx)   return;
                el.removeAttribute(TAP);
                indices[ndx] = parseInt(ndx);
            });
            $.each(indices, function(v){
                delete this.handlers[v];
            }, this);
        },

        // short circuit functions
        addTouchedClass: function(force) {
            var el = this.touched;
            if (el) {
                if (el.nodeName!="LI" && !$.hasClass(el, TOUCHED)) {
                    el.className = el.className ? el.className + " " + TOUCHED : TOUCHED;
                } else {
                    $.delay(function(self){
                        var _el = self.touched;
                        if (_el && (el === _el) && !$.hasClass(_el, TOUCHED)) {
                            _el.className = _el.className ? _el.className + " " + TOUCHED : TOUCHED;
                        }
                    }, 150, this);
                }
            }
        },

        removeTouchedClass: function() {
            var el = this.touched;
            if (el && el.className)
                el.className = el.className.replace(RE_TOUCHED, " ");
        }
    };

/*-------------------------- Model/Controller --------------------*/
    $.Events = {
        _callbacks: {},

        // Bind an event, specified by a string name, `ev`, to a `callback` function.
        // Passing `"all"` will bind the callback to all events fired.
        bind : function(ev, callback) {
            var list = this._callbacks[ev] || (this._callbacks[ev] = []);
            list.push(callback);
            return this;
        },

        // Remove one or many callbacks. If `callback` is null, removes all
        // callbacks for the event. If `ev` is null, removes all bound callbacks
        // for all events.
        unbind : function(ev, callback) {
            var calls;
            if (!ev) {
                this._callbacks = {};
            } else if (calls = this._callbacks) {
                if (!callback) {
                    calls[ev] = [];
                } else {
                    var list = calls[ev];
                    if (!list) return this;
                    for (var i = 0, l = list.length; i < l; i++) {
                        if (callback === list[i]) {
                            list[i] = null;
                            break;
                        }
                    }
                }
            }
            return this;
        },

        // Trigger an event, firing all bound callbacks. Callbacks are passed the
        // same arguments as `trigger` is, apart from the event name.
        // Listening for `"all"` passes the true event name as the first argument.
        trigger : function(eventName) {
            var list, calls, ev, callback, args;
            var both = 2;
            if (!(calls = this._callbacks)) return this;
            while (both--) {
                ev = both ? eventName : 'all';
                if (list = calls[ev]) {
                    for (var i = 0, l = list.length; i < l; i++) {
                        if (!(callback = list[i])) {
                            list.splice(i, 1);
                            i--;
                            l--;
                        } else {
                            args = both ? slice.call(arguments, 1) : arguments;
                            callback.apply(this, args);
                        }
                    }
                }
            }
            return this;
        }
    };

    $.Model = function(attrs, opts) {
        if (!attrs) attrs = {};
        var defaults;
        if (defaults = this.defaults) {
            if ($.isFunction(defaults)) defaults = defaults();
            $.each(defaults, function(v, k){
                if ($.isFunction(v)) {
                    defaults[k] = v();
                }
            });
            attrs = $.extend({}, defaults, attrs);
        }
        this.internID = $.uniqueId('id');
        this.attrs = {};
        this._escaped = {};
        this.set(attrs, {silent: true});
        this._changed = false;
        this._previous = $.clone(this.attrs);
        this._ajaxing = false;
        this._lastAjaxTime = 0;
        if (opts && opts.collection)    this.collection = opts.collection;
        this.init(attrs, opts);
    };

    $.extend($.Model.prototype, $.Events, {
        AJAX_INTERVAL: 15,  // minimum interval in seconds
        idName: "gid",

        _previous: null,
        _changed: false,
        _changing: false,

        init: function() {},

        asMap: function() {
            return $.clone(this.attrs);
        },

        has: function(key) {
            return this.attrs[key] != null;
        },

        get: function(key) {
            return this.attrs[key];
        },

        set: function(attrs, opts) {
            if (!attrs) return this;
            if (!opts)  opts = {};
            if (attrs.attrs)    attrs = attrs.attrs;
            if (!opts.silent && this.validate && !this.doValidation(attrs, opts))
                return this;
            if (this.idName in attrs)   this[this.idName] = attrs[this.idName];
            var duringChanging = this._changing;
            this._changing = true;
            $.each(attrs, function(v, k){
                if (!$.isEqual(v, this.attrs[k])) {
                    this.attrs[k] = v;
                    delete this._escaped[k];
                    this._changed = true;
                    if (!opts.silent)   this.trigger("change:" + k, this, v, opts);
                }
            }, this);
            if (!duringChanging && !opts.silent && this._changed)   this.change(opts);
            this._changing = false;
            return this;
        },

        del: function(key, opts) {
            if (!key in this.attrs)    return this;
            opts = opts || {};
            var v = {};
            v[key] = undefined;
            if (!opts.silent && this.validate && !this.doValidation(v, opts))
                return this;

            delete this.attrs[key];
            delete this._escaped[key];
            if (key == this.idName) delete this[this.idName];
            this._changed = true;
            if (!opts.silent) {
                this.trigger("change:" + key, this, undefined, opts);
                this.change(opts);
            }
            return this;
        },

        clear: function(opts) {
            opts = opts || {};
            var v = {},
                k;
            for(k in this.attrs)    v[k] = undefined;
            if (!opts.silent && this.validate && !this.doValidation(v, opts))
                return this;
            this.attrs = {};
            this._escaped = {};
            this._changed = true;
            if (!opts.silent) {
                for(k in v) {
                    this.trigger("change:" + k, this, undefined, opts);
                }
                this.change(opts);
            }
            return this;
        },

        escape: function(key) {
            var html;
            if (html = this._escaped[key])  return html;
            var val = this.attrs[key];
            return this._escaped[key] = $.escapeHTML(val == null ? "":"" + val);
        },

        change : function(opts) {
            this.trigger('change', this, opts);
            this._previous = $.clone(this.attrs);
            this._changed = false;
        },

        clone: function() {
            return new this.constructor(this);
        },

        hasID: function() {
            return this[this.idName] == null;
        },

        changed: function(key) {
            if (key)    return this._previous[key] != this.attrs[key];
            return this._changed;
        },

        changedAttrs: function(subset) {
            subset || (subset = this.attrs);
            var changed = undefined;
            $.each(subset, function(v, k){
                if (!$.isEqual(this._previous[k], v)) {
                    changed || (changed = {});
                    changed[k] = v;
                }
            }, this);
            return changed;
        },

        previous: function(key) {
            if (!key || !this._previous)    return null;
            return this._previous[key];
        },

        previousAttrs: function() {
            return $.clone(this._previous);
        },

        doValidation: function(attrs, opts) {
            var emsg = this.validate(attrs);
            if (emsg) {
                if ($.isFunction(opts.error)) {
                    opts.error(this, emsg, opts);
                } else {
                    this.trigger("error", this, emsg, opts);
                }
                return false;
            }
            return true;
        },

        ajaxFetch: function(url, data, fnSuccess, fnError, loadingMsg) {
            if (!url)   url = this.URL;
            if (!url) {
                throw new Error("Model without REST url.");
            }
            if (this._ajaxing)  return;
            var tm = $.Mepoch.time() / 1000;
            if ((tm - this._lastAjaxTime) < this.AJAX_INTERVAL) {
                return;
            }
            this._ajaxing = true;
            this._lastAjaxTime = tm;
            $.defer(function(self){
                jsi.modalLoadingIndicator(loadingMsg || "正在读取信息...");
                jsi.ajax("GET", url, data, function(response){
                    jsi.closeModalLoadingIndicator();
                    if (response && fnSuccess) {
                        fnSuccess(self, response);
                        $.delegate(self.delegate, "onRefreshed");
                        self._ajaxing = false;
                    }
                }, function(emsg){
                    jsi.closeModalLoadingIndicator();
                    if (fnError) {
                        fnError(self, emsg);
                    } else if (fnError === undefined) {
                        jsi.modalAlert(emsg);
                    }
                    $.delegate(self.delegate, "onRefreshed");
                    self._ajaxing = false;
                });
            }, this);
        }

    });

    var TMPL = "#templates";

    $.makeView = function(parentView, tmplSel, appNamespace, keepTemplate) {
        if (!appNamespace)  appNamespace = {};
        var viewClass = $(tmplSel, TMPL).attr("data-view") || "View";
        var ctor = appNamespace[viewClass] || $[viewClass];
        if (!ctor)  throw new Error("View[" + viewClass + "] does not exist");
        var view = new ctor(tmplSel, appNamespace, keepTemplate);
        view.parent = parentView;
        return view;
    };

    $.View = function(tmplSel, appNamespace, keepTemplate) {
        this.initDataMembers();
        
        if (!appNamespace)  appNamespace = {};
        this.appNamespace = appNamespace;

        var tmpl = $(tmplSel, TMPL);

        var ctorName = tmpl.attr("data-delegate");
        var ctor = appNamespace[ctorName];
        if ($.isFunction(ctor)) {
            this.delegate = new ctor(this);
            // XXX: force the delegate to be a singleton by replacing the 'class' with an instance
            appNamespace[ctorName] = this.delegate;
        } else if ($.isObject(ctor)) {
            ctor.view = this;
            this.delegate = ctor;
        } else
            this.delegate = this;
        this.cssClass = tmpl.attr("class") || null;

        this.tmpl = tmpl.html();
        if (!this.tmpl)
            throw new Error("View: template cannot be empty (" + tmplSel + ").");
        if (!keepTemplate)
            tmpl.empty();   // destruct the originals (to avoid the ID conflict)

        this.tmplFn = $.template(this.tmpl);

        this.mid = $.uniqueId();
        this.init(tmplSel, appNamespace, keepTemplate);
        this.doDelegate("viewCreated", this);
    };

    $.extend($.View.prototype, {
        TMPL : TMPL,
        TOUCHABLE: "data-touchable",
        BOUND: "data-clicker",
        PARAM: "data-user",

        dataMembers: function() {
            return {
                appNamespace: null,
                cssClass: null, // css class from the template holder's div
                tmpl: null,     // template in string
                tmplFn: null,   // pre-compiled template function
                fragment: null, // rendered template and $'d

                delegate: null,

                mid:null,
                parent: null,   // parent view (if exists)

                // TODO: inventing the subview attribute
                subviews: null, // map of mid to 2-item tuple, [#holder-sel, view]
                stage: null     // DIV wraps the whole app, only set in the root view.
            };
        },

        initDataMembers: function() {
            var d = this.dataMembers();
            for(var n in d) this[n] = d[n];
        },

        init: function(tmplSel, appNamespace, keepTemplate) {
        },

        isInDOM: function(frag) {
            var n = frag || this.fragment;
            for(var el = frag && frag[0]; el && !(el instanceof HTMLBodyElement); el = el.parentNode) {}
            return !!el;
            //return this.fragment && this.fragment[0].parentNode;
        },

        // always force render.
        render: function(force, by) {
            var ctx = $.delegate(this.delegate, "templateContext") || {};
            var tmpl = $(this.tmplFn(ctx));

            if (this.fragment) { //this.isInDOM()) {
                this.disconnect(this.fragment);
                // xxx: depends on the template having a <div> as the overall holder!
                $(this.fragment[0]).html($(tmpl[0]).html());
                this.connect(this.fragment);
            } else {
                this.fragment = tmpl;
                this.connect(this.fragment);
            }
            this.doDelegate("viewRendered");
            return this;
        },

        connect: function(fragment, delegate) {
            // Ironically, all the connection are made before the fragment is on screen.
            //if (!this.isInDOM(fragment))
            //    throw new Error("Connect: fragment is not added to DOM yet.");

            delegate = delegate || this.delegate;
            var N = this.appNamespace;

            $.each($("[" + this.TOUCHABLE + "]", fragment), function(el){
                var $el = $(el),
                    fn = $el.attr(this.TOUCHABLE),
                    parts = fn.split("."),
                    obj, i;

                if (parts && parts.length == 1 && $el.attr(this.BOUND) != "1") {
                    if (delegate && delegate[fn]) {
                        //console.log("Bind: " + fn + $el.attr(this.PARAM));
                        $.clicker.bind($el, delegate[fn], delegate, $el.attr(this.PARAM));
                        $el.attr(this.BOUND, 1);
                    }
                } else {
                    for(i=1, obj= (N && N[parts[0]] ? N[parts[0]] : null);
                        obj && (i < parts.length - 1);
                        i++)
                    {
                        obj = obj[parts[i]]
                    }
                    if (i == (parts.length - 1) && obj && obj[parts[i]] && $el.attr(this.BOUND) != "1") {
                        $.clicker.bind($el, obj[parts[i]], obj, $el.attr(this.PARAM));
                        $el.attr(this.BOUND, 1);
                    }
                }
            }, this);
            this.doDelegate("connected");
        },

        disconnect: function(fragment, delegate) {
            delegate = delegate || this.delegate;
            $.each($("[" + this.BOUND + "]", fragment), function(el){
                var $el = $(el);
                $.clicker.unbind($el);
                $el.removeAttr(this.BOUND);
            }, this);
            this.doDelegate("disconnected")
        },

        destroy: function(){
            if (this.fragment) {
                this.doDelegate("beforeDestroy");

                this.disconnect(this.fragment);
                if (this.fragment[0].parentNode) {
                    this.fragment.remove();
                }
                this.fragment = null;
            }
        },

        doDelegate: function(msg) {
            if (this.delegate) {
                var args = [this.delegate, msg].concat($.slice(arguments, 1));
                return $.delegate.apply($, args);
            } else {
                console.log("View:doDelegate: this.delegate is empty");
            }
        }
    });


    // Set up inheritance for the model and view.
    // XXX: remove this js magic!
    var extend = function (protoProps, classProps) {
        var child = inherits(this, protoProps, classProps);
        child.extend = this.extend;
        return child;
    };

    $.each([
        "Model", "View"
    ], function(name){
        $[name].extend = extend;
    });

    // private helpers

    var wrapError = function(onError, model, options) {
        return function(resp) {
            if (onError) {
                onError(model, resp, options);
            } else {
                model.trigger('error', model, resp, options);
            }
        };
    };

    var ctor = function() {};

    var inherits = function(parent, protoProps, staticProps) {
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call `super()`.
        if (protoProps && protoProps.hasOwnProperty('constructor')) {
            child = protoProps.constructor;
        } else {
            child = function() {
                return parent.apply(this, arguments);
            };
        }

        // Inherit class (static) properties from parent.
        $.extend(child, parent);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps)
            $.extend(child.prototype, protoProps);

        // Add static properties to the constructor function, if supplied.
        if (staticProps)
            $.extend(child, staticProps);

        // Correctly set child's `prototype.constructor`.
        child.prototype.constructor = child;

        // Set a convenience property in case the parent's prototype is needed later.
        child.prototype._super_ = parent.prototype;

        return child;
    };

    window.$ = $;
})();