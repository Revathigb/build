'use strict';

var grid, tabBar, tutorial, callApi;

var tutTOC = [
    'Table of Contents.html',
    'Welcome.html',
    'The Workench Interface.html',
    [
        'The Hypergrid Section.html',
        'The Editor Section.html',
        'The Tutorial Section.html'
    ],
    'The Data tab.html',
    [
        'Activity D-1 - Edit a cell value in the grid.html',
        'Activity D-2 - Edit a cell value in the Data editor.html',
        'Activity D-3 - Add a row in the Data editor.html'
    ],
    'The State tab.html',
    [
        'Activity S-1 - Edit a grid property',
        'Properties Basics.html',
        'Activity S-2 - Edit a column property.html'
    ],
    'The Localizers Tab.html',
    [
        'Activity S-3 - Bind a cell to a localizer.html',
        'Adding a new localizer.html',
        'Activity L-1 - Create a localizer.html'
    ],
    'The Cell Editors tab.html',
    [
        'Activity CE-1 - Edit a cell without a localizer.html',
        'Activity CE-2 - Edit a cell with a localizer.html'
    ],
    'Validation.html',
    [
        'The parse() method.html',
        'The invalid() method.html',
        'Activity CE-3 - Returning parsing errors.html'
    ]
];

window.onload = function() {
    var NEW = '(New)';
    var isCamelCase = /[a-z][A-Z]/;
    var isJSON = /^[[{]/;
    var saveFuncs = {
        editor: saveCellEditor,
        localizer: saveLocalizer
    };
    window.defaults = {
        data: '../data/four-stocks.json',
        state: 'defaults/state.json',
        scrollbars: 'defaults/scrollbars.css'
    };

    Array.prototype.forEach.call(document.getElementsByClassName('reset-button'), function(el) {
        el.innerHTML = '<svg viewBox="0 0 32 32" version="1.1" width="22" height="22"><path d="M 15.5 2.09375 L 14.09375 3.5 L 16.59375 6.03125 C 16.394531 6.019531 16.203125 6 16 6 C 10.5 6 6 10.5 6 16 C 6 17.5 6.304688 18.894531 6.90625 20.09375 L 8.40625 18.59375 C 8.207031 17.792969 8 16.898438 8 16 C 8 11.601563 11.601563 8 16 8 C 16.175781 8 16.359375 8.019531 16.53125 8.03125 L 14.09375 10.5 L 15.5 11.90625 L 19.71875 7.71875 L 20.40625 7 L 19.71875 6.28125 Z M 25.09375 11.90625 L 23.59375 13.40625 C 23.894531 14.207031 24 15.101563 24 16 C 24 20.398438 20.398438 24 16 24 C 15.824219 24 15.640625 23.980469 15.46875 23.96875 L 17.90625 21.5 L 16.5 20.09375 L 12.28125 24.28125 L 11.59375 25 L 12.28125 25.71875 L 16.5 29.90625 L 17.90625 28.5 L 15.40625 25.96875 C 15.601563 25.980469 15.804688 26 16 26 C 21.5 26 26 21.5 26 16 C 26 14.5 25.695313 13.105469 25.09375 11.90625 Z "></path></svg>';
    });

    Array.prototype.forEach.call(document.getElementsByClassName('delete-button'), function(el) {
        el.innerHTML = '<svg viewBox="0 0 12 16" version="1.1" width="12" height="16"><path fill-rule="evenodd" d="M11 2H9c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1H2c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1v9c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V5c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 12H3V5h1v8h1V5h1v8h1V5h1v8h1V5h1v9zm1-10H2V3h9v1z"></path></svg>';
    });

    tabBar = new CurvyTabs(document.getElementById('editors'));
    tabBar.paint();

    getFiles(init);

    function init() {
        grid = new fin.Hypergrid();

        initLocalsButtons();

        var pagerOptions = {path: 'tutorial/', toc: []};

        // flatten the hierarchical tutTOC into pagerOptions.toc
        walk(tutTOC);
        function walk(list) {
            list.forEach(function (item) {
                if (Array.isArray(item)) {
                    walk(item);
                } else {
                    pagerOptions.toc.push(item);
                }
            });
        }

        // If there is a page number cookie value, use it!
        var match = document.cookie.match(/\bp=(\d+)/);
        if (match) {
            pagerOptions.startPage = match[1];
        }

        tutorial = new CurvyTabsPager(
            document.getElementById('page-panel'),
            new CurvyTabs(document.getElementById('tutorial')),
            pagerOptions
        );

        callApi('data'); // inits both 'data' and 'state' editors
        callApi('scrollbars');

        Object.keys(scripts).forEach(function(key) {
            initObjectEditor(key);
        });

        document.getElementById('reset-all').onclick = function() {
            if (confirm('Clear localStorage and reload?\n\nThis will reset all tabs to their default values, removing all edits, including new custom localizers and custom cell editors.')) {
                localStorage.clear();
                location.reload();
            }
        };

        grid.addEventListener('fin-after-cell-edit', function(e) {
            document.getElementById('data').value = stringifyAndUnquoteKeys(grid.behavior.getData());
        });

        var dragger, divider = document.querySelector('.divider');
        divider.addEventListener('mousedown', function(e) {
            dragger = {
                delta: e.clientY - divider.getBoundingClientRect().top,
                gridHeight: grid.div.getBoundingClientRect().height,
                tabHeight: tabBar.container.getBoundingClientRect().height
            };
            e.stopPropagation(); // no other element needs to handle
        });
        document.addEventListener('mousemove', function(e) {
            if (dragger) {
                var newDividerTop = e.clientY - dragger.delta,
                    oldDividerTop = divider.getBoundingClientRect().top,
                    topDelta = newDividerTop - oldDividerTop,
                    newGridHeight = dragger.gridHeight + topDelta,
                    newTabHeight = dragger.tabHeight - topDelta;

                if (newGridHeight >= 65 && newTabHeight >= 130) {
                    divider.style.borderTopStyle = divider.style.borderTopColor = null; // revert to :active style
                    divider.style.top = newDividerTop + 'px';
                    grid.div.style.height = (dragger.gridHeight = newGridHeight) + 'px';
                    tabBar.container.style.height = (dragger.tabHeight = newTabHeight) + 'px';
                } else {
                    // force :hover style when out of range even though dragging (i.e., :active)
                    divider.style.borderTopStyle = 'double';
                    divider.style.borderTopColor = '#444';
                }

                e.stopPropagation(); // no other element needs to handle
                e.preventDefault(); // no other drag effects, please
            }
        });
        document.addEventListener('mouseup', function(e) {
            dragger = undefined;
        });
    }

    function getFiles(finish) {
        var keys = Object.keys(defaults)
        var callbacks = keys.length;
        keys.forEach(function(key) {
            ajax(defaults[key], function(data) {
                defaults[key] = data;
                if (!--callbacks) {
                    finish();
                }
            });
        });
    }

    function ajax(url, callback) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.open('GET', url, true);
        httpRequest.onreadystatechange = function() {
            if (
                httpRequest.readyState === 4 && // HTTP_STATE_DONE
                httpRequest.status === 200 // HTTP_STATUS_OK
            ) {
                var data = httpRequest.responseText;
                if (/\.json$/i.test(url) && isJSON.test(data)) {
                    data = JSON.parse(data);
                }
                callback(data);
            }
        };
        httpRequest.send(null);
    }

    function callApi(methodName, type, confirmation) {
        // When `methodName` is `undefined` or omitted promote 2nd and 3rd params
        if (!methodName || !isCamelCase.test(methodName)) {
            confirmation = type;
            type = methodName;
            methodName = 'set' + capitalize(type);
        }

        var textEl = document.getElementById(type); // tab editor's textarea element
        var resetEl = document.getElementById('reset-' + type);

        textEl.oninput = function() {
            resetEl.firstElementChild.classList.toggle('disabled', textEl.value === stringifyAndUnquoteKeys(defaults[type]));
        };

        if (textEl.value) {
            localStorage.setItem(type, textEl.value);
        } else if (!(textEl.value = localStorage.getItem(type))) {
            textEl.value = stringifyAndUnquoteKeys(defaults[type]);
            localStorage.setItem(type, textEl.value);
        }

        // We're using eval here instead of JSON.parse because we want to allow unquoted keys.
        switch (type) {
            case 'data':
                grid.setData(eval(textEl.value), {schema: []});
                callApi('state'); // reapply state after resetting schema (also inits state editor on first time called)
                break;
            case 'state':
                // Note: L-value must be inside eval because R-value beginning with '{' is eval'd as BEGIN block.
                var Lvalue;
                grid[methodName](eval('Lvalue =' + textEl.value));
                break;
            case 'scrollbars':
                injectCSS('custom', textEl.value);
                break;
        }

        if (confirmation) {
            feedback(textEl.parentElement, confirmation);
        }

        textEl.oninput();
        resetEl.onclick = resetTextEditor;
    }

    function resetTextEditor() {
        var type = this.id.replace(/^reset-/, '');
        if (confirm('Reset the ' + capitalize(type) + ' tab editor to its default?\n\nCAUTION: This is not an undo. It restores the editor content to the app\'s original built-in default value!')) {
            document.getElementById(type).value = '';
            localStorage.removeItem(type);
            callApi(type);
        }
    }

    function resetObject() {
        var type = this.id.replace(/^reset-/, '');
        var name = document.getElementById(type + '-dropdown').value;
        if (!isDisabled(this) && confirm('Reset the "' + name + '" ' + type + ' to its default?')) {
            var script = getDefaultScript(type, name);
            if (name !== NEW) {
                localStorage.setItem(type + '_' + name, script);
            }
            document.getElementById(type + '-script').value = script;
            enableResetAndDeleteIcons(type, name);
        }
    }

    function deleteObject() {
        var type = this.id.replace(/^delete-/, '');
        var dropdown = document.getElementById(type + '-dropdown');
        var name = dropdown.value;
        if (!isDisabled(this) && confirm('Delete the "' + name + '" ' + type + '?')) {
            dropdown.options.remove(dropdown.selectedIndex);
            dropdown.selectedIndex = 0; // "(New)"
            dropdown.onchange();
            localStorage.removeItem(type + '_' + name);
        }
    }

    function isDisabled(el) {
        var svg = el.firstElementChild;
        return svg.classList.contains('disabled');
    }

    function capitalize(str) {
        return str[0].toUpperCase() + str.substr(1);
    }

    function initLocalsButton(type, locals) {
        var el = document.getElementById(type + '-dropdown').parentElement.querySelector('.locals');
        locals = locals.sort();
        el.title = locals.join('\n');
        el.onclick = function() {
            alert('Local variables: ' + locals.join(', '));
        };
    }

    function initLocalsButtons() {
        initLocalsButton('editor', ['module', 'exports', 'CellEditor'].concat(Object.keys(grid.cellEditors.items)));
        initLocalsButton('localizer', ['module', 'exports']);
    }

    function initObjectEditor(type) {
        var dropdownEl = document.getElementById(type + '-dropdown'),
            resetEl = document.getElementById('reset-' + type),
            deleteEl = document.getElementById('delete-' + type),
            scriptEl = document.getElementById(type + '-script'),
            addButtonEl = dropdownEl.parentElement.querySelector('.api'),
            prefix = type + '_',
            save = saveFuncs[type],
            newScript;

        // STEP 1: Save default scripts to local storage not previously saved
        scripts[type].map(extractName).sort().forEach(function(name) {
            var script = getDefaultScript(type, name);
            if (name === NEW) {
                dropdownEl.add(new Option(name));
                newScript = scriptEl.value = script;
            } else if (!localStorage.getItem(prefix + name)) {
                localStorage.setItem(prefix + name, script);
            }
        });

        // STEP 2: Load scripts from local storage, re-saving each which adds it to drop-down
        for (var i = 0; i < localStorage.length; ++i) {
            var key = localStorage.key(i);
            if (key.substr(0, prefix.length) === prefix) {
                save(localStorage.getItem(key), dropdownEl);
            }
        }

        // STEP 3: Reset drop-down to first item: "(New)"
        dropdownEl.selectedIndex = 0;
        enableResetAndDeleteIcons(type, NEW);

        // STEP 4: Assign handlers
        resetEl.onclick = resetObject;
        deleteEl.onclick = deleteObject;

        var name = NEW;
        dropdownEl.onchange = function() {
            var newName = this.value;
            var savedScript = localStorage.getItem(prefix + name) || getDefaultScript(type, name);
            var editedScript = document.getElementById(type + '-script').value;

            if (!savedScript || savedScript === editedScript || confirm('Discard unsaved changes?')) {
                name = newName;
                if (name === NEW) {
                    scriptEl.value = newScript;
                    enableResetAndDeleteIcons(type);
                } else {
                    scriptEl.value = localStorage.getItem(prefix + name);
                    enableResetAndDeleteIcons(type, name);
                }
            } else if (savedScript) {
                this.value = name;
            }
        };

        scriptEl.oninput = function() {
            enableResetAndDeleteIcons(type, dropdownEl.value);
        };

        addButtonEl.onclick = function() {
            save(scriptEl.value, dropdownEl);
            grid.repaint();
        };
    }

    function enableResetAndDeleteIcons(type, name) {
        var resetEl = document.getElementById('reset-' + type);
        var deleteEl = document.getElementById('delete-' + type);

        if (name) {
            var defaultScript = name && getDefaultScript(type, name);
            var editedScript = document.getElementById(type + '-script').value;
            var alteredFromDefault = defaultScript && defaultScript !== editedScript;

            resetEl.firstElementChild.classList.toggle('disabled', !alteredFromDefault);
            deleteEl.firstElementChild.classList.toggle('disabled', !name || defaultScript);
        }
    }

    function getDefaultScript(type, name) {
        return scripts[type].find(isScriptByName.bind(null, name));
    }

    function isScriptByName(name, script) {
        return extractName(script) === name;
    }

    function extractName(script) {
        var match = script.match(/\.extend\('([^']+)'|\.extend\("([^"]+)"|\bname:\s*'([^']+)'|\bname:\s*"([^"]+)"/);
        return match[1] || match[2] || match[3] || match[4];
    }

    function stringifyAndUnquoteKeys(obj) {
       return typeof obj === 'object'
            ? JSON.stringify(obj, undefined, 2)
                .replace(/(  +)"([a-zA-Z$_]+)"(: )/g, '$1$2$3') // un-quote keys
            : obj;
    }

    function saveCellEditor(script, select) {
        var cellEditors = grid.cellEditors;
        var editorNames = Object.keys(cellEditors.items);
        var editors = editorNames.map(function(name) {
            return cellEditors.items[name];
        });
        var exports = {}, module = { exports: exports };
        var formalArgs = [null, 'module', 'exports', 'CellEditor'] // null is for bind's thisArg
            .concat(editorNames) // additional params
            .concat(script); // function body
        var actualArgs = [module, exports, cellEditors.BaseClass]
            .concat(editors);

        try {
            var closure = new (Function.prototype.bind.apply(Function, formalArgs)); // calls Function constructor using .apply
            closure.apply(null, actualArgs);
            var Editor = module.exports;
            var name = Editor.prototype.$$CLASS_NAME;
            if (!(Editor.prototype instanceof cellEditors.BaseClass)) {
                throw 'Cannot save cell editor "' + name + '" because it is not a subclass of CellEditor (aka grid.cellEditors.BaseClass).';
            }
            if (!name || name === NEW) {
                throw 'Cannot save cell editor. A name other than "(New)" is required.';
            }
        } catch (err) {
            console.error(err);
            alert(err + '\n\nAvailable locals: ' + formalArgs.slice(1, formalArgs.length - 1).join(', ') +
                '\n\nNOTE: Cell editors that extend directly from CellEditor must define a `template` property.');
            return;
        }

        cellEditors.add(Editor);

        localStorage.setItem('editor_' + name, script);

        addOptionInAlphaOrder(select, name);

        enableResetAndDeleteIcons('editor', name);

        if (select) {
            feedback(select.parentElement);
        }

        initLocalsButtons();
    }

    function saveLocalizer(script, select) {
        var module = {};

        try {
            var closure = new Function('module', script);
            closure(module);
            var localizer = module.exports;
            var name = localizer.name;
            if (!name || name === NEW) {
                throw 'Cannot save localizer. A `name` property with a value other than "(New)" is required.';
            }
            grid.localization.add(localizer);
        } catch (err) {
            console.error(err);
            alert(err + '\n\nAvailable locals:\n\tmodule');
            return;
        }

        localStorage.setItem('localizer_' + name, script);

        addOptionInAlphaOrder(select, name);

        enableResetAndDeleteIcons('localizer', name);

        if (select) {
            feedback(select.parentElement);
        }
    }

    function addOptionInAlphaOrder(el, text, value) {
        if (!el) {
            return;
        }

        var optionEls = Array.prototype.slice.call(el.options);

        var index = optionEls.findIndex(function(optionEl) {
            return optionEl.textContent === text;
        });
        if (index >= 0) {
            el.selectedIndex = index;
            return; // already in dropdown
        }

        var firstOptionGreaterThan = optionEls.find(function(optionEl) {
            return optionEl.textContent > text;
        });

        el.value = name;
        if (el.selectedIndex === -1) {
            el.add(new Option(text, value), firstOptionGreaterThan);
            el.value = value || text;
        }
    }

    function feedback(content, confirmation) {
        var el = content.querySelector('span.feedback');
        if (!confirmation) {
            confirmation = 'Saved';
        }
        el.innerText = confirmation;
        el.style.display = 'inline';
        setTimeout(function() {
            el.style.display = 'none';
        }, 750 + 50 * confirmation.length);
    }

    function injectCSS(name, css) {
        var prefix = 'injected-stylesheet-finbar-';
        var id = prefix + name;
        var el = document.getElementById(id);

        if (!el) {
            el = document.createElement('style');
            el.setAttribute('id', id);
        }

        el.innerHTML = css;

        var baseEl = document.getElementById(prefix + 'base');
        baseEl.parentElement.insertBefore(el, baseEl.nextElementSibling);
    }

    window.callApi = callApi; // for access from index.html `onclick` handlers
};