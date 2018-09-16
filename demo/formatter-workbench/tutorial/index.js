'use strict';

window.addEventListener('load', function() {
    setScrollWarning();
    setTabLinks();
    setTitleAttribs();

    if (!window.top.tabBar) {
        return;
    }

    parent.dispatchEvent(new CustomEvent('curvy-tabs-pager-register', { detail: { window: window }}));

    function setScrollWarning() {
        var i = window.scrollY + window.innerHeight - document.body.scrollHeight;
        window.top.document.getElementById('scroll-warning').style.opacity = i < -100 ? 1 : i > 0 ? 0 : -i / 100;
    }

    function setTabLinks() {
        document.querySelectorAll('span.tab').forEach(function(el) {
            el.href = 'javascript:void(0)';
            el.onclick = goToTab;
            el.style.backgroundColor = findTab.call(el).content.style.backgroundColor;
            el.title = 'Shortcut: Click here to select the ' + el.innerText + ' tab.';
        });
    }

    function goToTab() {
        var tab = findTab.call(this);
        if (tab.content) {
            tab.bar.selected = tab.content;
        }
    }

    function findTab() {
        var result = {};
        [window.top.tabBar, window.top.tutorial.tabBar].find(function(tabBar) {
            return (result.content = (result.bar = tabBar).contents.querySelector('[name="' + this.innerText + '"]'));
        }, this);
        if (!result.bar) {
            throw new ReferenceError('No such tab "' + this.innerText + '" on either tab bar!');
        }
        return result;
    }

    function setTitleAttribs() {
        document.querySelectorAll('a[target=doc]').forEach(function (el) {
            el.title = 'Click to open the API documentation for "' + el.innerText + '" in another window.';
        });
        document.querySelectorAll('a[target=mdn]').forEach(function (el) {
            el.title = 'Click to open the Mozilla Developer Network page for "' + el.innerText + '" in another window.';
        });
    }
});