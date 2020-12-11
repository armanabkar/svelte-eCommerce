
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(changed, child_ctx);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    var bind = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    /*!
     * Determine if an object is a Buffer
     *
     * @author   Feross Aboukhadijeh <https://feross.org>
     * @license  MIT
     */

    var isBuffer = function isBuffer (obj) {
      return obj != null && obj.constructor != null &&
        typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
    };

    /*global toString:true*/

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return toString.call(val) === '[object Array]';
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return (typeof FormData !== 'undefined') && (val instanceof FormData);
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (typeof result[key] === 'object' && typeof val === 'object') {
          result[key] = merge(result[key], val);
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Function equal to merge with the difference being that no reference
     * to original objects is kept.
     *
     * @see merge
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function deepMerge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (typeof result[key] === 'object' && typeof val === 'object') {
          result[key] = deepMerge(result[key], val);
        } else if (typeof val === 'object') {
          result[key] = deepMerge({}, val);
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    var utils = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      deepMerge: deepMerge,
      extend: extend,
      trim: trim
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%40/gi, '@').
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code
        };
      };
      return error;
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;

        if (utils.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = config.auth.password || '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        // Listen for ready state
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }

          // The request errored out and we didn't get a response, this will be
          // handled by onerror instead
          // With one exception: request that using file: protocol, most browsers
          // will return status as 0 even though it's a successful request
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
            return;
          }

          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(resolve, reject, response);

          // Clean up request
          request = null;
        };

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          var cookies$1 = cookies;

          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
            cookies$1.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (config.withCredentials) {
          request.withCredentials = true;
        }

        // Add responseType to request if needed
        if (config.responseType) {
          try {
            request.responseType = config.responseType;
          } catch (e) {
            // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
            // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
            if (config.responseType !== 'json') {
              throw e;
            }
          }
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken) {
          // Handle cancellation
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (!request) {
              return;
            }

            request.abort();
            reject(cancel);
            // Clean up request
            request = null;
          });
        }

        if (requestData === undefined) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      // Only Node.JS has a process variable that is of [[Class]] process
      if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      } else if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      }
      return adapter;
    }

    var defaults = {
      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');
        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils.isObject(data)) {
          setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
          return JSON.stringify(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        /*eslint no-param-reassign:0*/
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) { /* Ignore */ }
        }
        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      }
    };

    defaults.headers = {
      common: {
        'Accept': 'application/json, text/plain, */*'
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Support baseURL config
      if (config.baseURL && !isAbsoluteURL(config.url)) {
        config.url = combineURLs(config.baseURL, config.url);
      }

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers || {}
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData(
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData(
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      utils.forEach(['url', 'method', 'params', 'data'], function valueFromConfig2(prop) {
        if (typeof config2[prop] !== 'undefined') {
          config[prop] = config2[prop];
        }
      });

      utils.forEach(['headers', 'auth', 'proxy'], function mergeDeepProperties(prop) {
        if (utils.isObject(config2[prop])) {
          config[prop] = utils.deepMerge(config1[prop], config2[prop]);
        } else if (typeof config2[prop] !== 'undefined') {
          config[prop] = config2[prop];
        } else if (utils.isObject(config1[prop])) {
          config[prop] = utils.deepMerge(config1[prop]);
        } else if (typeof config1[prop] !== 'undefined') {
          config[prop] = config1[prop];
        }
      });

      utils.forEach([
        'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
        'timeout', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
        'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'maxContentLength',
        'validateStatus', 'maxRedirects', 'httpAgent', 'httpsAgent', 'cancelToken',
        'socketPath'
      ], function defaultToConfig2(prop) {
        if (typeof config2[prop] !== 'undefined') {
          config[prop] = config2[prop];
        } else if (typeof config1[prop] !== 'undefined') {
          config[prop] = config1[prop];
        }
      });

      return config;
    };

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof config === 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }

      config = mergeConfig(this.defaults, config);
      config.method = config.method ? config.method.toLowerCase() : 'get';

      // Hook up interceptors middleware
      var chain = [dispatchRequest, undefined];
      var promise = Promise.resolve(config);

      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });

      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(utils.merge(config || {}, {
          method: method,
          url: url
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, data, config) {
        return this.request(utils.merge(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios;

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      return instance;
    }

    // Create the default instance to be exported
    var axios = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios.Axios = Axios_1;

    // Factory for creating new instances
    axios.create = function create(instanceConfig) {
      return createInstance(mergeConfig(axios.defaults, instanceConfig));
    };

    // Expose Cancel & CancelToken
    axios.Cancel = Cancel_1;
    axios.CancelToken = CancelToken_1;
    axios.isCancel = isCancel;

    // Expose all/spread
    axios.all = function all(promises) {
      return Promise.all(promises);
    };
    axios.spread = spread;

    var axios_1 = axios;

    // Allow use of default import syntax in TypeScript
    var default_1 = axios;
    axios_1.default = default_1;

    var axios$1 = axios_1;

    var url = "https://svelte-store-server.herokuapp.com";

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const userStore = writable(getStorageUser());

    function getStorageUser() {
      return localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user"))
        : { username: null, jwt: null };
    }

    function setStorageUser(user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    function setUser(user) {
      userStore.set(user);
    }

    function logoutUser() {
      localStorage.clear();
      userStore.set({ user: null, jwt: null });
    }

    function setupUser(response) {
      const { jwt } = response.data;
      const { username } = response.data.user;
      const user = { username, jwt };
      setStorageUser(user);
      setUser(user);
    }

    async function loginUser({ email, password }) {
      const response = await axios$1
        .post(`${url}/auth/local`, {
          identifier: email,
          password
        })
        .catch(error => console.log(error));

      if (response) {
        setupUser(response);
      }

      return response;
    }

    async function registerUser({ email, password, username }) {
      const response = await axios$1
        .post(`${url}/auth/local/register`, {
          username,
          email,
          password
        })
        .catch(error => console.log(error));
      if (response) {
        setupUser(response);
      }

      return response;
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.12.1 */

    function create_fragment(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base, $location, $routes;

    	

      let { basepath = "/", url = null } = $$props;

      const locationContext = getContext(LOCATION);
      const routerContext = getContext(ROUTER);

      const routes = writable([]); validate_store(routes, 'routes'); component_subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });
      const activeRoute = writable(null);
      let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

      // If locationContext is not set, this is the topmost Router in the tree.
      // If the `url` prop is given we force the location to it.
      const location =
        locationContext ||
        writable(url ? { pathname: url } : globalHistory.location); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      // If routerContext is set, the routerBase of the parent Router
      // will be the base for this Router's descendants.
      // If routerContext is not set, the path and resolved uri will both
      // have the value of the basepath prop.
      const base = routerContext
        ? routerContext.routerBase
        : writable({
            path: basepath,
            uri: basepath
          }); validate_store(base, 'base'); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });

      const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
        // If there is no activeRoute, the routerBase will be identical to the base.
        if (activeRoute === null) {
          return base;
        }

        const { path: basepath } = base;
        const { route, uri } = activeRoute;
        // Remove the potential /* or /*splatname from
        // the end of the child Routes relative paths.
        const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

        return { path, uri };
      });

      function registerRoute(route) {
        const { path: basepath } = $base;
        let { path } = route;

        // We store the original path in the _path property so we can reuse
        // it when the basepath changes. The only thing that matters is that
        // the route reference is intact, so mutation is fine.
        route._path = path;
        route.path = combinePaths(basepath, path);

        if (typeof window === "undefined") {
          // In SSR we should set the activeRoute immediately if it is a match.
          // If there are more Routes being registered after a match is found,
          // we just skip them.
          if (hasActiveRoute) {
            return;
          }

          const matchingRoute = match(route, $location.pathname);
          if (matchingRoute) {
            activeRoute.set(matchingRoute);
            hasActiveRoute = true;
          }
        } else {
          routes.update(rs => {
            rs.push(route);
            return rs;
          });
        }
      }

      function unregisterRoute(route) {
        routes.update(rs => {
          const index = rs.indexOf(route);
          rs.splice(index, 1);
          return rs;
        });
      }

      if (!locationContext) {
        // The topmost Router in the tree is responsible for updating
        // the location store and supplying it through context.
        onMount(() => {
          const unlisten = globalHistory.listen(history => {
            location.set(history.location);
          });

          return unlisten;
        });

        setContext(LOCATION, location);
      }

      setContext(ROUTER, {
        activeRoute,
        base,
        routerBase,
        registerRoute,
        unregisterRoute
      });

    	const writable_props = ['basepath', 'url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { basepath, url, hasActiveRoute, $base, $location, $routes };
    	};

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    		if ('$base' in $$props) base.set($base);
    		if ('$location' in $$props) location.set($location);
    		if ('$routes' in $$props) routes.set($routes);
    	};

    	$$self.$$.update = ($$dirty = { $base: 1, $routes: 1, $location: 1 }) => {
    		if ($$dirty.$base) { {
            const { path: basepath } = $base;
            routes.update(rs => {
              rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
              return rs;
            });
          } }
    		if ($$dirty.$routes || $$dirty.$location) { {
            const bestMatch = pick($routes, $location.pathname);
            activeRoute.set(bestMatch);
          } }
    	};

    	return {
    		basepath,
    		url,
    		routes,
    		location,
    		base,
    		$$slots,
    		$$scope
    	};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["basepath", "url"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Router", options, id: create_fragment.name });
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.12.1 */

    const get_default_slot_changes = ({ routeParams, $location }) => ({ params: routeParams, location: $location });
    const get_default_slot_context = ({ routeParams, $location }) => ({
    	params: routeParams,
    	location: $location
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.component !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}", ctx });
    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && (changed.$$scope || changed.routeParams || changed.$location)) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, get_default_slot_changes),
    					get_slot_context(default_slot_template, ctx, get_default_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(43:2) {:else}", ctx });
    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	var switch_instance_anchor, current;

    	var switch_instance_spread_levels = [
    		{ location: ctx.$location },
    		ctx.routeParams,
    		ctx.routeProps
    	];

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		let switch_instance_props = {};
    		for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}
    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = (changed.$location || changed.routeParams || changed.routeProps) ? get_spread_update(switch_instance_spread_levels, [
    									(changed.$location) && { location: ctx.$location },
    			(changed.routeParams) && get_spread_object(ctx.routeParams),
    			(changed.routeProps) && get_spread_object(ctx.routeProps)
    								]) : {};

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(41:2) {#if component !== null}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute, $location;

    	

      let { path = "", component = null } = $$props;

      const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER); validate_store(activeRoute, 'activeRoute'); component_subscribe($$self, activeRoute, $$value => { $activeRoute = $$value; $$invalidate('$activeRoute', $activeRoute); });
      const location = getContext(LOCATION); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      const route = {
        path,
        // If no path prop is given, this Route will act as the default Route
        // that is rendered if no other Route in the Router is a match.
        default: path === ""
      };
      let routeParams = {};
      let routeProps = {};

      registerRoute(route);

      // There is no need to unregister Routes in SSR since it will all be
      // thrown away anyway.
      if (typeof window !== "undefined") {
        onDestroy(() => {
          unregisterRoute(route);
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$new_props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate('component', component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { path, component, routeParams, routeProps, $activeRoute, $location };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$props) $$invalidate('component', component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate('routeParams', routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate('routeProps', routeProps = $$new_props.routeProps);
    		if ('$activeRoute' in $$props) activeRoute.set($activeRoute);
    		if ('$location' in $$props) location.set($location);
    	};

    	$$self.$$.update = ($$dirty = { $activeRoute: 1, $$props: 1 }) => {
    		if ($$dirty.$activeRoute) { if ($activeRoute && $activeRoute.route === route) {
            $$invalidate('routeParams', routeParams = $activeRoute.params);
          } }
    		{
            const { path, component, ...rest } = $$props;
            $$invalidate('routeProps', routeProps = rest);
          }
    	};

    	return {
    		path,
    		component,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["path", "component"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Route", options, id: create_fragment$1.name });
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * A link action that can be added to <a href=""> tags rather
     * than using the <Link> component.
     *
     * Example:
     * ```html
     * <a href="/post/{postId}" use:link>{post.title}</a>
     * ```
     */
    function link(node) {
      function onClick(event) {
        const anchor = event.currentTarget;

        if (
          anchor.target === "" &&
          anchor.host === location.host &&
          shouldNavigate(event)
        ) {
          event.preventDefault();
          navigate(anchor.pathname, { replace: anchor.hasAttribute("replace") });
        }
      }

      node.addEventListener("click", onClick);

      return {
        destroy() {
          node.removeEventListener("click", onClick);
        }
      };
    }

    const globalStore = writable({
      sidebar: false,
      cart: false,
      alert: false,
      alertText: "default alert",
      alertDanger: false
    });

    const store = {
      subscribe: globalStore.subscribe,
      toggleItem: (item, value, alertText = "default", alertDanger = false) => {
        if (item === "alert") {
          globalStore.update(storeValues => {
            return { ...storeValues, [item]: value, alertText, alertDanger };
          });
        } else {
          globalStore.update(storeValues => {
            return { ...storeValues, [item]: value };
          });
        }
      }
    };

    /* src/pages/Login.svelte generated by Svelte v3.12.1 */

    const file = "src/pages/Login.svelte";

    // (54:25) {:else}
    function create_else_block_1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("register");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1.name, type: "else", source: "(54:25) {:else}", ctx });
    	return block;
    }

    // (54:4) {#if isMember}
    function create_if_block_3(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("sign in");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3.name, type: "if", source: "(54:4) {#if isMember}", ctx });
    	return block;
    }

    // (69:4) {#if !isMember}
    function create_if_block_2(ctx) {
    	var div, label, t_1, input, dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			label.textContent = "username";
    			t_1 = space();
    			input = element("input");
    			attr_dev(label, "for", "username");
    			add_location(label, file, 71, 8, 1909);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "username");
    			add_location(input, file, 72, 8, 1956);
    			attr_dev(div, "class", "form-control");
    			add_location(div, file, 70, 6, 1874);
    			dispose = listen_dev(input, "input", ctx.input_input_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);
    			append_dev(div, t_1);
    			append_dev(div, input);

    			set_input_value(input, ctx.username);
    		},

    		p: function update(changed, ctx) {
    			if (changed.username && (input.value !== ctx.username)) set_input_value(input, ctx.username);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(69:4) {#if !isMember}", ctx });
    	return block;
    }

    // (77:4) {#if isEmpty}
    function create_if_block_1$1(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "please fill out all form fields";
    			attr_dev(p, "class", "form-empty");
    			add_location(p, file, 77, 6, 2096);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(77:4) {#if isEmpty}", ctx });
    	return block;
    }

    // (92:4) {:else}
    function create_else_block$1(ctx) {
    	var p, t, button, dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text("already a member?\n        ");
    			button = element("button");
    			button.textContent = "click here";
    			attr_dev(button, "type", "button");
    			add_location(button, file, 94, 8, 2560);
    			attr_dev(p, "class", "register-link");
    			add_location(p, file, 92, 6, 2500);
    			dispose = listen_dev(button, "click", ctx.toggleMember);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    			append_dev(p, button);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$1.name, type: "else", source: "(92:4) {:else}", ctx });
    	return block;
    }

    // (87:4) {#if isMember}
    function create_if_block$1(ctx) {
    	var p, t, button, dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text("need to register?\n        ");
    			button = element("button");
    			button.textContent = "click here";
    			attr_dev(button, "type", "button");
    			add_location(button, file, 89, 8, 2405);
    			attr_dev(p, "class", "register-link");
    			add_location(p, file, 87, 6, 2345);
    			dispose = listen_dev(button, "click", ctx.toggleMember);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    			append_dev(p, button);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(87:4) {#if isMember}", ctx });
    	return block;
    }

    function create_fragment$2(ctx) {
    	var section, h2, t0, form, div0, label0, t2, input0, t3, div1, label1, t5, input1, t6, t7, t8, button, t9, t10, dispose;

    	function select_block_type(changed, ctx) {
    		if (ctx.isMember) return create_if_block_3;
    		return create_else_block_1;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block0 = current_block_type(ctx);

    	var if_block1 = (!ctx.isMember) && create_if_block_2(ctx);

    	var if_block2 = (ctx.isEmpty) && create_if_block_1$1(ctx);

    	function select_block_type_1(changed, ctx) {
    		if (ctx.isMember) return create_if_block$1;
    		return create_else_block$1;
    	}

    	var current_block_type_1 = select_block_type_1(null, ctx);
    	var if_block3 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			h2 = element("h2");
    			if_block0.c();
    			t0 = space();
    			form = element("form");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "email";
    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "password";
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			if (if_block2) if_block2.c();
    			t8 = space();
    			button = element("button");
    			t9 = text("submit");
    			t10 = space();
    			if_block3.c();
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file, 52, 2, 1258);
    			attr_dev(label0, "for", "email");
    			add_location(label0, file, 58, 6, 1470);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "id", "email");
    			add_location(input0, file, 59, 6, 1509);
    			attr_dev(div0, "class", "form-control");
    			add_location(div0, file, 57, 4, 1437);
    			attr_dev(label1, "for", "password");
    			add_location(label1, file, 64, 6, 1669);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "id", "password");
    			add_location(input1, file, 65, 6, 1714);
    			attr_dev(div1, "class", "form-control");
    			add_location(div1, file, 63, 4, 1636);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-block btn-primary");
    			button.disabled = ctx.isEmpty;
    			toggle_class(button, "disabled", ctx.isEmpty);
    			add_location(button, file, 79, 4, 2168);
    			attr_dev(form, "class", "login-form");
    			add_location(form, file, 55, 2, 1341);
    			attr_dev(section, "class", "form");
    			add_location(section, file, 51, 0, 1233);

    			dispose = [
    				listen_dev(input0, "input", ctx.input0_input_handler),
    				listen_dev(input1, "input", ctx.input1_input_handler),
    				listen_dev(form, "submit", prevent_default(ctx.handleSubmit), false, true)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h2);
    			if_block0.m(h2, null);
    			append_dev(section, t0);
    			append_dev(section, form);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t2);
    			append_dev(div0, input0);

    			set_input_value(input0, ctx.email);

    			append_dev(form, t3);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t5);
    			append_dev(div1, input1);

    			set_input_value(input1, ctx.password);

    			append_dev(form, t6);
    			if (if_block1) if_block1.m(form, null);
    			append_dev(form, t7);
    			if (if_block2) if_block2.m(form, null);
    			append_dev(form, t8);
    			append_dev(form, button);
    			append_dev(button, t9);
    			append_dev(form, t10);
    			if_block3.m(form, null);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(h2, null);
    				}
    			}

    			if (changed.email && (input0.value !== ctx.email)) set_input_value(input0, ctx.email);
    			if (changed.password && (input1.value !== ctx.password)) set_input_value(input1, ctx.password);

    			if (!ctx.isMember) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(form, t7);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (ctx.isEmpty) {
    				if (!if_block2) {
    					if_block2 = create_if_block_1$1(ctx);
    					if_block2.c();
    					if_block2.m(form, t8);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (changed.isEmpty) {
    				prop_dev(button, "disabled", ctx.isEmpty);
    				toggle_class(button, "disabled", ctx.isEmpty);
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_1(changed, ctx))) {
    				if_block3.d(1);
    				if_block3 = current_block_type_1(ctx);
    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(form, null);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if_block3.d();
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $globalStore;

    	validate_store(store, 'globalStore');
    	component_subscribe($$self, store, $$value => { $globalStore = $$value; $$invalidate('$globalStore', $globalStore); });

    	
      let email = "";
      let password = "";
      let username = "default username";
      let isMember = true;
      // toggle member
      function toggleMember() {
        $$invalidate('isMember', isMember = !isMember);
        if (!isMember) {
          $$invalidate('username', username = "");
        } else {
          $$invalidate('username', username = "default username");
        }
      }
      // handle submit
      async function handleSubmit() {
        // add alert
        store.toggleItem("alert", true, "loading data... please wait!");
        let user;
        if (isMember) {
          user = await loginUser({ email, password });
        } else {
          user = await registerUser({ email, password, username });
        }

        if (user) {
          navigate("/products");
          store.toggleItem(
            "alert",
            true,
            "welcome to shopping madness my friend!"
          );
          // add alert
          return;
        }
        // add alert
        store.toggleItem(
          "alert",
          true,
          "there was an error! please try again",
          true
        );
      }

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate('email', email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate('password', password);
    	}

    	function input_input_handler() {
    		username = this.value;
    		$$invalidate('username', username);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate('email', email = $$props.email);
    		if ('password' in $$props) $$invalidate('password', password = $$props.password);
    		if ('username' in $$props) $$invalidate('username', username = $$props.username);
    		if ('isMember' in $$props) $$invalidate('isMember', isMember = $$props.isMember);
    		if ('isEmpty' in $$props) $$invalidate('isEmpty', isEmpty = $$props.isEmpty);
    		if ('$globalStore' in $$props) store.set($globalStore);
    	};

    	let isEmpty;

    	$$self.$$.update = ($$dirty = { email: 1, password: 1, username: 1, $globalStore: 1 }) => {
    		if ($$dirty.email || $$dirty.password || $$dirty.username || $$dirty.$globalStore) { $$invalidate('isEmpty', isEmpty = !email || !password || !username || $globalStore.alert); }
    	};

    	return {
    		email,
    		password,
    		username,
    		isMember,
    		toggleMember,
    		handleSubmit,
    		isEmpty,
    		input0_input_handler,
    		input1_input_handler,
    		input_input_handler
    	};
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Login", options, id: create_fragment$2.name });
    	}
    }

    // import localCart from "../localCart";
    // cart
    // localStorage
    function getStorageCart() {
      return localStorage.getItem("cart")
        ? JSON.parse(localStorage.getItem("cart"))
        : [];
    }
    function setStorageCart(cartValues) {
      localStorage.setItem("cart", JSON.stringify(cartValues));
    }
    const cart = writable(getStorageCart());
    // cart total
    const cartTotal = derived(cart, $cart => {
      let total = $cart.reduce((acc, curr) => {
        return (acc += curr.amount * curr.price);
      }, 0);
      return parseFloat(total.toFixed(2));
    });
    // local functions
    const remove = (id, items) => {
      return items.filter(item => item.id !== id);
    };
    const toggleAmount = (id, items, action) => {
      return items.map(item => {
        let newAmount;
        if (action === "inc") {
          newAmount = item.amount + 1;
        } else if (action === "dec") {
          newAmount = item.amount - 1;
        } else {
          newAmount = item.amount;
        }
        return item.id === id ? { ...item, amount: newAmount } : { ...item };
      });
    };
    // global functions
    const removeItem = id => {
      cart.update(storeValue => {
        return remove(id, storeValue);
      });
    };
    const increaseAmount = id => {
      cart.update(storeValue => {
        return toggleAmount(id, storeValue, "inc");
      });
    };
    const decreaseAmount = (id, amount) => {
      cart.update(storeValue => {
        // let item = storeValue.find(item => item.id === id);
        let cart;
        if (amount === 1) {
          cart = remove(id, storeValue);
        } else {
          cart = toggleAmount(id, storeValue, "dec");
        }
        return [...cart];
      });
    };
    const addToCart = product => {
      cart.update(storeValue => {
        const { id, image, title, price } = product;
        let item = storeValue.find(item => item.id === id);
        let cart;
        if (item) {
          cart = toggleAmount(id, storeValue, "inc");
        } else {
          let newItem = { id, image, title, price, amount: 1 };
          cart = [...storeValue, newItem];
        }
        return cart;
      });
    };

    async function submitOrder({ name, total, items, stripeTokenId, userToken }) {
      const response = await axios$1
        .post(
          `${url}/orders`,
          {
            name,
            total,
            items,
            stripeTokenId
          },
          {
            headers: {
              Authorization: `Bearer ${userToken}`
            }
          }
        )
        .catch(error => console.log(error));

      return response;
    }

    /* src/pages/Checkout.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/pages/Checkout.svelte";

    // (123:0) {:else}
    function create_else_block$2(ctx) {
    	var div, h2, t_1, a, link_action;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "your cart is empty";
    			t_1 = space();
    			a = element("a");
    			a.textContent = "fill it";
    			add_location(h2, file$1, 124, 4, 3408);
    			attr_dev(a, "href", "/products");
    			attr_dev(a, "class", "btn btn-primary");
    			add_location(a, file$1, 125, 4, 3440);
    			attr_dev(div, "class", "checkout-empty");
    			add_location(div, file$1, 123, 2, 3375);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t_1);
    			append_dev(div, a);
    			link_action = link.call(null, a) || {};
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$2.name, type: "else", source: "(123:0) {:else}", ctx });
    	return block;
    }

    // (78:0) {#if $cartTotal > 0}
    function create_if_block$2(ctx) {
    	var section, h2, t1, form, h3, t2, t3, t4, div0, label0, t6, input, t7, div3, label1, t9, p, t10, span, t12, br0, t13, br1, t14, t15, div1, t16, div2, t17, t18, button, t19, dispose;

    	var if_block = (ctx.isEmpty) && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			h2 = element("h2");
    			h2.textContent = "checkout";
    			t1 = space();
    			form = element("form");
    			h3 = element("h3");
    			t2 = text("order total : $");
    			t3 = text(ctx.$cartTotal);
    			t4 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "your name";
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Credit or Debit Card";
    			t9 = space();
    			p = element("p");
    			t10 = text("Test using this credit card:\n          ");
    			span = element("span");
    			span.textContent = "4242 4242 4242 4242";
    			t12 = space();
    			br0 = element("br");
    			t13 = text("\n          enter any 5 digits for the zip code\n          ");
    			br1 = element("br");
    			t14 = text("\n          enter any 3 digits for the CVC");
    			t15 = space();
    			div1 = element("div");
    			t16 = space();
    			div2 = element("div");
    			t17 = space();
    			if (if_block) if_block.c();
    			t18 = space();
    			button = element("button");
    			t19 = text("submit");
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$1, 79, 4, 2042);
    			add_location(h3, file$1, 81, 6, 2161);
    			attr_dev(label0, "for", "name");
    			add_location(label0, file$1, 84, 8, 2267);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "name");
    			add_location(input, file$1, 85, 8, 2311);
    			attr_dev(div0, "class", "form-control");
    			add_location(div0, file$1, 83, 6, 2232);
    			attr_dev(label1, "for", "card-element");
    			add_location(label1, file$1, 91, 8, 2500);
    			add_location(span, file$1, 94, 10, 2636);
    			add_location(br0, file$1, 95, 10, 2679);
    			add_location(br1, file$1, 97, 10, 2742);
    			attr_dev(p, "class", "stripe-info");
    			add_location(p, file$1, 92, 8, 2563);
    			attr_dev(div1, "id", "card-element");
    			add_location(div1, file$1, 100, 8, 2811);
    			attr_dev(div2, "id", "card-errors");
    			attr_dev(div2, "role", "alert");
    			add_location(div2, file$1, 103, 8, 2908);
    			attr_dev(div3, "class", "stripe-input");
    			add_location(div3, file$1, 89, 6, 2443);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-block btn-primary");
    			button.disabled = ctx.isEmpty;
    			toggle_class(button, "disabled", ctx.isEmpty);
    			add_location(button, file$1, 113, 6, 3176);
    			attr_dev(form, "class", "checkout-form");
    			add_location(form, file$1, 80, 4, 2086);
    			attr_dev(section, "class", "form");
    			add_location(section, file$1, 78, 2, 2015);

    			dispose = [
    				listen_dev(input, "input", ctx.input_input_handler),
    				listen_dev(form, "submit", prevent_default(ctx.handleSubmit), false, true)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h2);
    			append_dev(section, t1);
    			append_dev(section, form);
    			append_dev(form, h3);
    			append_dev(h3, t2);
    			append_dev(h3, t3);
    			append_dev(form, t4);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t6);
    			append_dev(div0, input);

    			set_input_value(input, ctx.name);

    			append_dev(form, t7);
    			append_dev(form, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t9);
    			append_dev(div3, p);
    			append_dev(p, t10);
    			append_dev(p, span);
    			append_dev(p, t12);
    			append_dev(p, br0);
    			append_dev(p, t13);
    			append_dev(p, br1);
    			append_dev(p, t14);
    			append_dev(div3, t15);
    			append_dev(div3, div1);
    			ctx.div1_binding(div1);
    			append_dev(div3, t16);
    			append_dev(div3, div2);
    			ctx.div2_binding(div2);
    			append_dev(form, t17);
    			if (if_block) if_block.m(form, null);
    			append_dev(form, t18);
    			append_dev(form, button);
    			append_dev(button, t19);
    		},

    		p: function update(changed, ctx) {
    			if (changed.$cartTotal) {
    				set_data_dev(t3, ctx.$cartTotal);
    			}

    			if (changed.name && (input.value !== ctx.name)) set_input_value(input, ctx.name);

    			if (ctx.isEmpty) {
    				if (!if_block) {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(form, t18);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (changed.isEmpty) {
    				prop_dev(button, "disabled", ctx.isEmpty);
    				toggle_class(button, "disabled", ctx.isEmpty);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			ctx.div1_binding(null);
    			ctx.div2_binding(null);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(78:0) {#if $cartTotal > 0}", ctx });
    	return block;
    }

    // (110:6) {#if isEmpty}
    function create_if_block_1$2(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "please fill out name field";
    			attr_dev(p, "class", "form-empty");
    			add_location(p, file$1, 110, 8, 3076);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$2.name, type: "if", source: "(110:6) {#if isEmpty}", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var if_block_anchor;

    	function select_block_type(changed, ctx) {
    		if (ctx.$cartTotal > 0) return create_if_block$2;
    		return create_else_block$2;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $globalStore, $user, $cartTotal, $cart;

    	validate_store(store, 'globalStore');
    	component_subscribe($$self, store, $$value => { $globalStore = $$value; $$invalidate('$globalStore', $globalStore); });
    	validate_store(userStore, 'user');
    	component_subscribe($$self, userStore, $$value => { $user = $$value; $$invalidate('$user', $user); });
    	validate_store(cartTotal, 'cartTotal');
    	component_subscribe($$self, cartTotal, $$value => { $cartTotal = $$value; $$invalidate('$cartTotal', $cartTotal); });
    	validate_store(cart, 'cart');
    	component_subscribe($$self, cart, $$value => { $cart = $$value; $$invalidate('$cart', $cart); });

    	

      let name = "";
      // stripe vars
      let cardElement;
      let cardErrors;
      let card;
      let stripe;
      let elements;
      onMount(() => {
        if (!$user.jwt) {
          navigate("/");
          return;
        }
        if ($cartTotal > 0) {
          stripe = Stripe("pk_test_u98wkoUC9x1zM28B8icCPH1y008TT9DFrS");
          elements = stripe.elements();
          card = elements.create("card");
          card.mount(cardElement);
          card.addEventListener("change", function(event) {
            if (event.error) {
              $$invalidate('cardErrors', cardErrors.textContent = event.error.message, cardErrors);
            } else {
              $$invalidate('cardErrors', cardErrors.textContent = "", cardErrors);
            }
          });
        }
      });
      async function handleSubmit() {
        store.toggleItem("alert", true, "submitting order... please wait!");
        let response = await stripe
          .createToken(card)
          .catch(error => console.log(error));
        const { token } = response;
        if (token) {
          const { id } = token;
          // token.id
          // submit the order
          console.log(typeof $cartTotal);

          let order = await submitOrder({
            name,
            total: $cartTotal,
            items: $cart,
            stripeTokenId: id,
            userToken: $user.jwt
          });
          console.log(order);

          if (order) {
            store.toggleItem("alert", true, "your order is complete!");
            cart.set([]);
            localStorage.setItem("cart", JSON.stringify([]));
            navigate("/");
            return;
          } else {
            store.toggleItem(
              "alert",
              true,
              "there was an error with your order. please try again!",
              true
            );
          }
        } else {
          console.log(response);
        }
      }

    	function input_input_handler() {
    		name = this.value;
    		$$invalidate('name', name);
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('cardElement', cardElement = $$value);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('cardErrors', cardErrors = $$value);
    		});
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('cardElement' in $$props) $$invalidate('cardElement', cardElement = $$props.cardElement);
    		if ('cardErrors' in $$props) $$invalidate('cardErrors', cardErrors = $$props.cardErrors);
    		if ('card' in $$props) card = $$props.card;
    		if ('stripe' in $$props) stripe = $$props.stripe;
    		if ('elements' in $$props) elements = $$props.elements;
    		if ('isEmpty' in $$props) $$invalidate('isEmpty', isEmpty = $$props.isEmpty);
    		if ('$globalStore' in $$props) store.set($globalStore);
    		if ('$user' in $$props) userStore.set($user);
    		if ('$cartTotal' in $$props) cartTotal.set($cartTotal);
    		if ('$cart' in $$props) cart.set($cart);
    	};

    	let isEmpty;

    	$$self.$$.update = ($$dirty = { name: 1, $globalStore: 1 }) => {
    		if ($$dirty.name || $$dirty.$globalStore) { $$invalidate('isEmpty', isEmpty = !name || $globalStore.alert); }
    	};

    	return {
    		name,
    		cardElement,
    		cardErrors,
    		handleSubmit,
    		isEmpty,
    		$cartTotal,
    		input_input_handler,
    		div1_binding,
    		div2_binding
    	};
    }

    class Checkout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Checkout", options, id: create_fragment$3.name });
    	}
    }

    var getProducts = async () => {
      const response = await fetch(`${url}/products`).catch(error =>
        console.error(error)
      );
      const products = await response.json();
      if (products.error) {
        return null;
      }
      return products;
    };

    const store$1 = writable([], () => {
      setProducts();
      return () => {};
    });

    async function setProducts() {
      let products = await getProducts();
      if (products) {
        products = flattenProducts(products);
        store$1.set(products);
      }
    }

    // subscribe
    // set
    // update

    // flatten products
    function flattenProducts(data) {
      return data.map(item => {
        let image = item.image.url;
        // let image = `${url}${item.image.url}`;
        return { ...item, image };
      });
    }
    // featured store
    const featuredStore = derived(store$1, $featured => {
      return $featured.filter(item => item.featured === true);
    });

    /* src/components/Loading.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/components/Loading.svelte";

    function create_fragment$4(ctx) {
    	var div, h10, t1, h11, t3, img;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h10 = element("h1");
    			h10.textContent = "please be patient";
    			t1 = space();
    			h11 = element("h1");
    			h11.textContent = "loading data from server";
    			t3 = space();
    			img = element("img");
    			add_location(h10, file$2, 7, 2, 104);
    			add_location(h11, file$2, 8, 2, 133);
    			attr_dev(img, "src", "/assets/images/loading.gif");
    			attr_dev(img, "alt", "loading gif");
    			add_location(img, file$2, 9, 2, 169);
    			attr_dev(div, "class", "loading indicator svelte-14hptcb");
    			add_location(div, file$2, 6, 0, 70);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h10);
    			append_dev(div, t1);
    			append_dev(div, h11);
    			append_dev(div, t3);
    			append_dev(div, img);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    class Loading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Loading", options, id: create_fragment$4.name });
    	}
    }

    /* src/pages/ProductTemplate.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/pages/ProductTemplate.svelte";

    // (18:0) {:else}
    function create_else_block$3(ctx) {
    	var section, a, link_action, t1, div, article0, img, img_src_value, img_alt_value, t2, article1, h1, t3_value = ctx.product.title + "", t3, t4, h2, t5, t6_value = ctx.product.price + "", t6, t7, p, t8_value = ctx.product.description + "", t8, t9, button, dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			a = element("a");
    			a.textContent = "back to products";
    			t1 = space();
    			div = element("div");
    			article0 = element("article");
    			img = element("img");
    			t2 = space();
    			article1 = element("article");
    			h1 = element("h1");
    			t3 = text(t3_value);
    			t4 = space();
    			h2 = element("h2");
    			t5 = text("$");
    			t6 = text(t6_value);
    			t7 = space();
    			p = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			button = element("button");
    			button.textContent = "add to cart";
    			attr_dev(a, "href", "/products");
    			attr_dev(a, "class", "btn btn-primary");
    			add_location(a, file$3, 20, 4, 561);
    			attr_dev(img, "src", img_src_value = ctx.product.image);
    			attr_dev(img, "alt", img_alt_value = ctx.product.title);
    			add_location(img, file$3, 24, 8, 769);
    			attr_dev(article0, "class", "single-product-image");
    			add_location(article0, file$3, 23, 6, 722);
    			add_location(h1, file$3, 27, 8, 858);
    			add_location(h2, file$3, 28, 8, 891);
    			add_location(p, file$3, 29, 8, 925);
    			attr_dev(button, "class", "btn btn-primary btn-block");
    			add_location(button, file$3, 30, 8, 962);
    			add_location(article1, file$3, 26, 6, 840);
    			attr_dev(div, "class", "single-product-container");
    			add_location(div, file$3, 22, 4, 677);
    			attr_dev(section, "class", "single-product");
    			add_location(section, file$3, 18, 2, 494);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, a);
    			link_action = link.call(null, a) || {};
    			append_dev(section, t1);
    			append_dev(section, div);
    			append_dev(div, article0);
    			append_dev(article0, img);
    			append_dev(div, t2);
    			append_dev(div, article1);
    			append_dev(article1, h1);
    			append_dev(h1, t3);
    			append_dev(article1, t4);
    			append_dev(article1, h2);
    			append_dev(h2, t5);
    			append_dev(h2, t6);
    			append_dev(article1, t7);
    			append_dev(article1, p);
    			append_dev(p, t8);
    			append_dev(article1, t9);
    			append_dev(article1, button);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.product) && img_src_value !== (img_src_value = ctx.product.image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if ((changed.product) && img_alt_value !== (img_alt_value = ctx.product.title)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if ((changed.product) && t3_value !== (t3_value = ctx.product.title + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if ((changed.product) && t6_value !== (t6_value = ctx.product.price + "")) {
    				set_data_dev(t6, t6_value);
    			}

    			if ((changed.product) && t8_value !== (t8_value = ctx.product.description + "")) {
    				set_data_dev(t8, t8_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$3.name, type: "else", source: "(18:0) {:else}", ctx });
    	return block;
    }

    // (16:0) {#if !product}
    function create_if_block$3(ctx) {
    	var current;

    	var loading = new Loading({ $$inline: true });

    	const block = {
    		c: function create() {
    			loading.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$3.name, type: "if", source: "(16:0) {#if !product}", ctx });
    	return block;
    }

    function create_fragment$5(ctx) {
    	var title_value, t, current_block_type_index, if_block, if_block_anchor, current;

    	document.title = title_value = !ctx.product ? 'single product' : ctx.product.title;

    	var if_block_creators = [
    		create_if_block$3,
    		create_else_block$3
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (!ctx.product) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.product) && title_value !== (title_value = !ctx.product ? 'single product' : ctx.product.title)) {
    				document.title = title_value;
    			}

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}

    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $products;

    	validate_store(store$1, 'products');
    	component_subscribe($$self, store$1, $$value => { $products = $$value; $$invalidate('$products', $products); });

    	let { id, location } = $$props;

    	const writable_props = ['id', 'location'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<ProductTemplate> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    	            addToCart(product);
    	            store.toggleItem('cart', true);
    	          };

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    	};

    	$$self.$capture_state = () => {
    		return { id, location, product, $products };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('product' in $$props) $$invalidate('product', product = $$props.product);
    		if ('$products' in $$props) store$1.set($products);
    	};

    	let product;

    	$$self.$$.update = ($$dirty = { $products: 1, id: 1 }) => {
    		if ($$dirty.$products || $$dirty.id) { $$invalidate('product', product = $products.find(item => item.id === parseInt(id))); }
    	};

    	return { id, location, product, click_handler };
    }

    class ProductTemplate extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, ["id", "location"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "ProductTemplate", options, id: create_fragment$5.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<ProductTemplate> was created without expected prop 'id'");
    		}
    		if (ctx.location === undefined && !('location' in props)) {
    			console.warn("<ProductTemplate> was created without expected prop 'location'");
    		}
    	}

    	get id() {
    		throw new Error("<ProductTemplate>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<ProductTemplate>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get location() {
    		throw new Error("<ProductTemplate>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<ProductTemplate>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Products/Product.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/components/Products/Product.svelte";

    function create_fragment$6(ctx) {
    	var article, div0, img, t0, a, t1, link_action, t2, div1, p0, t3, t4, p1, t5, t6;

    	const block = {
    		c: function create() {
    			article = element("article");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			a = element("a");
    			t1 = text("details");
    			t2 = space();
    			div1 = element("div");
    			p0 = element("p");
    			t3 = text(ctx.title);
    			t4 = space();
    			p1 = element("p");
    			t5 = text("$");
    			t6 = text(ctx.price);
    			attr_dev(img, "src", ctx.image);
    			attr_dev(img, "alt", ctx.title);
    			add_location(img, file$4, 8, 4, 190);
    			attr_dev(a, "href", `/products/${ctx.id}`);
    			attr_dev(a, "class", "btn btn-primary product-link");
    			add_location(a, file$4, 9, 4, 226);
    			attr_dev(div0, "class", "img-container");
    			add_location(div0, file$4, 7, 2, 158);
    			attr_dev(p0, "class", "product-title");
    			add_location(p0, file$4, 14, 4, 368);
    			attr_dev(p1, "class", "product-price");
    			add_location(p1, file$4, 15, 4, 409);
    			attr_dev(div1, "class", "product-footer");
    			add_location(div1, file$4, 13, 2, 335);
    			attr_dev(article, "class", "product");
    			add_location(article, file$4, 6, 0, 130);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, a);
    			append_dev(a, t1);
    			link_action = link.call(null, a) || {};
    			append_dev(article, t2);
    			append_dev(article, div1);
    			append_dev(div1, p0);
    			append_dev(p0, t3);
    			append_dev(div1, t4);
    			append_dev(div1, p1);
    			append_dev(p1, t5);
    			append_dev(p1, t6);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(article);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { product } = $$props;
      const { title, image, price, id } = product;

    	const writable_props = ['product'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Product> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('product' in $$props) $$invalidate('product', product = $$props.product);
    	};

    	$$self.$capture_state = () => {
    		return { product };
    	};

    	$$self.$inject_state = $$props => {
    		if ('product' in $$props) $$invalidate('product', product = $$props.product);
    	};

    	return { product, title, image, price, id };
    }

    class Product extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, ["product"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Product", options, id: create_fragment$6.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.product === undefined && !('product' in props)) {
    			console.warn("<Product> was created without expected prop 'product'");
    		}
    	}

    	get product() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set product(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Products/Products.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/components/Products/Products.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.product = list[i];
    	return child_ctx;
    }

    // (13:4) {:else}
    function create_else_block$4(ctx) {
    	var current;

    	var loading = new Loading({ $$inline: true });

    	const block = {
    		c: function create() {
    			loading.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$4.name, type: "else", source: "(13:4) {:else}", ctx });
    	return block;
    }

    // (11:4) {#each $products as product (product.id)}
    function create_each_block(key_1, ctx) {
    	var first, current;

    	var product = new Product({
    		props: { product: ctx.product },
    		$$inline: true
    	});

    	const block = {
    		key: key_1,

    		first: null,

    		c: function create() {
    			first = empty();
    			product.$$.fragment.c();
    			this.first = first;
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(product, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var product_changes = {};
    			if (changed.$products) product_changes.product = ctx.product;
    			product.$set(product_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(first);
    			}

    			destroy_component(product, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(11:4) {#each $products as product (product.id)}", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var section, h2, t0, t1, div, each_blocks = [], each_1_lookup = new Map(), current;

    	let each_value = ctx.$products;

    	const get_key = ctx => ctx.product.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$4(ctx);
    		each_1_else.c();
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			h2 = element("h2");
    			t0 = text(ctx.title);
    			t1 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$5, 8, 2, 206);
    			attr_dev(div, "class", "products-center");
    			add_location(div, file$5, 9, 2, 247);
    			attr_dev(section, "class", "section");
    			add_location(section, file$5, 7, 0, 178);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h2);
    			append_dev(h2, t0);
    			append_dev(section, t1);
    			append_dev(section, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data_dev(t0, ctx.title);
    			}

    			const each_value = ctx.$products;

    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block, null, get_each_context);
    			check_outros();

    			if (each_value.length) {
    				if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			} else if (!each_1_else) {
    				each_1_else = create_else_block$4(ctx);
    				each_1_else.c();
    				each_1_else.m(div, null);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (each_1_else) each_1_else.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $products;

    	validate_store(store$1, 'products');
    	component_subscribe($$self, store$1, $$value => { $products = $$value; $$invalidate('$products', $products); });

    	let { title = "" } = $$props;

    	const writable_props = ['title'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Products> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    	};

    	$$self.$capture_state = () => {
    		return { title, $products };
    	};

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('$products' in $$props) store$1.set($products);
    	};

    	return { title, $products };
    }

    class Products extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, ["title"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Products", options, id: create_fragment$7.name });
    	}

    	get title() {
    		throw new Error("<Products>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Products>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/Products.svelte generated by Svelte v3.12.1 */

    function create_fragment$8(ctx) {
    	var current;

    	var products = new Products({
    		props: { title: "our products" },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			products.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(products, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(products.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(products.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(products, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    class Products_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Products_1", options, id: create_fragment$8.name });
    	}
    }

    /* src/components/Hero.svelte generated by Svelte v3.12.1 */

    const file$6 = "src/components/Hero.svelte";

    function create_fragment$9(ctx) {
    	var div1, div0, h1, t1, p, t3, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "foam, shave, grow";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Embrace your choices - we do";
    			t3 = space();

    			if (default_slot) default_slot.c();
    			attr_dev(h1, "class", "svelte-6mi56b");
    			add_location(h1, file$6, 10, 4, 141);
    			attr_dev(p, "class", "svelte-6mi56b");
    			add_location(p, file$6, 11, 4, 172);

    			attr_dev(div0, "class", "banner");
    			add_location(div0, file$6, 9, 2, 116);
    			attr_dev(div1, "class", "hero");
    			add_location(div1, file$6, 8, 0, 95);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div0_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(div0, t3);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { $$slots, $$scope };
    }

    class Hero extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$9, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Hero", options, id: create_fragment$9.name });
    	}
    }

    /* src/components/Products/Featured.svelte generated by Svelte v3.12.1 */

    const file$7 = "src/components/Products/Featured.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.product = list[i];
    	return child_ctx;
    }

    // (11:0) {:else}
    function create_else_block$5(ctx) {
    	var section, h2, t0, t1, div, each_blocks = [], each_1_lookup = new Map(), current;

    	let each_value = ctx.$featuredStore;

    	const get_key = ctx => ctx.product.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			h2 = element("h2");
    			t0 = text(ctx.title);
    			t1 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$7, 12, 4, 286);
    			attr_dev(div, "class", "products-center");
    			add_location(div, file$7, 13, 4, 329);
    			attr_dev(section, "class", "section");
    			add_location(section, file$7, 11, 2, 256);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h2);
    			append_dev(h2, t0);
    			append_dev(section, t1);
    			append_dev(section, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data_dev(t0, ctx.title);
    			}

    			const each_value = ctx.$featuredStore;

    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    			check_outros();
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$5.name, type: "else", source: "(11:0) {:else}", ctx });
    	return block;
    }

    // (9:0) {#if $featuredStore.length === 0}
    function create_if_block$4(ctx) {
    	var current;

    	var loading = new Loading({ $$inline: true });

    	const block = {
    		c: function create() {
    			loading.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$4.name, type: "if", source: "(9:0) {#if $featuredStore.length === 0}", ctx });
    	return block;
    }

    // (15:6) {#each $featuredStore as product (product.id)}
    function create_each_block$1(key_1, ctx) {
    	var first, current;

    	var product = new Product({
    		props: { product: ctx.product },
    		$$inline: true
    	});

    	const block = {
    		key: key_1,

    		first: null,

    		c: function create() {
    			first = empty();
    			product.$$.fragment.c();
    			this.first = first;
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(product, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var product_changes = {};
    			if (changed.$featuredStore) product_changes.product = ctx.product;
    			product.$set(product_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(first);
    			}

    			destroy_component(product, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(15:6) {#each $featuredStore as product (product.id)}", ctx });
    	return block;
    }

    function create_fragment$a(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$4,
    		create_else_block$5
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.$featuredStore.length === 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$a.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $featuredStore;

    	validate_store(featuredStore, 'featuredStore');
    	component_subscribe($$self, featuredStore, $$value => { $featuredStore = $$value; $$invalidate('$featuredStore', $featuredStore); });

    	let { title = "" } = $$props;

    	const writable_props = ['title'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Featured> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    	};

    	$$self.$capture_state = () => {
    		return { title, $featuredStore };
    	};

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('$featuredStore' in $$props) featuredStore.set($featuredStore);
    	};

    	return { title, $featuredStore };
    }

    class Featured extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$a, safe_not_equal, ["title"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Featured", options, id: create_fragment$a.name });
    	}

    	get title() {
    		throw new Error("<Featured>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Featured>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/Home.svelte generated by Svelte v3.12.1 */

    const file$8 = "src/pages/Home.svelte";

    // (8:0) <Hero>
    function create_default_slot(ctx) {
    	var a, link_action;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "shop now";
    			attr_dev(a, "href", "/products");
    			attr_dev(a, "class", "btn btn-primary btn-hero");
    			add_location(a, file$8, 8, 2, 206);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			link_action = link.call(null, a) || {};
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(8:0) <Hero>", ctx });
    	return block;
    }

    function create_fragment$b(ctx) {
    	var t, current;

    	var hero = new Hero({
    		props: {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var featured = new Featured({
    		props: { title: "featured products" },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			hero.$$.fragment.c();
    			t = space();
    			featured.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(hero, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(featured, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var hero_changes = {};
    			if (changed.$$scope) hero_changes.$$scope = { changed, ctx };
    			hero.$set(hero_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(hero.$$.fragment, local);

    			transition_in(featured.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(hero.$$.fragment, local);
    			transition_out(featured.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(hero, detaching);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(featured, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$b.name, type: "component", source: "", ctx });
    	return block;
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$b, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Home", options, id: create_fragment$b.name });
    	}
    }

    /* src/pages/About.svelte generated by Svelte v3.12.1 */

    const file$9 = "src/pages/About.svelte";

    function create_fragment$c(ctx) {
    	var section, h1, t1, img, t2, p0, t4, p1, t6, p2, t8, p3;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h1 = element("h1");
    			h1.textContent = "about us";
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestiae\n    repudiandae architecto qui adipisci in officiis, aperiam sequi atque\n    perferendis eos, autem maiores nisi saepe quisquam hic odio consectetur\n    nobis veritatis quasi explicabo obcaecati doloremque? Placeat ratione hic\n    aspernatur error blanditiis?";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Sit aliqua sit consequat irure. Et sit incididunt excepteur anim quis\n    pariatur nisi minim exercitation. Adipisicing velit incididunt non cupidatat\n    sint proident. Qui veniam ex enim eiusmod sint eiusmod nulla tempor ullamco\n    adipisicing consequat aute ea. Pariatur duis minim mollit quis et cupidatat\n    irure excepteur velit.";
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestiae\n    repudiandae architecto qui adipisci in officiis, aperiam sequi atque\n    perferendis eos, autem maiores nisi saepe quisquam hic odio consectetur\n    nobis veritatis quasi explicabo obcaecati doloremque? Placeat ratione hic\n    aspernatur error blanditiis?";
    			t8 = space();
    			p3 = element("p");
    			p3.textContent = "Mr John Smith. 132, My Street, Kingston, New York 12401.";
    			attr_dev(h1, "class", "section-title svelte-w9so1n");
    			add_location(h1, file$9, 14, 2, 227);
    			attr_dev(img, "src", "assets/images/about.jpg");
    			attr_dev(img, "alt", "Razor-Image");
    			attr_dev(img, "class", "svelte-w9so1n");
    			add_location(img, file$9, 15, 2, 269);
    			add_location(p0, file$9, 16, 2, 327);
    			add_location(p1, file$9, 23, 2, 671);
    			add_location(p2, file$9, 30, 2, 1026);
    			add_location(p3, file$9, 37, 2, 1370);
    			attr_dev(section, "class", "section about-section");
    			add_location(section, file$9, 13, 0, 185);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h1);
    			append_dev(section, t1);
    			append_dev(section, img);
    			append_dev(section, t2);
    			append_dev(section, p0);
    			append_dev(section, t4);
    			append_dev(section, p1);
    			append_dev(section, t6);
    			append_dev(section, p2);
    			append_dev(section, t8);
    			append_dev(section, p3);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$c.name, type: "component", source: "", ctx });
    	return block;
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$c, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "About", options, id: create_fragment$c.name });
    	}
    }

    /* src/components/Cart/CartButton.svelte generated by Svelte v3.12.1 */

    const file$a = "src/components/Cart/CartButton.svelte";

    function create_fragment$d(ctx) {
    	var div, button, i, t0, span, t1, dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			span = element("span");
    			t1 = text(ctx.total);
    			attr_dev(i, "class", "fas fa-cart-plus");
    			add_location(i, file$a, 15, 4, 369);
    			attr_dev(button, "class", "btn-cart-toggle");
    			add_location(button, file$a, 10, 2, 255);
    			attr_dev(span, "class", "btn-cart-items");
    			add_location(span, file$a, 17, 2, 414);
    			attr_dev(div, "class", "btn-cart-container");
    			add_location(div, file$a, 9, 0, 220);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, i);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, t1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.total) {
    				set_data_dev(t1, ctx.total);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$d.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $cart;

    	validate_store(cart, 'cart');
    	component_subscribe($$self, cart, $$value => { $cart = $$value; $$invalidate('$cart', $cart); });

    	const click_handler = () => {
    	      store.toggleItem('cart', true);
    	    };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('total' in $$props) $$invalidate('total', total = $$props.total);
    		if ('$cart' in $$props) cart.set($cart);
    	};

    	let total;

    	$$self.$$.update = ($$dirty = { $cart: 1 }) => {
    		if ($$dirty.$cart) { $$invalidate('total', total = $cart.reduce((acc, curr) => {
            return (acc += curr.amount);
          }, 0)); }
    	};

    	return { total, click_handler };
    }

    class CartButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$d, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "CartButton", options, id: create_fragment$d.name });
    	}
    }

    /* src/components/Navbar/SmallNavbar.svelte generated by Svelte v3.12.1 */

    const file$b = "src/components/Navbar/SmallNavbar.svelte";

    function create_fragment$e(ctx) {
    	var nav, div, button, i, t0, a, img, link_action, t1, current, dispose;

    	var cartbutton = new CartButton({ $$inline: true });

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div = element("div");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			a = element("a");
    			img = element("img");
    			t1 = space();
    			cartbutton.$$.fragment.c();
    			attr_dev(i, "class", "fas fa-bars");
    			add_location(i, file$b, 15, 6, 412);
    			attr_dev(button, "class", "btn-sidebar-toggle");
    			add_location(button, file$b, 10, 4, 293);
    			attr_dev(img, "src", "/assets/images/logo.png");
    			attr_dev(img, "class", "logo");
    			attr_dev(img, "alt", "razors logo");
    			add_location(img, file$b, 19, 6, 519);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "nav-logo");
    			add_location(a, file$b, 18, 4, 474);
    			attr_dev(div, "class", "nav-center");
    			add_location(div, file$b, 8, 2, 236);
    			attr_dev(nav, "class", "navbar");
    			add_location(nav, file$b, 7, 0, 213);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div);
    			append_dev(div, button);
    			append_dev(button, i);
    			append_dev(div, t0);
    			append_dev(div, a);
    			append_dev(a, img);
    			link_action = link.call(null, a) || {};
    			append_dev(div, t1);
    			mount_component(cartbutton, div, null);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(cartbutton.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(cartbutton.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nav);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();

    			destroy_component(cartbutton);

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$e.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$a($$self) {
    	
      let openSidebar = store.toggleItem;

    	const click_handler = () => {
    	        openSidebar('sidebar', true);
    	      };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('openSidebar' in $$props) $$invalidate('openSidebar', openSidebar = $$props.openSidebar);
    	};

    	return { openSidebar, click_handler };
    }

    class SmallNavbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$e, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "SmallNavbar", options, id: create_fragment$e.name });
    	}
    }

    var links = [
      { text: "home", url: "/" },
      { text: "products", url: "/products" },
      { text: "about", url: "/about" }
    ];

    /* src/components/LoginLink.svelte generated by Svelte v3.12.1 */

    const file$c = "src/components/LoginLink.svelte";

    // (18:0) {:else}
    function create_else_block$6(ctx) {
    	var a, dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "login";
    			attr_dev(a, "href", "/login");
    			add_location(a, file$c, 18, 2, 379);
    			dispose = listen_dev(a, "click", ctx.click_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$6.name, type: "else", source: "(18:0) {:else}", ctx });
    	return block;
    }

    // (8:0) {#if $user.jwt}
    function create_if_block$5(ctx) {
    	var a, dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "logout";
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "logout-btn");
    			add_location(a, file$c, 8, 2, 214);
    			dispose = listen_dev(a, "click", ctx.click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$5.name, type: "if", source: "(8:0) {#if $user.jwt}", ctx });
    	return block;
    }

    function create_fragment$f(ctx) {
    	var if_block_anchor;

    	function select_block_type(changed, ctx) {
    		if (ctx.$user.jwt) return create_if_block$5;
    		return create_else_block$6;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$f.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $user;

    	validate_store(userStore, 'user');
    	component_subscribe($$self, userStore, $$value => { $user = $$value; $$invalidate('$user', $user); });

    	const click_handler = () => {
    	      logoutUser();
    	      store.toggleItem('sidebar', false);
    	    };

    	const click_handler_1 = () => {
    	      store.toggleItem('sidebar', false);
    	    };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('$user' in $$props) userStore.set($user);
    	};

    	return { $user, click_handler, click_handler_1 };
    }

    class LoginLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$f, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "LoginLink", options, id: create_fragment$f.name });
    	}
    }

    /* src/components/Navbar/BigNavbar.svelte generated by Svelte v3.12.1 */

    const file$d = "src/components/Navbar/BigNavbar.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.navLink = list[i];
    	return child_ctx;
    }

    // (13:8) {#each links as navLink}
    function create_each_block$2(ctx) {
    	var li, a, t_value = ctx.navLink.text + "", t, link_action;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", ctx.navLink.url);
    			add_location(a, file$d, 13, 14, 388);
    			add_location(li, file$d, 13, 10, 384);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t);
    			link_action = link.call(null, a) || {};
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$2.name, type: "each", source: "(13:8) {#each links as navLink}", ctx });
    	return block;
    }

    function create_fragment$g(ctx) {
    	var nav, div2, div1, ul, t0, a, img, link_action, t1, div0, t2, current;

    	let each_value = links;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	var loginlink = new LoginLink({ $$inline: true });

    	var cartbutton = new CartButton({ $$inline: true });

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div2 = element("div");
    			div1 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			a = element("a");
    			img = element("img");
    			t1 = space();
    			div0 = element("div");
    			loginlink.$$.fragment.c();
    			t2 = space();
    			cartbutton.$$.fragment.c();
    			attr_dev(ul, "class", "nav-links");
    			add_location(ul, file$d, 11, 6, 318);
    			attr_dev(img, "src", "/assets/images/logo.png");
    			attr_dev(img, "class", "logo");
    			attr_dev(img, "alt", "razors logo");
    			add_location(img, file$d, 18, 8, 557);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "nav-logo big-logo");
    			add_location(a, file$d, 17, 6, 501);
    			attr_dev(div0, "class", "nav-aside");
    			add_location(div0, file$d, 21, 6, 670);
    			attr_dev(div1, "class", "nav-center");
    			add_location(div1, file$d, 9, 4, 262);
    			attr_dev(div2, "class", "nav-container");
    			add_location(div2, file$d, 8, 2, 230);
    			attr_dev(nav, "class", "navbar");
    			add_location(nav, file$d, 7, 0, 207);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div2);
    			append_dev(div2, div1);
    			append_dev(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div1, t0);
    			append_dev(div1, a);
    			append_dev(a, img);
    			link_action = link.call(null, a) || {};
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(loginlink, div0, null);
    			append_dev(div0, t2);
    			mount_component(cartbutton, div0, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.links) {
    				each_value = links;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loginlink.$$.fragment, local);

    			transition_in(cartbutton.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loginlink.$$.fragment, local);
    			transition_out(cartbutton.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nav);
    			}

    			destroy_each(each_blocks, detaching);

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();

    			destroy_component(loginlink);

    			destroy_component(cartbutton);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$g.name, type: "component", source: "", ctx });
    	return block;
    }

    class BigNavbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$g, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BigNavbar", options, id: create_fragment$g.name });
    	}
    }

    /* src/components/Navbar/Navbar.svelte generated by Svelte v3.12.1 */

    // (16:0) {:else}
    function create_else_block$7(ctx) {
    	var current;

    	var smallnavbar = new SmallNavbar({ $$inline: true });

    	const block = {
    		c: function create() {
    			smallnavbar.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(smallnavbar, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(smallnavbar.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(smallnavbar.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(smallnavbar, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$7.name, type: "else", source: "(16:0) {:else}", ctx });
    	return block;
    }

    // (14:0) {#if screenWidth > 992}
    function create_if_block$6(ctx) {
    	var current;

    	var bignavbar = new BigNavbar({ $$inline: true });

    	const block = {
    		c: function create() {
    			bignavbar.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(bignavbar, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(bignavbar.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(bignavbar.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(bignavbar, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$6.name, type: "if", source: "(14:0) {#if screenWidth > 992}", ctx });
    	return block;
    }

    function create_fragment$h(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	var if_block_creators = [
    		create_if_block$6,
    		create_else_block$7
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.screenWidth > 992) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    			dispose = listen_dev(window, "resize", ctx.onwindowresize);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index !== previous_block_index) {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$h.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	

      let screenWidth;

    	function onwindowresize() {
    		screenWidth = window.innerWidth; $$invalidate('screenWidth', screenWidth);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('screenWidth' in $$props) $$invalidate('screenWidth', screenWidth = $$props.screenWidth);
    	};

    	$$self.$$.update = ($$dirty = { screenWidth: 1 }) => {
    		if ($$dirty.screenWidth) { if (screenWidth > 992) {
            store.toggleItem("sidebar", false);
          } }
    	};

    	return { screenWidth, onwindowresize };
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$h, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Navbar", options, id: create_fragment$h.name });
    	}
    }

    function cubicInOut(t) {
        return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
    }
    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function blur(node, { delay = 0, duration = 400, easing = cubicInOut, amount = 5, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const f = style.filter === 'none' ? '' : style.filter;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `opacity: ${target_opacity - (od * u)}; filter: ${f} blur(${u * amount}px);`
        };
    }
    function fade(node, { delay = 0, duration = 400 }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/components/Navbar/Sidebar.svelte generated by Svelte v3.12.1 */

    const file$e = "src/components/Navbar/Sidebar.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.sideLink = list[i];
    	return child_ctx;
    }

    // (28:6) {#each links as sideLink}
    function create_each_block$3(ctx) {
    	var li, a, t_value = ctx.sideLink.text + "", t, link_action, dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", ctx.sideLink.url);
    			add_location(a, file$e, 29, 10, 859);
    			add_location(li, file$e, 28, 8, 844);
    			dispose = listen_dev(a, "click", ctx.click_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t);
    			link_action = link.call(null, a) || {};
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$3.name, type: "each", source: "(28:6) {#each links as sideLink}", ctx });
    	return block;
    }

    function create_fragment$i(ctx) {
    	var div2, div1, div0, button, i, t0, img, t1, ul, t2, li, div1_transition, div2_transition, current, dispose;

    	let each_value = links;

    	let each_blocks = [];

    	for (let i_1 = 0; i_1 < each_value.length; i_1 += 1) {
    		each_blocks[i_1] = create_each_block$3(get_each_context$3(ctx, each_value, i_1));
    	}

    	var loginlink = new LoginLink({ $$inline: true });

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			img = element("img");
    			t1 = space();
    			ul = element("ul");

    			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
    				each_blocks[i_1].c();
    			}

    			t2 = space();
    			li = element("li");
    			loginlink.$$.fragment.c();
    			attr_dev(i, "class", "fas fa-window-close");
    			add_location(i, file$e, 17, 8, 566);
    			attr_dev(button, "class", "btn-close");
    			add_location(button, file$e, 12, 6, 434);
    			attr_dev(div0, "class", "sidebar-header");
    			add_location(div0, file$e, 11, 4, 399);
    			attr_dev(img, "src", "/assets/images/logo.png");
    			attr_dev(img, "class", "logo sidebar-logo");
    			attr_dev(img, "alt", "razors logo");
    			add_location(img, file$e, 21, 4, 654);
    			add_location(li, file$e, 39, 6, 1094);
    			attr_dev(ul, "class", "sidebar-links");
    			add_location(ul, file$e, 26, 4, 777);
    			attr_dev(div1, "class", "sidebar");
    			add_location(div1, file$e, 9, 2, 320);
    			attr_dev(div2, "class", "sidebar-container");
    			add_location(div2, file$e, 8, 0, 256);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			append_dev(button, i);
    			append_dev(div1, t0);
    			append_dev(div1, img);
    			append_dev(div1, t1);
    			append_dev(div1, ul);

    			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
    				each_blocks[i_1].m(ul, null);
    			}

    			append_dev(ul, t2);
    			append_dev(ul, li);
    			mount_component(loginlink, li, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.links) {
    				each_value = links;

    				let i_1;
    				for (i_1 = 0; i_1 < each_value.length; i_1 += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i_1);

    					if (each_blocks[i_1]) {
    						each_blocks[i_1].p(changed, child_ctx);
    					} else {
    						each_blocks[i_1] = create_each_block$3(child_ctx);
    						each_blocks[i_1].c();
    						each_blocks[i_1].m(ul, t2);
    					}
    				}

    				for (; i_1 < each_blocks.length; i_1 += 1) {
    					each_blocks[i_1].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loginlink.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { delay: 400 }, true);
    				div1_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { x: -1000 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loginlink.$$.fragment, local);

    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { delay: 400 }, false);
    			div1_transition.run(0);

    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { x: -1000 }, false);
    			div2_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			destroy_each(each_blocks, detaching);

    			destroy_component(loginlink);

    			if (detaching) {
    				if (div1_transition) div1_transition.end();
    				if (div2_transition) div2_transition.end();
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$i.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$d($$self) {
    	const click_handler = () => {
    	          store.toggleItem('sidebar', false);
    	        };

    	const click_handler_1 = () => {
    	              store.toggleItem('sidebar', false);
    	            };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { click_handler, click_handler_1 };
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$i, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Sidebar", options, id: create_fragment$i.name });
    	}
    }

    /* src/components/Cart/Item.svelte generated by Svelte v3.12.1 */

    const file$f = "src/components/Cart/Item.svelte";

    function create_fragment$j(ctx) {
    	var div2, img, t0, div0, h4, t1, t2, h5, t3, t4, t5, button0, t7, div1, button1, i0, t8, p, t9, t10, button2, i1, dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			h4 = element("h4");
    			t1 = text(ctx.title);
    			t2 = space();
    			h5 = element("h5");
    			t3 = text("$");
    			t4 = text(ctx.price);
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "remove";
    			t7 = space();
    			div1 = element("div");
    			button1 = element("button");
    			i0 = element("i");
    			t8 = space();
    			p = element("p");
    			t9 = text(ctx.amount);
    			t10 = space();
    			button2 = element("button");
    			i1 = element("i");
    			attr_dev(img, "src", ctx.image);
    			attr_dev(img, "alt", ctx.title);
    			add_location(img, file$f, 16, 2, 284);
    			add_location(h4, file$f, 18, 4, 328);
    			add_location(h5, file$f, 19, 4, 349);
    			attr_dev(button0, "class", "cart-btn remove-btn");
    			add_location(button0, file$f, 20, 4, 371);
    			add_location(div0, file$f, 17, 2, 318);
    			attr_dev(i0, "class", "fas fa-chevron-up");
    			add_location(i0, file$f, 34, 6, 629);
    			attr_dev(button1, "class", "cart-btn amount-btn");
    			add_location(button1, file$f, 29, 4, 519);
    			attr_dev(p, "class", "item-amount");
    			add_location(p, file$f, 36, 4, 679);
    			attr_dev(i1, "class", "fas fa-chevron-down");
    			add_location(i1, file$f, 42, 6, 837);
    			attr_dev(button2, "class", "cart-btn amount-btn");
    			add_location(button2, file$f, 37, 4, 719);
    			add_location(div1, file$f, 28, 2, 509);
    			attr_dev(div2, "class", "cart-item");
    			add_location(div2, file$f, 15, 0, 258);

    			dispose = [
    				listen_dev(button0, "click", ctx.click_handler),
    				listen_dev(button1, "click", ctx.click_handler_1),
    				listen_dev(button2, "click", ctx.click_handler_2)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, img);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, h4);
    			append_dev(h4, t1);
    			append_dev(div0, t2);
    			append_dev(div0, h5);
    			append_dev(h5, t3);
    			append_dev(h5, t4);
    			append_dev(div0, t5);
    			append_dev(div0, button0);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			append_dev(div1, button1);
    			append_dev(button1, i0);
    			append_dev(div1, t8);
    			append_dev(div1, p);
    			append_dev(p, t9);
    			append_dev(div1, t10);
    			append_dev(div1, button2);
    			append_dev(button2, i1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.image) {
    				attr_dev(img, "src", ctx.image);
    			}

    			if (changed.title) {
    				attr_dev(img, "alt", ctx.title);
    				set_data_dev(t1, ctx.title);
    			}

    			if (changed.price) {
    				set_data_dev(t4, ctx.price);
    			}

    			if (changed.amount) {
    				set_data_dev(t9, ctx.amount);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$j.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { id, image, title, price, amount } = $$props;

    	const writable_props = ['id', 'image', 'title', 'price', 'amount'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Item> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    	        removeItem(id);
    	      };

    	const click_handler_1 = () => {
    	        increaseAmount(id);
    	      };

    	const click_handler_2 = () => {
    	        decreaseAmount(id, amount);
    	      };

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('image' in $$props) $$invalidate('image', image = $$props.image);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('price' in $$props) $$invalidate('price', price = $$props.price);
    		if ('amount' in $$props) $$invalidate('amount', amount = $$props.amount);
    	};

    	$$self.$capture_state = () => {
    		return { id, image, title, price, amount };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('image' in $$props) $$invalidate('image', image = $$props.image);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('price' in $$props) $$invalidate('price', price = $$props.price);
    		if ('amount' in $$props) $$invalidate('amount', amount = $$props.amount);
    	};

    	return {
    		id,
    		image,
    		title,
    		price,
    		amount,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	};
    }

    class Item extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$j, safe_not_equal, ["id", "image", "title", "price", "amount"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Item", options, id: create_fragment$j.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<Item> was created without expected prop 'id'");
    		}
    		if (ctx.image === undefined && !('image' in props)) {
    			console.warn("<Item> was created without expected prop 'image'");
    		}
    		if (ctx.title === undefined && !('title' in props)) {
    			console.warn("<Item> was created without expected prop 'title'");
    		}
    		if (ctx.price === undefined && !('price' in props)) {
    			console.warn("<Item> was created without expected prop 'price'");
    		}
    		if (ctx.amount === undefined && !('amount' in props)) {
    			console.warn("<Item> was created without expected prop 'amount'");
    		}
    	}

    	get id() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get image() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set image(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get price() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set price(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get amount() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set amount(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const dx = animation.from.left - animation.to.left;
        const dy = animation.from.top - animation.to.top;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = d => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src/components/Cart/ItemsList.svelte generated by Svelte v3.12.1 */

    const file$g = "src/components/Cart/ItemsList.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.cartItem = list[i];
    	child_ctx.index = i;
    	return child_ctx;
    }

    // (21:4) {:else}
    function create_else_block$8(ctx) {
    	var h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "is currently empty...";
    			attr_dev(h2, "class", "empty-cart");
    			add_location(h2, file$g, 21, 6, 577);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h2);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$8.name, type: "else", source: "(21:4) {:else}", ctx });
    	return block;
    }

    // (14:4) {#each $cart as cartItem, index (cartItem.id)}
    function create_each_block$4(key_1, ctx) {
    	var div, t, div_intro, div_outro, rect, stop_animation = noop, current;

    	var item_spread_levels = [
    		ctx.cartItem
    	];

    	let item_props = {};
    	for (var i = 0; i < item_spread_levels.length; i += 1) {
    		item_props = assign(item_props, item_spread_levels[i]);
    	}
    	var item = new Item({ props: item_props, $$inline: true });

    	const block = {
    		key: key_1,

    		first: null,

    		c: function create() {
    			div = element("div");
    			item.$$.fragment.c();
    			t = space();
    			add_location(div, file$g, 14, 6, 404);
    			this.first = div;
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(item, div, null);
    			append_dev(div, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var item_changes = (changed.$cart) ? get_spread_update(item_spread_levels, [
    									get_spread_object(ctx.cartItem)
    								]) : {};
    			item.$set(item_changes);
    		},

    		r: function measure_1() {
    			rect = div.getBoundingClientRect();
    		},

    		f: function fix() {
    			fix_position(div);
    			stop_animation();
    			add_transform(div, rect);
    		},

    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(div, rect, flip, {});
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(item.$$.fragment, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { delay: (ctx.index + 1) * 500, x: 100 });
    				div_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(item.$$.fragment, local);
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, { x: -100 });

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(item);

    			if (detaching) {
    				if (div_outro) div_outro.end();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$4.name, type: "each", source: "(14:4) {#each $cart as cartItem, index (cartItem.id)}", ctx });
    	return block;
    }

    function create_fragment$k(ctx) {
    	var section, article, each_blocks = [], each_1_lookup = new Map(), t0, h3, t1, t2, current;

    	let each_value = ctx.$cart;

    	const get_key = ctx => ctx.cartItem.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$4(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$8(ctx);
    		each_1_else.c();
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			article = element("article");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			h3 = element("h3");
    			t1 = text("total : $");
    			t2 = text(ctx.$cartTotal);
    			add_location(article, file$g, 12, 2, 337);
    			attr_dev(h3, "class", "cart-total");
    			add_location(h3, file$g, 24, 2, 654);
    			attr_dev(section, "class", "cart-items");
    			add_location(section, file$g, 11, 0, 306);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, article);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(article, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(article, null);
    			}

    			append_dev(section, t0);
    			append_dev(section, h3);
    			append_dev(h3, t1);
    			append_dev(h3, t2);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			const each_value = ctx.$cart;

    			group_outros();
    			for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, article, fix_and_outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
    			for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    			check_outros();

    			if (each_value.length) {
    				if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			} else if (!each_1_else) {
    				each_1_else = create_else_block$8(ctx);
    				each_1_else.c();
    				each_1_else.m(article, null);
    			}

    			if (!current || changed.$cartTotal) {
    				set_data_dev(t2, ctx.$cartTotal);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (each_1_else) each_1_else.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$k.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let $cart, $cartTotal;

    	validate_store(cart, 'cart');
    	component_subscribe($$self, cart, $$value => { $cart = $$value; $$invalidate('$cart', $cart); });
    	validate_store(cartTotal, 'cartTotal');
    	component_subscribe($$self, cartTotal, $$value => { $cartTotal = $$value; $$invalidate('$cartTotal', $cartTotal); });

    	
      afterUpdate(() => {
        setStorageCart($cart);
      });

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('$cart' in $$props) cart.set($cart);
    		if ('$cartTotal' in $$props) cartTotal.set($cartTotal);
    	};

    	return { $cart, $cartTotal };
    }

    class ItemsList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$k, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "ItemsList", options, id: create_fragment$k.name });
    	}
    }

    /* src/components/Cart/Cart.svelte generated by Svelte v3.12.1 */

    const file$h = "src/components/Cart/Cart.svelte";

    // (40:8) {:else}
    function create_else_block$9(ctx) {
    	var p, t, a, link_action, dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text("in order to checkout please\n            ");
    			a = element("a");
    			a.textContent = "login";
    			attr_dev(a, "href", "/login");
    			add_location(a, file$h, 42, 12, 1285);
    			attr_dev(p, "class", "cart-login");
    			add_location(p, file$h, 40, 10, 1210);
    			dispose = listen_dev(a, "click", ctx.click_handler_2);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    			append_dev(p, a);
    			link_action = link.call(null, a) || {};
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$9.name, type: "else", source: "(40:8) {:else}", ctx });
    	return block;
    }

    // (30:8) {#if $user.jwt}
    function create_if_block$7(ctx) {
    	var a, link_action, dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "checkout";
    			attr_dev(a, "href", "/checkout");
    			attr_dev(a, "class", "btn btn-primary btn-block");
    			add_location(a, file$h, 30, 10, 950);
    			dispose = listen_dev(a, "click", ctx.click_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			link_action = link.call(null, a) || {};
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$7.name, type: "if", source: "(30:8) {#if $user.jwt}", ctx });
    	return block;
    }

    function create_fragment$l(ctx) {
    	var div4, div3, div2, div0, button, i, t0, h2, t2, span, t3, t4, div1, div2_transition, div3_transition, div4_transition, current, dispose;

    	var itemslist = new ItemsList({ $$inline: true });

    	function select_block_type(changed, ctx) {
    		if (ctx.$user.jwt) return create_if_block$7;
    		return create_else_block$9;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "your bag";
    			t2 = space();
    			span = element("span");
    			t3 = space();
    			itemslist.$$.fragment.c();
    			t4 = space();
    			div1 = element("div");
    			if_block.c();
    			attr_dev(i, "class", "fas fa-window-close");
    			add_location(i, file$h, 18, 10, 620);
    			attr_dev(button, "class", "btn-close");
    			add_location(button, file$h, 13, 8, 481);
    			attr_dev(h2, "class", "cart-title");
    			add_location(h2, file$h, 20, 8, 680);
    			add_location(span, file$h, 21, 8, 725);
    			attr_dev(div0, "class", "cart-header");
    			add_location(div0, file$h, 12, 6, 447);
    			attr_dev(div1, "class", "cart-footer");
    			add_location(div1, file$h, 28, 6, 890);
    			attr_dev(div2, "class", "cart");
    			add_location(div2, file$h, 10, 4, 362);
    			attr_dev(div3, "class", "cart-container");
    			add_location(div3, file$h, 9, 2, 301);
    			attr_dev(div4, "class", "cart-overlay");
    			add_location(div4, file$h, 8, 0, 256);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, button);
    			append_dev(button, i);
    			append_dev(div0, t0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			append_dev(div0, span);
    			append_dev(div2, t3);
    			mount_component(itemslist, div2, null);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			if_block.m(div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(itemslist.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { delay: 400 }, true);
    				div2_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fly, { x: 100 }, true);
    				div3_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div4_transition) div4_transition = create_bidirectional_transition(div4, blur, {}, true);
    				div4_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(itemslist.$$.fragment, local);

    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { delay: 400 }, false);
    			div2_transition.run(0);

    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fly, { x: 100 }, false);
    			div3_transition.run(0);

    			if (!div4_transition) div4_transition = create_bidirectional_transition(div4, blur, {}, false);
    			div4_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div4);
    			}

    			destroy_component(itemslist);

    			if_block.d();

    			if (detaching) {
    				if (div2_transition) div2_transition.end();
    				if (div3_transition) div3_transition.end();
    				if (div4_transition) div4_transition.end();
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$l.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let $user;

    	validate_store(userStore, 'user');
    	component_subscribe($$self, userStore, $$value => { $user = $$value; $$invalidate('$user', $user); });

    	const click_handler = () => {
    	            store.toggleItem('cart', false);
    	          };

    	const click_handler_1 = () => {
    	              store.toggleItem('cart', false);
    	            };

    	const click_handler_2 = () => {
    	                store.toggleItem('cart', false);
    	              };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('$user' in $$props) userStore.set($user);
    	};

    	return {
    		$user,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	};
    }

    class Cart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$l, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Cart", options, id: create_fragment$l.name });
    	}
    }

    /* src/components/Alert.svelte generated by Svelte v3.12.1 */

    const file$i = "src/components/Alert.svelte";

    function create_fragment$m(ctx) {
    	var div1, div0, p, t0_value = ctx.$globalStore.alertText + "", t0, t1, button, i, div1_intro, div1_outro, current, dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			button = element("button");
    			i = element("i");
    			add_location(p, file$i, 25, 4, 606);
    			attr_dev(i, "class", "fas fa-window-close");
    			add_location(i, file$i, 27, 6, 700);
    			attr_dev(button, "class", "alert-close");
    			add_location(button, file$i, 26, 4, 642);
    			attr_dev(div0, "class", "alert");
    			add_location(div0, file$i, 24, 2, 582);
    			attr_dev(div1, "class", "alert-container");
    			toggle_class(div1, "alert-danger", ctx.$globalStore.alertDanger);
    			add_location(div1, file$i, 19, 0, 432);
    			dispose = listen_dev(button, "click", ctx.handleClose);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(p, t0);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(button, i);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.$globalStore) && t0_value !== (t0_value = ctx.$globalStore.alertText + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if (changed.$globalStore) {
    				toggle_class(div1, "alert-danger", ctx.$globalStore.alertDanger);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div1_outro) div1_outro.end(1);
    				if (!div1_intro) div1_intro = create_in_transition(div1, fly, { y: -200, duration: 1000 });
    				div1_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (div1_intro) div1_intro.invalidate();

    			div1_outro = create_out_transition(div1, fade, { duration: 0 });

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    				if (div1_outro) div1_outro.end();
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$m.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let $globalStore;

    	validate_store(store, 'globalStore');
    	component_subscribe($$self, store, $$value => { $globalStore = $$value; $$invalidate('$globalStore', $globalStore); });

    	

      const handleClose = () => {
        store.toggleItem("alert", false);
      };
      let timeout;
      onMount(() => {
        timeout = setTimeout(() => {
          store.toggleItem("alert", false);
        }, 3000);
      });
      onDestroy(() => {
        clearTimeout(timeout);
      });

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('timeout' in $$props) timeout = $$props.timeout;
    		if ('$globalStore' in $$props) store.set($globalStore);
    	};

    	return { handleClose, $globalStore };
    }

    class Alert extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$m, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Alert", options, id: create_fragment$m.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    // (23:2) {#if $globalStore.sidebar}
    function create_if_block_2$1(ctx) {
    	var current;

    	var sidebar = new Sidebar({ $$inline: true });

    	const block = {
    		c: function create() {
    			sidebar.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(sidebar, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(sidebar.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(sidebar.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(sidebar, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$1.name, type: "if", source: "(23:2) {#if $globalStore.sidebar}", ctx });
    	return block;
    }

    // (26:2) {#if $globalStore.cart}
    function create_if_block_1$3(ctx) {
    	var current;

    	var cart = new Cart({ $$inline: true });

    	const block = {
    		c: function create() {
    			cart.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(cart, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(cart.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(cart.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(cart, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$3.name, type: "if", source: "(26:2) {#if $globalStore.cart}", ctx });
    	return block;
    }

    // (29:2) {#if $globalStore.alert}
    function create_if_block$8(ctx) {
    	var current;

    	var alert = new Alert({ $$inline: true });

    	const block = {
    		c: function create() {
    			alert.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(alert, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(alert.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(alert.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(alert, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$8.name, type: "if", source: "(29:2) {#if $globalStore.alert}", ctx });
    	return block;
    }

    // (21:0) <Router>
    function create_default_slot$1(ctx) {
    	var t0, t1, t2, t3, t4, t5, t6, t7, t8, current;

    	var navbar = new Navbar({ $$inline: true });

    	var if_block0 = (ctx.$globalStore.sidebar) && create_if_block_2$1(ctx);

    	var if_block1 = (ctx.$globalStore.cart) && create_if_block_1$3(ctx);

    	var if_block2 = (ctx.$globalStore.alert) && create_if_block$8(ctx);

    	var route0 = new Route({
    		props: { path: "/", component: Home },
    		$$inline: true
    	});

    	var route1 = new Route({
    		props: { path: "/about", component: About },
    		$$inline: true
    	});

    	var route2 = new Route({
    		props: { path: "/login", component: Login },
    		$$inline: true
    	});

    	var route3 = new Route({
    		props: {
    		path: "/checkout",
    		component: Checkout
    	},
    		$$inline: true
    	});

    	var route4 = new Route({
    		props: {
    		path: "/products",
    		component: Products_1
    	},
    		$$inline: true
    	});

    	var route5 = new Route({
    		props: {
    		path: "/products/:id",
    		component: ProductTemplate
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			navbar.$$.fragment.c();
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			t3 = space();
    			route0.$$.fragment.c();
    			t4 = space();
    			route1.$$.fragment.c();
    			t5 = space();
    			route2.$$.fragment.c();
    			t6 = space();
    			route3.$$.fragment.c();
    			t7 = space();
    			route4.$$.fragment.c();
    			t8 = space();
    			route5.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(route0, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(route2, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(route3, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(route4, target, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(route5, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$globalStore.sidebar) {
    				if (!if_block0) {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t1.parentNode, t1);
    				} else transition_in(if_block0, 1);
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			if (ctx.$globalStore.cart) {
    				if (!if_block1) {
    					if_block1 = create_if_block_1$3(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t2.parentNode, t2);
    				} else transition_in(if_block1, 1);
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}

    			if (ctx.$globalStore.alert) {
    				if (!if_block2) {
    					if_block2 = create_if_block$8(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(t3.parentNode, t3);
    				} else transition_in(if_block2, 1);
    			} else if (if_block2) {
    				group_outros();
    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);

    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);

    			transition_in(route0.$$.fragment, local);

    			transition_in(route1.$$.fragment, local);

    			transition_in(route2.$$.fragment, local);

    			transition_in(route3.$$.fragment, local);

    			transition_in(route4.$$.fragment, local);

    			transition_in(route5.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			transition_out(route5.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(navbar, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			if (if_block0) if_block0.d(detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach_dev(t2);
    			}

    			if (if_block2) if_block2.d(detaching);

    			if (detaching) {
    				detach_dev(t3);
    			}

    			destroy_component(route0, detaching);

    			if (detaching) {
    				detach_dev(t4);
    			}

    			destroy_component(route1, detaching);

    			if (detaching) {
    				detach_dev(t5);
    			}

    			destroy_component(route2, detaching);

    			if (detaching) {
    				detach_dev(t6);
    			}

    			destroy_component(route3, detaching);

    			if (detaching) {
    				detach_dev(t7);
    			}

    			destroy_component(route4, detaching);

    			if (detaching) {
    				detach_dev(t8);
    			}

    			destroy_component(route5, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(21:0) <Router>", ctx });
    	return block;
    }

    function create_fragment$n(ctx) {
    	var current;

    	var router = new Router({
    		props: {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			router.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var router_changes = {};
    			if (changed.$$scope || changed.$globalStore) router_changes.$$scope = { changed, ctx };
    			router.$set(router_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$n.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let $globalStore;

    	validate_store(store, 'globalStore');
    	component_subscribe($$self, store, $$value => { $globalStore = $$value; $$invalidate('$globalStore', $globalStore); });

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('$globalStore' in $$props) store.set($globalStore);
    	};

    	return { $globalStore };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$n, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$n.name });
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
