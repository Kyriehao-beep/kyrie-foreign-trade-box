
import { createRequire as __createRequire } from 'module';
import { fileURLToPath as __fileURLToPath } from 'url';
import { dirname as __pathDirname } from 'path';

// Global variables
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
const require = __createRequire(import.meta.url);

// Global require function
globalThis.require = require;
globalThis.__filename = __filename;
globalThis.__dirname = __dirname;

// Dynamic require handler
globalThis.__dynamicRequire = function(id) {
  try {
    return require(id);
  } catch (err) {
    if (err.code === 'ERR_REQUIRE_ESM') {
      // If the module is ESM, try using import()
      return import(id);
    }
    throw err;
  }
};

// Fix Buffer
if (typeof Buffer === 'undefined') {
  globalThis.Buffer = require('buffer').Buffer;
}

// Fix process
if (typeof process === 'undefined') {
  globalThis.process = require('process');
}

// Fix util.promisify
if (!Symbol.for('nodejs.util.promisify.custom')) {
  Symbol.for('nodejs.util.promisify.custom');
}


  
  
// ===== Fetch Proxy Injection (Production Mode Only) =====
// Inject fetch-proxy to intercept fetch calls
import __fetchProxyCrypto from 'node:crypto';

(function() {
  const __originalFetch = globalThis.fetch;

const uuid = '{{PAGES_PROXY_UUID}}';
const proxyHost = '{{PAGES_PROXY_HOST}}';

// Domains that must bypass the proxy and always use direct fetch.
// These are internal EdgeOne infrastructure services whose requests
// break when routed through openedge-proxy (e.g. STS credential
// issuance for @edgeone/pages-blob, blob CDN read/write domains).
const __proxyBypassHosts = new Set([
  'blob-sts.edgeone.site',
]);
const __proxyBypassSuffixes = [
  '.blob.edgeone.site',
  '.blob-nocache.edgeone.site',
];

function __shouldBypassProxy(host) {
  if (__proxyBypassHosts.has(host)) return true;
  for (let i = 0; i < __proxyBypassSuffixes.length; i++) {
    if (host.endsWith(__proxyBypassSuffixes[i])) return true;
  }
  return false;
}

function _fetch(
  request,
  requestInit = {},
) {
  const { host } = getUrl(request);
  // Never proxy internal EdgeOne blob infrastructure domains
  if (__shouldBypassProxy(host)) {
    return __originalFetch(request, requestInit);
  }
  const cache = getHostCache(host);
  if (cache && cache.needProxy && cache.expires > Date.now()) {
    setHostCache(host);
    return fetchByProxy(request, requestInit);
  }
  return fetchByOrigin(request, requestInit);
}

function getUrl(request) {
  // 直接从 request.url 获取 URL，避免消费 request body
  const urlString = request instanceof Request ? request.url : request;
  return new URL(urlString);
}

function getHostCache(host) {
  return new Map(globalThis._FETCHCACHES || []).get(host);
}

function setHostCache(host) {
  const value = {
    needProxy: true,
    expires: Date.now() + 1000 * 60 * 60,
  };
  if (globalThis._FETCHCACHES) {
    globalThis._FETCHCACHES.set(host, value);
  } else {
    const cache = new Map([[host, value]]);
    Object.defineProperty(globalThis, '_FETCHCACHES', {
      value: cache,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
}

function bufferToHex(arr) {
  return Array.prototype.map
    .call(arr, (x) => (x >= 16 ? x.toString(16) : '0' + x.toString(16)))
    .join('');
}

function generateSign({ pathname, oeTimestamp }) {
  return md5(oeTimestamp+'-'+pathname+'-'+uuid);
}

async function generateHeaders(request) {
  const { host, pathname } = getUrl(request);
  const timestamp = Date.now().toString();
  const sign = generateSign({ pathname, oeTimestamp: timestamp });
  return {
    host,
    timestamp,
    sign,
  };
}

// MD5 hash function for Node.js environment
// Node.js crypto.subtle.digest doesn't support MD5, so we use crypto.createHash instead
// Note: __fetchProxyCrypto is imported at the top level using ESM import
function md5(text) {
  const hash = __fetchProxyCrypto.createHash('md5');
  hash.update(text, 'utf8');
  return hash.digest('hex');
}

/**
 * Try to request using the native fetch; if it fails, request via the proxy
 * @returns
 */
async function fetchByOrigin(
  request,
  requestInit = {},
) {
  try {
    const res = await __originalFetch(request, {
      eo: {
        timeoutSetting: {
          connectTimeout: 500,
        },
      },
      ...requestInit,
    });
    if (res.status > 300 || res.status < 200) throw new Error('need proxy');
    return res;
  } catch (error) {
    const { host } = getUrl(request);
    setHostCache(host);
    return fetchByProxy(request, requestInit);
  }
}

/**
 * Request via AI proxy
 * @returns
 */
async function fetchByProxy(
  request,
  requestInit,
) {
  const options = {};
  if (requestInit) {
    Object.assign(options, requestInit || {});
  }
  options.headers = new Headers(options.headers || {});
  const { host, timestamp, sign } = await generateHeaders(request);
  options.headers.append('oe-host', host);
  options.headers.append('oe-timestamp', timestamp);
  options.headers.append('oe-sign', sign);
  
  let clonedRequest;
  if (request instanceof Request && typeof request.clone === 'function') {
    clonedRequest = request.clone();
  } else {
    // If request is not a Request object (e.g., URL string), create a new Request
    clonedRequest = new Request(request);
  }
  
  // Create a new request with the proxy host, preserving all properties including body
  const req = new Request(clonedRequest.url.replace(host, proxyHost), {
    method: clonedRequest.method,
    headers: clonedRequest.headers,
    body: clonedRequest.body,
  });
  
  return __originalFetch(req, options);
}
// Replace global fetch with _fetch from fetch-proxy
  if (typeof _fetch === 'function') {
    globalThis.fetch = _fetch;
    // Store original fetch for internal use
    globalThis.__originalFetch = __originalFetch;
  } else {
    console.warn('[runtime-shim] _fetch function not found, using original fetch');
  }
})();


  


var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var require_stdin = __commonJS({
  "<stdin>"(exports, module) {
    var _e, _t, _a;
    var hs = Object.create;
    var he = Object.defineProperty;
    var us = Object.getOwnPropertyDescriptor;
    var ds = Object.getOwnPropertyNames;
    var ps = Object.getPrototypeOf, gs = Object.prototype.hasOwnProperty;
    var b = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports), _s = (t, e) => {
      for (var s in e)
        he(t, s, { get: e[s], enumerable: true });
    }, Je = (t, e, s, r) => {
      if (e && typeof e == "object" || typeof e == "function")
        for (let n of ds(e))
          !gs.call(t, n) && n !== s && he(t, n, { get: () => e[n], enumerable: !(r = us(e, n)) || r.enumerable });
      return t;
    };
    var Y = (t, e, s) => (s = t != null ? hs(ps(t)) : {}, Je(e || !t || !t.__esModule ? he(s, "default", { value: t, enumerable: true }) : s, t)), ms = (t) => Je(he({}, "__esModule", { value: true }), t);
    var P = b((fn, et) => {
      "use strict";
      var Ze = ["nodebuffer", "arraybuffer", "fragments"], Qe = typeof Blob < "u";
      Qe && Ze.push("blob");
      et.exports = { BINARY_TYPES: Ze, EMPTY_BUFFER: Buffer.alloc(0), GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", hasBlob: Qe, kForOnEventAttribute: Symbol("kIsForOnEventAttribute"), kListener: Symbol("kListener"), kStatusCode: Symbol("status-code"), kWebSocket: Symbol("websocket"), NOOP: () => {
      } };
    });
    var re = b((hn, ue) => {
      "use strict";
      var { EMPTY_BUFFER: ys } = P(), Ce = Buffer[Symbol.species];
      function Ss(t, e) {
        if (t.length === 0)
          return ys;
        if (t.length === 1)
          return t[0];
        let s = Buffer.allocUnsafe(e), r = 0;
        for (let n = 0; n < t.length; n++) {
          let i = t[n];
          s.set(i, r), r += i.length;
        }
        return r < e ? new Ce(s.buffer, s.byteOffset, r) : s;
      }
      function tt(t, e, s, r, n) {
        for (let i = 0; i < n; i++)
          s[r + i] = t[i] ^ e[i & 3];
      }
      function st(t, e) {
        for (let s = 0; s < t.length; s++)
          t[s] ^= e[s & 3];
      }
      function Es(t) {
        return t.length === t.buffer.byteLength ? t.buffer : t.buffer.slice(t.byteOffset, t.byteOffset + t.length);
      }
      function Pe(t) {
        if (Pe.readOnly = true, Buffer.isBuffer(t))
          return t;
        let e;
        return t instanceof ArrayBuffer ? e = new Ce(t) : ArrayBuffer.isView(t) ? e = new Ce(t.buffer, t.byteOffset, t.byteLength) : (e = Buffer.from(t), Pe.readOnly = false), e;
      }
      ue.exports = { concat: Ss, mask: tt, toArrayBuffer: Es, toBuffer: Pe, unmask: st };
      if (!process.env.WS_NO_BUFFER_UTIL)
        try {
          let t = require("bufferutil");
          ue.exports.mask = function(e, s, r, n, i) {
            i < 48 ? tt(e, s, r, n, i) : t.mask(e, s, r, n, i);
          }, ue.exports.unmask = function(e, s) {
            e.length < 32 ? st(e, s) : t.unmask(e, s);
          };
        } catch {
        }
    });
    var it = b((un, nt) => {
      "use strict";
      var rt = Symbol("kDone"), Ne = Symbol("kRun"), Ae = class {
        constructor(e) {
          this[rt] = () => {
            this.pending--, this[Ne]();
          }, this.concurrency = e || 1 / 0, this.jobs = [], this.pending = 0;
        }
        add(e) {
          this.jobs.push(e), this[Ne]();
        }
        [Ne]() {
          if (this.pending !== this.concurrency && this.jobs.length) {
            let e = this.jobs.shift();
            this.pending++, e(this[rt]);
          }
        }
      };
      nt.exports = Ae;
    });
    var ie = b((dn, ct) => {
      "use strict";
      var ne = require("zlib"), ot = re(), xs = it(), { kStatusCode: at } = P(), bs = Buffer[Symbol.species], ws = Buffer.from([0, 0, 255, 255]), pe = Symbol("permessage-deflate"), N = Symbol("total-length"), K = Symbol("callback"), R = Symbol("buffers"), X = Symbol("error"), de, Ie = class {
        constructor(e, s, r) {
          if (this._maxPayload = r | 0, this._options = e || {}, this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024, this._isServer = !!s, this._deflate = null, this._inflate = null, this.params = null, !de) {
            let n = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
            de = new xs(n);
          }
        }
        static get extensionName() {
          return "permessage-deflate";
        }
        offer() {
          let e = {};
          return this._options.serverNoContextTakeover && (e.server_no_context_takeover = true), this._options.clientNoContextTakeover && (e.client_no_context_takeover = true), this._options.serverMaxWindowBits && (e.server_max_window_bits = this._options.serverMaxWindowBits), this._options.clientMaxWindowBits ? e.client_max_window_bits = this._options.clientMaxWindowBits : this._options.clientMaxWindowBits == null && (e.client_max_window_bits = true), e;
        }
        accept(e) {
          return e = this.normalizeParams(e), this.params = this._isServer ? this.acceptAsServer(e) : this.acceptAsClient(e), this.params;
        }
        cleanup() {
          if (this._inflate && (this._inflate.close(), this._inflate = null), this._deflate) {
            let e = this._deflate[K];
            this._deflate.close(), this._deflate = null, e && e(new Error("The deflate stream was closed while data was being processed"));
          }
        }
        acceptAsServer(e) {
          let s = this._options, r = e.find((n) => !(s.serverNoContextTakeover === false && n.server_no_context_takeover || n.server_max_window_bits && (s.serverMaxWindowBits === false || typeof s.serverMaxWindowBits == "number" && s.serverMaxWindowBits > n.server_max_window_bits) || typeof s.clientMaxWindowBits == "number" && !n.client_max_window_bits));
          if (!r)
            throw new Error("None of the extension offers can be accepted");
          return s.serverNoContextTakeover && (r.server_no_context_takeover = true), s.clientNoContextTakeover && (r.client_no_context_takeover = true), typeof s.serverMaxWindowBits == "number" && (r.server_max_window_bits = s.serverMaxWindowBits), typeof s.clientMaxWindowBits == "number" ? r.client_max_window_bits = s.clientMaxWindowBits : (r.client_max_window_bits === true || s.clientMaxWindowBits === false) && delete r.client_max_window_bits, r;
        }
        acceptAsClient(e) {
          let s = e[0];
          if (this._options.clientNoContextTakeover === false && s.client_no_context_takeover)
            throw new Error('Unexpected parameter "client_no_context_takeover"');
          if (!s.client_max_window_bits)
            typeof this._options.clientMaxWindowBits == "number" && (s.client_max_window_bits = this._options.clientMaxWindowBits);
          else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits == "number" && s.client_max_window_bits > this._options.clientMaxWindowBits)
            throw new Error('Unexpected or invalid parameter "client_max_window_bits"');
          return s;
        }
        normalizeParams(e) {
          return e.forEach((s) => {
            Object.keys(s).forEach((r) => {
              let n = s[r];
              if (n.length > 1)
                throw new Error(`Parameter "${r}" must have only a single value`);
              if (n = n[0], r === "client_max_window_bits") {
                if (n !== true) {
                  let i = +n;
                  if (!Number.isInteger(i) || i < 8 || i > 15)
                    throw new TypeError(`Invalid value for parameter "${r}": ${n}`);
                  n = i;
                } else if (!this._isServer)
                  throw new TypeError(`Invalid value for parameter "${r}": ${n}`);
              } else if (r === "server_max_window_bits") {
                let i = +n;
                if (!Number.isInteger(i) || i < 8 || i > 15)
                  throw new TypeError(`Invalid value for parameter "${r}": ${n}`);
                n = i;
              } else if (r === "client_no_context_takeover" || r === "server_no_context_takeover") {
                if (n !== true)
                  throw new TypeError(`Invalid value for parameter "${r}": ${n}`);
              } else
                throw new Error(`Unknown parameter "${r}"`);
              s[r] = n;
            });
          }), e;
        }
        decompress(e, s, r) {
          de.add((n) => {
            this._decompress(e, s, (i, o) => {
              n(), r(i, o);
            });
          });
        }
        compress(e, s, r) {
          de.add((n) => {
            this._compress(e, s, (i, o) => {
              n(), r(i, o);
            });
          });
        }
        _decompress(e, s, r) {
          let n = this._isServer ? "client" : "server";
          if (!this._inflate) {
            let i = `${n}_max_window_bits`, o = typeof this.params[i] != "number" ? ne.Z_DEFAULT_WINDOWBITS : this.params[i];
            this._inflate = ne.createInflateRaw({ ...this._options.zlibInflateOptions, windowBits: o }), this._inflate[pe] = this, this._inflate[N] = 0, this._inflate[R] = [], this._inflate.on("error", Ts), this._inflate.on("data", lt);
          }
          this._inflate[K] = r, this._inflate.write(e), s && this._inflate.write(ws), this._inflate.flush(() => {
            let i = this._inflate[X];
            if (i) {
              this._inflate.close(), this._inflate = null, r(i);
              return;
            }
            let o = ot.concat(this._inflate[R], this._inflate[N]);
            this._inflate._readableState.endEmitted ? (this._inflate.close(), this._inflate = null) : (this._inflate[N] = 0, this._inflate[R] = [], s && this.params[`${n}_no_context_takeover`] && this._inflate.reset()), r(null, o);
          });
        }
        _compress(e, s, r) {
          let n = this._isServer ? "server" : "client";
          if (!this._deflate) {
            let i = `${n}_max_window_bits`, o = typeof this.params[i] != "number" ? ne.Z_DEFAULT_WINDOWBITS : this.params[i];
            this._deflate = ne.createDeflateRaw({ ...this._options.zlibDeflateOptions, windowBits: o }), this._deflate[N] = 0, this._deflate[R] = [], this._deflate.on("data", vs);
          }
          this._deflate[K] = r, this._deflate.write(e), this._deflate.flush(ne.Z_SYNC_FLUSH, () => {
            if (!this._deflate)
              return;
            let i = ot.concat(this._deflate[R], this._deflate[N]);
            s && (i = new bs(i.buffer, i.byteOffset, i.length - 4)), this._deflate[K] = null, this._deflate[N] = 0, this._deflate[R] = [], s && this.params[`${n}_no_context_takeover`] && this._deflate.reset(), r(null, i);
          });
        }
      };
      ct.exports = Ie;
      function vs(t) {
        this[R].push(t), this[N] += t.length;
      }
      function lt(t) {
        if (this[N] += t.length, this[pe]._maxPayload < 1 || this[N] <= this[pe]._maxPayload) {
          this[R].push(t);
          return;
        }
        this[X] = new RangeError("Max payload size exceeded"), this[X].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH", this[X][at] = 1009, this.removeListener("data", lt), this.reset();
      }
      function Ts(t) {
        if (this[pe]._inflate = null, this[X]) {
          this[K](this[X]);
          return;
        }
        t[at] = 1007, this[K](t);
      }
    });
    var J = b((pn, ge) => {
      "use strict";
      var { isUtf8: ft } = require("buffer"), { hasBlob: ks } = P(), Os = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0];
      function Ls(t) {
        return t >= 1e3 && t <= 1014 && t !== 1004 && t !== 1005 && t !== 1006 || t >= 3e3 && t <= 4999;
      }
      function Be(t) {
        let e = t.length, s = 0;
        for (; s < e; )
          if (!(t[s] & 128))
            s++;
          else if ((t[s] & 224) === 192) {
            if (s + 1 === e || (t[s + 1] & 192) !== 128 || (t[s] & 254) === 192)
              return false;
            s += 2;
          } else if ((t[s] & 240) === 224) {
            if (s + 2 >= e || (t[s + 1] & 192) !== 128 || (t[s + 2] & 192) !== 128 || t[s] === 224 && (t[s + 1] & 224) === 128 || t[s] === 237 && (t[s + 1] & 224) === 160)
              return false;
            s += 3;
          } else if ((t[s] & 248) === 240) {
            if (s + 3 >= e || (t[s + 1] & 192) !== 128 || (t[s + 2] & 192) !== 128 || (t[s + 3] & 192) !== 128 || t[s] === 240 && (t[s + 1] & 240) === 128 || t[s] === 244 && t[s + 1] > 143 || t[s] > 244)
              return false;
            s += 4;
          } else
            return false;
        return true;
      }
      function Cs(t) {
        return ks && typeof t == "object" && typeof t.arrayBuffer == "function" && typeof t.type == "string" && typeof t.stream == "function" && (t[Symbol.toStringTag] === "Blob" || t[Symbol.toStringTag] === "File");
      }
      ge.exports = { isBlob: Cs, isValidStatusCode: Ls, isValidUTF8: Be, tokenChars: Os };
      if (ft)
        ge.exports.isValidUTF8 = function(t) {
          return t.length < 24 ? Be(t) : ft(t);
        };
      else if (!process.env.WS_NO_UTF_8_VALIDATE)
        try {
          let t = require("utf-8-validate");
          ge.exports.isValidUTF8 = function(e) {
            return e.length < 32 ? Be(e) : t(e);
          };
        } catch {
        }
    });
    var qe = b((gn, mt) => {
      "use strict";
      var { Writable: Ps } = require("stream"), ht = ie(), { BINARY_TYPES: Ns, EMPTY_BUFFER: ut, kStatusCode: As, kWebSocket: Is } = P(), { concat: Re, toArrayBuffer: Bs, unmask: Rs } = re(), { isValidStatusCode: Ds, isValidUTF8: dt } = J(), _e2 = Buffer[Symbol.species], v = 0, pt = 1, gt = 2, _t2 = 3, De = 4, Me = 5, me = 6, Ue = class extends Ps {
        constructor(e = {}) {
          super(), this._allowSynchronousEvents = e.allowSynchronousEvents !== void 0 ? e.allowSynchronousEvents : true, this._binaryType = e.binaryType || Ns[0], this._extensions = e.extensions || {}, this._isServer = !!e.isServer, this._maxPayload = e.maxPayload | 0, this._skipUTF8Validation = !!e.skipUTF8Validation, this[Is] = void 0, this._bufferedBytes = 0, this._buffers = [], this._compressed = false, this._payloadLength = 0, this._mask = void 0, this._fragmented = 0, this._masked = false, this._fin = false, this._opcode = 0, this._totalPayloadLength = 0, this._messageLength = 0, this._fragments = [], this._errored = false, this._loop = false, this._state = v;
        }
        _write(e, s, r) {
          if (this._opcode === 8 && this._state == v)
            return r();
          this._bufferedBytes += e.length, this._buffers.push(e), this.startLoop(r);
        }
        consume(e) {
          if (this._bufferedBytes -= e, e === this._buffers[0].length)
            return this._buffers.shift();
          if (e < this._buffers[0].length) {
            let r = this._buffers[0];
            return this._buffers[0] = new _e2(r.buffer, r.byteOffset + e, r.length - e), new _e2(r.buffer, r.byteOffset, e);
          }
          let s = Buffer.allocUnsafe(e);
          do {
            let r = this._buffers[0], n = s.length - e;
            e >= r.length ? s.set(this._buffers.shift(), n) : (s.set(new Uint8Array(r.buffer, r.byteOffset, e), n), this._buffers[0] = new _e2(r.buffer, r.byteOffset + e, r.length - e)), e -= r.length;
          } while (e > 0);
          return s;
        }
        startLoop(e) {
          this._loop = true;
          do
            switch (this._state) {
              case v:
                this.getInfo(e);
                break;
              case pt:
                this.getPayloadLength16(e);
                break;
              case gt:
                this.getPayloadLength64(e);
                break;
              case _t2:
                this.getMask();
                break;
              case De:
                this.getData(e);
                break;
              case Me:
              case me:
                this._loop = false;
                return;
            }
          while (this._loop);
          this._errored || e();
        }
        getInfo(e) {
          if (this._bufferedBytes < 2) {
            this._loop = false;
            return;
          }
          let s = this.consume(2);
          if (s[0] & 48) {
            let n = this.createError(RangeError, "RSV2 and RSV3 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_2_3");
            e(n);
            return;
          }
          let r = (s[0] & 64) === 64;
          if (r && !this._extensions[ht.extensionName]) {
            let n = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
            e(n);
            return;
          }
          if (this._fin = (s[0] & 128) === 128, this._opcode = s[0] & 15, this._payloadLength = s[1] & 127, this._opcode === 0) {
            if (r) {
              let n = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
              e(n);
              return;
            }
            if (!this._fragmented) {
              let n = this.createError(RangeError, "invalid opcode 0", true, 1002, "WS_ERR_INVALID_OPCODE");
              e(n);
              return;
            }
            this._opcode = this._fragmented;
          } else if (this._opcode === 1 || this._opcode === 2) {
            if (this._fragmented) {
              let n = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
              e(n);
              return;
            }
            this._compressed = r;
          } else if (this._opcode > 7 && this._opcode < 11) {
            if (!this._fin) {
              let n = this.createError(RangeError, "FIN must be set", true, 1002, "WS_ERR_EXPECTED_FIN");
              e(n);
              return;
            }
            if (r) {
              let n = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
              e(n);
              return;
            }
            if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
              let n = this.createError(RangeError, `invalid payload length ${this._payloadLength}`, true, 1002, "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH");
              e(n);
              return;
            }
          } else {
            let n = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
            e(n);
            return;
          }
          if (!this._fin && !this._fragmented && (this._fragmented = this._opcode), this._masked = (s[1] & 128) === 128, this._isServer) {
            if (!this._masked) {
              let n = this.createError(RangeError, "MASK must be set", true, 1002, "WS_ERR_EXPECTED_MASK");
              e(n);
              return;
            }
          } else if (this._masked) {
            let n = this.createError(RangeError, "MASK must be clear", true, 1002, "WS_ERR_UNEXPECTED_MASK");
            e(n);
            return;
          }
          this._payloadLength === 126 ? this._state = pt : this._payloadLength === 127 ? this._state = gt : this.haveLength(e);
        }
        getPayloadLength16(e) {
          if (this._bufferedBytes < 2) {
            this._loop = false;
            return;
          }
          this._payloadLength = this.consume(2).readUInt16BE(0), this.haveLength(e);
        }
        getPayloadLength64(e) {
          if (this._bufferedBytes < 8) {
            this._loop = false;
            return;
          }
          let s = this.consume(8), r = s.readUInt32BE(0);
          if (r > Math.pow(2, 21) - 1) {
            let n = this.createError(RangeError, "Unsupported WebSocket frame: payload length > 2^53 - 1", false, 1009, "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH");
            e(n);
            return;
          }
          this._payloadLength = r * Math.pow(2, 32) + s.readUInt32BE(4), this.haveLength(e);
        }
        haveLength(e) {
          if (this._payloadLength && this._opcode < 8 && (this._totalPayloadLength += this._payloadLength, this._totalPayloadLength > this._maxPayload && this._maxPayload > 0)) {
            let s = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
            e(s);
            return;
          }
          this._masked ? this._state = _t2 : this._state = De;
        }
        getMask() {
          if (this._bufferedBytes < 4) {
            this._loop = false;
            return;
          }
          this._mask = this.consume(4), this._state = De;
        }
        getData(e) {
          let s = ut;
          if (this._payloadLength) {
            if (this._bufferedBytes < this._payloadLength) {
              this._loop = false;
              return;
            }
            s = this.consume(this._payloadLength), this._masked && this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3] && Rs(s, this._mask);
          }
          if (this._opcode > 7) {
            this.controlMessage(s, e);
            return;
          }
          if (this._compressed) {
            this._state = Me, this.decompress(s, e);
            return;
          }
          s.length && (this._messageLength = this._totalPayloadLength, this._fragments.push(s)), this.dataMessage(e);
        }
        decompress(e, s) {
          this._extensions[ht.extensionName].decompress(e, this._fin, (n, i) => {
            if (n)
              return s(n);
            if (i.length) {
              if (this._messageLength += i.length, this._messageLength > this._maxPayload && this._maxPayload > 0) {
                let o = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
                s(o);
                return;
              }
              this._fragments.push(i);
            }
            this.dataMessage(s), this._state === v && this.startLoop(s);
          });
        }
        dataMessage(e) {
          if (!this._fin) {
            this._state = v;
            return;
          }
          let s = this._messageLength, r = this._fragments;
          if (this._totalPayloadLength = 0, this._messageLength = 0, this._fragmented = 0, this._fragments = [], this._opcode === 2) {
            let n;
            this._binaryType === "nodebuffer" ? n = Re(r, s) : this._binaryType === "arraybuffer" ? n = Bs(Re(r, s)) : this._binaryType === "blob" ? n = new Blob(r) : n = r, this._allowSynchronousEvents ? (this.emit("message", n, true), this._state = v) : (this._state = me, setImmediate(() => {
              this.emit("message", n, true), this._state = v, this.startLoop(e);
            }));
          } else {
            let n = Re(r, s);
            if (!this._skipUTF8Validation && !dt(n)) {
              let i = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
              e(i);
              return;
            }
            this._state === Me || this._allowSynchronousEvents ? (this.emit("message", n, false), this._state = v) : (this._state = me, setImmediate(() => {
              this.emit("message", n, false), this._state = v, this.startLoop(e);
            }));
          }
        }
        controlMessage(e, s) {
          if (this._opcode === 8) {
            if (e.length === 0)
              this._loop = false, this.emit("conclude", 1005, ut), this.end();
            else {
              let r = e.readUInt16BE(0);
              if (!Ds(r)) {
                let i = this.createError(RangeError, `invalid status code ${r}`, true, 1002, "WS_ERR_INVALID_CLOSE_CODE");
                s(i);
                return;
              }
              let n = new _e2(e.buffer, e.byteOffset + 2, e.length - 2);
              if (!this._skipUTF8Validation && !dt(n)) {
                let i = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
                s(i);
                return;
              }
              this._loop = false, this.emit("conclude", r, n), this.end();
            }
            this._state = v;
            return;
          }
          this._allowSynchronousEvents ? (this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = v) : (this._state = me, setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = v, this.startLoop(s);
          }));
        }
        createError(e, s, r, n, i) {
          this._loop = false, this._errored = true;
          let o = new e(r ? `Invalid WebSocket frame: ${s}` : s);
          return Error.captureStackTrace(o, this.createError), o.code = i, o[As] = n, o;
        }
      };
      mt.exports = Ue;
    });
    var $e = b((mn, Et) => {
      "use strict";
      var { Duplex: _n } = require("stream"), { randomFillSync: Ms } = require("crypto"), yt = ie(), { EMPTY_BUFFER: Us, kWebSocket: qs, NOOP: Ws } = P(), { isBlob: Z, isValidStatusCode: Fs } = J(), { mask: St, toBuffer: W } = re(), T = Symbol("kByteLength"), $s = Buffer.alloc(4), ye = 8 * 1024, F, Q = ye, O = 0, js = 1, Gs = 2, We = class t {
        constructor(e, s, r) {
          this._extensions = s || {}, r && (this._generateMask = r, this._maskBuffer = Buffer.alloc(4)), this._socket = e, this._firstFragment = true, this._compress = false, this._bufferedBytes = 0, this._queue = [], this._state = O, this.onerror = Ws, this[qs] = void 0;
        }
        static frame(e, s) {
          let r, n = false, i = 2, o = false;
          s.mask && (r = s.maskBuffer || $s, s.generateMask ? s.generateMask(r) : (Q === ye && (F === void 0 && (F = Buffer.alloc(ye)), Ms(F, 0, ye), Q = 0), r[0] = F[Q++], r[1] = F[Q++], r[2] = F[Q++], r[3] = F[Q++]), o = (r[0] | r[1] | r[2] | r[3]) === 0, i = 6);
          let l;
          typeof e == "string" ? (!s.mask || o) && s[T] !== void 0 ? l = s[T] : (e = Buffer.from(e), l = e.length) : (l = e.length, n = s.mask && s.readOnly && !o);
          let c = l;
          l >= 65536 ? (i += 8, c = 127) : l > 125 && (i += 2, c = 126);
          let a = Buffer.allocUnsafe(n ? l + i : i);
          return a[0] = s.fin ? s.opcode | 128 : s.opcode, s.rsv1 && (a[0] |= 64), a[1] = c, c === 126 ? a.writeUInt16BE(l, 2) : c === 127 && (a[2] = a[3] = 0, a.writeUIntBE(l, 4, 6)), s.mask ? (a[1] |= 128, a[i - 4] = r[0], a[i - 3] = r[1], a[i - 2] = r[2], a[i - 1] = r[3], o ? [a, e] : n ? (St(e, r, a, i, l), [a]) : (St(e, r, e, 0, l), [a, e])) : [a, e];
        }
        close(e, s, r, n) {
          let i;
          if (e === void 0)
            i = Us;
          else {
            if (typeof e != "number" || !Fs(e))
              throw new TypeError("First argument must be a valid error code number");
            if (s === void 0 || !s.length)
              i = Buffer.allocUnsafe(2), i.writeUInt16BE(e, 0);
            else {
              let l = Buffer.byteLength(s);
              if (l > 123)
                throw new RangeError("The message must not be greater than 123 bytes");
              i = Buffer.allocUnsafe(2 + l), i.writeUInt16BE(e, 0), typeof s == "string" ? i.write(s, 2) : i.set(s, 2);
            }
          }
          let o = { [T]: i.length, fin: true, generateMask: this._generateMask, mask: r, maskBuffer: this._maskBuffer, opcode: 8, readOnly: false, rsv1: false };
          this._state !== O ? this.enqueue([this.dispatch, i, false, o, n]) : this.sendFrame(t.frame(i, o), n);
        }
        ping(e, s, r) {
          let n, i;
          if (typeof e == "string" ? (n = Buffer.byteLength(e), i = false) : Z(e) ? (n = e.size, i = false) : (e = W(e), n = e.length, i = W.readOnly), n > 125)
            throw new RangeError("The data size must not be greater than 125 bytes");
          let o = { [T]: n, fin: true, generateMask: this._generateMask, mask: s, maskBuffer: this._maskBuffer, opcode: 9, readOnly: i, rsv1: false };
          Z(e) ? this._state !== O ? this.enqueue([this.getBlobData, e, false, o, r]) : this.getBlobData(e, false, o, r) : this._state !== O ? this.enqueue([this.dispatch, e, false, o, r]) : this.sendFrame(t.frame(e, o), r);
        }
        pong(e, s, r) {
          let n, i;
          if (typeof e == "string" ? (n = Buffer.byteLength(e), i = false) : Z(e) ? (n = e.size, i = false) : (e = W(e), n = e.length, i = W.readOnly), n > 125)
            throw new RangeError("The data size must not be greater than 125 bytes");
          let o = { [T]: n, fin: true, generateMask: this._generateMask, mask: s, maskBuffer: this._maskBuffer, opcode: 10, readOnly: i, rsv1: false };
          Z(e) ? this._state !== O ? this.enqueue([this.getBlobData, e, false, o, r]) : this.getBlobData(e, false, o, r) : this._state !== O ? this.enqueue([this.dispatch, e, false, o, r]) : this.sendFrame(t.frame(e, o), r);
        }
        send(e, s, r) {
          let n = this._extensions[yt.extensionName], i = s.binary ? 2 : 1, o = s.compress, l, c;
          typeof e == "string" ? (l = Buffer.byteLength(e), c = false) : Z(e) ? (l = e.size, c = false) : (e = W(e), l = e.length, c = W.readOnly), this._firstFragment ? (this._firstFragment = false, o && n && n.params[n._isServer ? "server_no_context_takeover" : "client_no_context_takeover"] && (o = l >= n._threshold), this._compress = o) : (o = false, i = 0), s.fin && (this._firstFragment = true);
          let a = { [T]: l, fin: s.fin, generateMask: this._generateMask, mask: s.mask, maskBuffer: this._maskBuffer, opcode: i, readOnly: c, rsv1: o };
          Z(e) ? this._state !== O ? this.enqueue([this.getBlobData, e, this._compress, a, r]) : this.getBlobData(e, this._compress, a, r) : this._state !== O ? this.enqueue([this.dispatch, e, this._compress, a, r]) : this.dispatch(e, this._compress, a, r);
        }
        getBlobData(e, s, r, n) {
          this._bufferedBytes += r[T], this._state = Gs, e.arrayBuffer().then((i) => {
            if (this._socket.destroyed) {
              let l = new Error("The socket was closed while the blob was being read");
              process.nextTick(Fe, this, l, n);
              return;
            }
            this._bufferedBytes -= r[T];
            let o = W(i);
            s ? this.dispatch(o, s, r, n) : (this._state = O, this.sendFrame(t.frame(o, r), n), this.dequeue());
          }).catch((i) => {
            process.nextTick(Vs, this, i, n);
          });
        }
        dispatch(e, s, r, n) {
          if (!s) {
            this.sendFrame(t.frame(e, r), n);
            return;
          }
          let i = this._extensions[yt.extensionName];
          this._bufferedBytes += r[T], this._state = js, i.compress(e, r.fin, (o, l) => {
            if (this._socket.destroyed) {
              let c = new Error("The socket was closed while data was being compressed");
              Fe(this, c, n);
              return;
            }
            this._bufferedBytes -= r[T], this._state = O, r.readOnly = false, this.sendFrame(t.frame(l, r), n), this.dequeue();
          });
        }
        dequeue() {
          for (; this._state === O && this._queue.length; ) {
            let e = this._queue.shift();
            this._bufferedBytes -= e[3][T], Reflect.apply(e[0], this, e.slice(1));
          }
        }
        enqueue(e) {
          this._bufferedBytes += e[3][T], this._queue.push(e);
        }
        sendFrame(e, s) {
          e.length === 2 ? (this._socket.cork(), this._socket.write(e[0]), this._socket.write(e[1], s), this._socket.uncork()) : this._socket.write(e[0], s);
        }
      };
      Et.exports = We;
      function Fe(t, e, s) {
        typeof s == "function" && s(e);
        for (let r = 0; r < t._queue.length; r++) {
          let n = t._queue[r], i = n[n.length - 1];
          typeof i == "function" && i(e);
        }
      }
      function Vs(t, e, s) {
        Fe(t, e, s), t.onerror(e);
      }
    });
    var Ct = b((yn, Lt) => {
      "use strict";
      var { kForOnEventAttribute: oe, kListener: je } = P(), xt = Symbol("kCode"), bt = Symbol("kData"), wt = Symbol("kError"), vt = Symbol("kMessage"), Tt = Symbol("kReason"), ee = Symbol("kTarget"), kt = Symbol("kType"), Ot = Symbol("kWasClean"), A = class {
        constructor(e) {
          this[ee] = null, this[kt] = e;
        }
        get target() {
          return this[ee];
        }
        get type() {
          return this[kt];
        }
      };
      Object.defineProperty(A.prototype, "target", { enumerable: true });
      Object.defineProperty(A.prototype, "type", { enumerable: true });
      var $ = class extends A {
        constructor(e, s = {}) {
          super(e), this[xt] = s.code === void 0 ? 0 : s.code, this[Tt] = s.reason === void 0 ? "" : s.reason, this[Ot] = s.wasClean === void 0 ? false : s.wasClean;
        }
        get code() {
          return this[xt];
        }
        get reason() {
          return this[Tt];
        }
        get wasClean() {
          return this[Ot];
        }
      };
      Object.defineProperty($.prototype, "code", { enumerable: true });
      Object.defineProperty($.prototype, "reason", { enumerable: true });
      Object.defineProperty($.prototype, "wasClean", { enumerable: true });
      var te = class extends A {
        constructor(e, s = {}) {
          super(e), this[wt] = s.error === void 0 ? null : s.error, this[vt] = s.message === void 0 ? "" : s.message;
        }
        get error() {
          return this[wt];
        }
        get message() {
          return this[vt];
        }
      };
      Object.defineProperty(te.prototype, "error", { enumerable: true });
      Object.defineProperty(te.prototype, "message", { enumerable: true });
      var ae = class extends A {
        constructor(e, s = {}) {
          super(e), this[bt] = s.data === void 0 ? null : s.data;
        }
        get data() {
          return this[bt];
        }
      };
      Object.defineProperty(ae.prototype, "data", { enumerable: true });
      var zs = { addEventListener(t, e, s = {}) {
        for (let n of this.listeners(t))
          if (!s[oe] && n[je] === e && !n[oe])
            return;
        let r;
        if (t === "message")
          r = function(i, o) {
            let l = new ae("message", { data: o ? i : i.toString() });
            l[ee] = this, Se(e, this, l);
          };
        else if (t === "close")
          r = function(i, o) {
            let l = new $("close", { code: i, reason: o.toString(), wasClean: this._closeFrameReceived && this._closeFrameSent });
            l[ee] = this, Se(e, this, l);
          };
        else if (t === "error")
          r = function(i) {
            let o = new te("error", { error: i, message: i.message });
            o[ee] = this, Se(e, this, o);
          };
        else if (t === "open")
          r = function() {
            let i = new A("open");
            i[ee] = this, Se(e, this, i);
          };
        else
          return;
        r[oe] = !!s[oe], r[je] = e, s.once ? this.once(t, r) : this.on(t, r);
      }, removeEventListener(t, e) {
        for (let s of this.listeners(t))
          if (s[je] === e && !s[oe]) {
            this.removeListener(t, s);
            break;
          }
      } };
      Lt.exports = { CloseEvent: $, ErrorEvent: te, Event: A, EventTarget: zs, MessageEvent: ae };
      function Se(t, e, s) {
        typeof t == "object" && t.handleEvent ? t.handleEvent.call(t, s) : t.call(e, s);
      }
    });
    var Ge = b((Sn, Pt) => {
      "use strict";
      var { tokenChars: le } = J();
      function L(t, e, s) {
        t[e] === void 0 ? t[e] = [s] : t[e].push(s);
      }
      function Hs(t) {
        let e = /* @__PURE__ */ Object.create(null), s = /* @__PURE__ */ Object.create(null), r = false, n = false, i = false, o, l, c = -1, a = -1, f = -1, h = 0;
        for (; h < t.length; h++)
          if (a = t.charCodeAt(h), o === void 0)
            if (f === -1 && le[a] === 1)
              c === -1 && (c = h);
            else if (h !== 0 && (a === 32 || a === 9))
              f === -1 && c !== -1 && (f = h);
            else if (a === 59 || a === 44) {
              if (c === -1)
                throw new SyntaxError(`Unexpected character at index ${h}`);
              f === -1 && (f = h);
              let _ = t.slice(c, f);
              a === 44 ? (L(e, _, s), s = /* @__PURE__ */ Object.create(null)) : o = _, c = f = -1;
            } else
              throw new SyntaxError(`Unexpected character at index ${h}`);
          else if (l === void 0)
            if (f === -1 && le[a] === 1)
              c === -1 && (c = h);
            else if (a === 32 || a === 9)
              f === -1 && c !== -1 && (f = h);
            else if (a === 59 || a === 44) {
              if (c === -1)
                throw new SyntaxError(`Unexpected character at index ${h}`);
              f === -1 && (f = h), L(s, t.slice(c, f), true), a === 44 && (L(e, o, s), s = /* @__PURE__ */ Object.create(null), o = void 0), c = f = -1;
            } else if (a === 61 && c !== -1 && f === -1)
              l = t.slice(c, h), c = f = -1;
            else
              throw new SyntaxError(`Unexpected character at index ${h}`);
          else if (n) {
            if (le[a] !== 1)
              throw new SyntaxError(`Unexpected character at index ${h}`);
            c === -1 ? c = h : r || (r = true), n = false;
          } else if (i)
            if (le[a] === 1)
              c === -1 && (c = h);
            else if (a === 34 && c !== -1)
              i = false, f = h;
            else if (a === 92)
              n = true;
            else
              throw new SyntaxError(`Unexpected character at index ${h}`);
          else if (a === 34 && t.charCodeAt(h - 1) === 61)
            i = true;
          else if (f === -1 && le[a] === 1)
            c === -1 && (c = h);
          else if (c !== -1 && (a === 32 || a === 9))
            f === -1 && (f = h);
          else if (a === 59 || a === 44) {
            if (c === -1)
              throw new SyntaxError(`Unexpected character at index ${h}`);
            f === -1 && (f = h);
            let _ = t.slice(c, f);
            r && (_ = _.replace(/\\/g, ""), r = false), L(s, l, _), a === 44 && (L(e, o, s), s = /* @__PURE__ */ Object.create(null), o = void 0), l = void 0, c = f = -1;
          } else
            throw new SyntaxError(`Unexpected character at index ${h}`);
        if (c === -1 || i || a === 32 || a === 9)
          throw new SyntaxError("Unexpected end of input");
        f === -1 && (f = h);
        let p = t.slice(c, f);
        return o === void 0 ? L(e, p, s) : (l === void 0 ? L(s, p, true) : r ? L(s, l, p.replace(/\\/g, "")) : L(s, l, p), L(e, o, s)), e;
      }
      function Ys(t) {
        return Object.keys(t).map((e) => {
          let s = t[e];
          return Array.isArray(s) || (s = [s]), s.map((r) => [e].concat(Object.keys(r).map((n) => {
            let i = r[n];
            return Array.isArray(i) || (i = [i]), i.map((o) => o === true ? n : `${n}=${o}`).join("; ");
          })).join("; ")).join(", ");
        }).join(", ");
      }
      Pt.exports = { format: Ys, parse: Hs };
    });
    var we = b((bn, $t) => {
      "use strict";
      var Ks = require("events"), Xs = require("https"), Js = require("http"), It = require("net"), Zs = require("tls"), { randomBytes: Qs, createHash: er } = require("crypto"), { Duplex: En, Readable: xn } = require("stream"), { URL: Ve } = require("url"), D = ie(), tr = qe(), sr = $e(), { isBlob: rr } = J(), { BINARY_TYPES: Nt, EMPTY_BUFFER: Ee, GUID: nr, kForOnEventAttribute: ze, kListener: ir, kStatusCode: or, kWebSocket: S, NOOP: Bt } = P(), { EventTarget: { addEventListener: ar, removeEventListener: lr } } = Ct(), { format: cr, parse: fr } = Ge(), { toBuffer: hr } = re(), ur = 30 * 1e3, Rt = Symbol("kAborted"), He = [8, 13], I = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"], dr = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/, g = class t extends Ks {
        constructor(e, s, r) {
          super(), this._binaryType = Nt[0], this._closeCode = 1006, this._closeFrameReceived = false, this._closeFrameSent = false, this._closeMessage = Ee, this._closeTimer = null, this._errorEmitted = false, this._extensions = {}, this._paused = false, this._protocol = "", this._readyState = t.CONNECTING, this._receiver = null, this._sender = null, this._socket = null, e !== null ? (this._bufferedAmount = 0, this._isServer = false, this._redirects = 0, s === void 0 ? s = [] : Array.isArray(s) || (typeof s == "object" && s !== null ? (r = s, s = []) : s = [s]), Dt(this, e, s, r)) : (this._autoPong = r.autoPong, this._isServer = true);
        }
        get binaryType() {
          return this._binaryType;
        }
        set binaryType(e) {
          Nt.includes(e) && (this._binaryType = e, this._receiver && (this._receiver._binaryType = e));
        }
        get bufferedAmount() {
          return this._socket ? this._socket._writableState.length + this._sender._bufferedBytes : this._bufferedAmount;
        }
        get extensions() {
          return Object.keys(this._extensions).join();
        }
        get isPaused() {
          return this._paused;
        }
        get onclose() {
          return null;
        }
        get onerror() {
          return null;
        }
        get onopen() {
          return null;
        }
        get onmessage() {
          return null;
        }
        get protocol() {
          return this._protocol;
        }
        get readyState() {
          return this._readyState;
        }
        get url() {
          return this._url;
        }
        setSocket(e, s, r) {
          let n = new tr({ allowSynchronousEvents: r.allowSynchronousEvents, binaryType: this.binaryType, extensions: this._extensions, isServer: this._isServer, maxPayload: r.maxPayload, skipUTF8Validation: r.skipUTF8Validation }), i = new sr(e, this._extensions, r.generateMask);
          this._receiver = n, this._sender = i, this._socket = e, n[S] = this, i[S] = this, e[S] = this, n.on("conclude", _r), n.on("drain", mr), n.on("error", yr), n.on("message", Sr), n.on("ping", Er), n.on("pong", xr), i.onerror = br, e.setTimeout && e.setTimeout(0), e.setNoDelay && e.setNoDelay(), s.length > 0 && e.unshift(s), e.on("close", qt), e.on("data", be), e.on("end", Wt), e.on("error", Ft), this._readyState = t.OPEN, this.emit("open");
        }
        emitClose() {
          if (!this._socket) {
            this._readyState = t.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
            return;
          }
          this._extensions[D.extensionName] && this._extensions[D.extensionName].cleanup(), this._receiver.removeAllListeners(), this._readyState = t.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
        }
        close(e, s) {
          if (this.readyState !== t.CLOSED) {
            if (this.readyState === t.CONNECTING) {
              w(this, this._req, "WebSocket was closed before the connection was established");
              return;
            }
            if (this.readyState === t.CLOSING) {
              this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end();
              return;
            }
            this._readyState = t.CLOSING, this._sender.close(e, s, !this._isServer, (r) => {
              r || (this._closeFrameSent = true, (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end());
            }), Ut(this);
          }
        }
        pause() {
          this.readyState === t.CONNECTING || this.readyState === t.CLOSED || (this._paused = true, this._socket.pause());
        }
        ping(e, s, r) {
          if (this.readyState === t.CONNECTING)
            throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
          if (typeof e == "function" ? (r = e, e = s = void 0) : typeof s == "function" && (r = s, s = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== t.OPEN) {
            Ye(this, e, r);
            return;
          }
          s === void 0 && (s = !this._isServer), this._sender.ping(e || Ee, s, r);
        }
        pong(e, s, r) {
          if (this.readyState === t.CONNECTING)
            throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
          if (typeof e == "function" ? (r = e, e = s = void 0) : typeof s == "function" && (r = s, s = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== t.OPEN) {
            Ye(this, e, r);
            return;
          }
          s === void 0 && (s = !this._isServer), this._sender.pong(e || Ee, s, r);
        }
        resume() {
          this.readyState === t.CONNECTING || this.readyState === t.CLOSED || (this._paused = false, this._receiver._writableState.needDrain || this._socket.resume());
        }
        send(e, s, r) {
          if (this.readyState === t.CONNECTING)
            throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
          if (typeof s == "function" && (r = s, s = {}), typeof e == "number" && (e = e.toString()), this.readyState !== t.OPEN) {
            Ye(this, e, r);
            return;
          }
          let n = { binary: typeof e != "string", mask: !this._isServer, compress: true, fin: true, ...s };
          this._extensions[D.extensionName] || (n.compress = false), this._sender.send(e || Ee, n, r);
        }
        terminate() {
          if (this.readyState !== t.CLOSED) {
            if (this.readyState === t.CONNECTING) {
              w(this, this._req, "WebSocket was closed before the connection was established");
              return;
            }
            this._socket && (this._readyState = t.CLOSING, this._socket.destroy());
          }
        }
      };
      Object.defineProperty(g, "CONNECTING", { enumerable: true, value: I.indexOf("CONNECTING") });
      Object.defineProperty(g.prototype, "CONNECTING", { enumerable: true, value: I.indexOf("CONNECTING") });
      Object.defineProperty(g, "OPEN", { enumerable: true, value: I.indexOf("OPEN") });
      Object.defineProperty(g.prototype, "OPEN", { enumerable: true, value: I.indexOf("OPEN") });
      Object.defineProperty(g, "CLOSING", { enumerable: true, value: I.indexOf("CLOSING") });
      Object.defineProperty(g.prototype, "CLOSING", { enumerable: true, value: I.indexOf("CLOSING") });
      Object.defineProperty(g, "CLOSED", { enumerable: true, value: I.indexOf("CLOSED") });
      Object.defineProperty(g.prototype, "CLOSED", { enumerable: true, value: I.indexOf("CLOSED") });
      ["binaryType", "bufferedAmount", "extensions", "isPaused", "protocol", "readyState", "url"].forEach((t) => {
        Object.defineProperty(g.prototype, t, { enumerable: true });
      });
      ["open", "error", "close", "message"].forEach((t) => {
        Object.defineProperty(g.prototype, `on${t}`, { enumerable: true, get() {
          for (let e of this.listeners(t))
            if (e[ze])
              return e[ir];
          return null;
        }, set(e) {
          for (let s of this.listeners(t))
            if (s[ze]) {
              this.removeListener(t, s);
              break;
            }
          typeof e == "function" && this.addEventListener(t, e, { [ze]: true });
        } });
      });
      g.prototype.addEventListener = ar;
      g.prototype.removeEventListener = lr;
      $t.exports = g;
      function Dt(t, e, s, r) {
        let n = { allowSynchronousEvents: true, autoPong: true, protocolVersion: He[1], maxPayload: 104857600, skipUTF8Validation: false, perMessageDeflate: true, followRedirects: false, maxRedirects: 10, ...r, socketPath: void 0, hostname: void 0, protocol: void 0, timeout: void 0, method: "GET", host: void 0, path: void 0, port: void 0 };
        if (t._autoPong = n.autoPong, !He.includes(n.protocolVersion))
          throw new RangeError(`Unsupported protocol version: ${n.protocolVersion} (supported versions: ${He.join(", ")})`);
        let i;
        if (e instanceof Ve)
          i = e;
        else
          try {
            i = new Ve(e);
          } catch {
            throw new SyntaxError(`Invalid URL: ${e}`);
          }
        i.protocol === "http:" ? i.protocol = "ws:" : i.protocol === "https:" && (i.protocol = "wss:"), t._url = i.href;
        let o = i.protocol === "wss:", l = i.protocol === "ws+unix:", c;
        if (i.protocol !== "ws:" && !o && !l ? c = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"` : l && !i.pathname ? c = "The URL's pathname is empty" : i.hash && (c = "The URL contains a fragment identifier"), c) {
          let u = new SyntaxError(c);
          if (t._redirects === 0)
            throw u;
          xe(t, u);
          return;
        }
        let a = o ? 443 : 80, f = Qs(16).toString("base64"), h = o ? Xs.request : Js.request, p = /* @__PURE__ */ new Set(), _;
        if (n.createConnection = n.createConnection || (o ? gr : pr), n.defaultPort = n.defaultPort || a, n.port = i.port || a, n.host = i.hostname.startsWith("[") ? i.hostname.slice(1, -1) : i.hostname, n.headers = { ...n.headers, "Sec-WebSocket-Version": n.protocolVersion, "Sec-WebSocket-Key": f, Connection: "Upgrade", Upgrade: "websocket" }, n.path = i.pathname + i.search, n.timeout = n.handshakeTimeout, n.perMessageDeflate && (_ = new D(n.perMessageDeflate !== true ? n.perMessageDeflate : {}, false, n.maxPayload), n.headers["Sec-WebSocket-Extensions"] = cr({ [D.extensionName]: _.offer() })), s.length) {
          for (let u of s) {
            if (typeof u != "string" || !dr.test(u) || p.has(u))
              throw new SyntaxError("An invalid or duplicated subprotocol was specified");
            p.add(u);
          }
          n.headers["Sec-WebSocket-Protocol"] = s.join(",");
        }
        if (n.origin && (n.protocolVersion < 13 ? n.headers["Sec-WebSocket-Origin"] = n.origin : n.headers.Origin = n.origin), (i.username || i.password) && (n.auth = `${i.username}:${i.password}`), l) {
          let u = n.path.split(":");
          n.socketPath = u[0], n.path = u[1];
        }
        let m;
        if (n.followRedirects) {
          if (t._redirects === 0) {
            t._originalIpc = l, t._originalSecure = o, t._originalHostOrSocketPath = l ? n.socketPath : i.host;
            let u = r && r.headers;
            if (r = { ...r, headers: {} }, u)
              for (let [y, B] of Object.entries(u))
                r.headers[y.toLowerCase()] = B;
          } else if (t.listenerCount("redirect") === 0) {
            let u = l ? t._originalIpc ? n.socketPath === t._originalHostOrSocketPath : false : t._originalIpc ? false : i.host === t._originalHostOrSocketPath;
            (!u || t._originalSecure && !o) && (delete n.headers.authorization, delete n.headers.cookie, u || delete n.headers.host, n.auth = void 0);
          }
          n.auth && !r.headers.authorization && (r.headers.authorization = "Basic " + Buffer.from(n.auth).toString("base64")), m = t._req = h(n), t._redirects && t.emit("redirect", t.url, m);
        } else
          m = t._req = h(n);
        n.timeout && m.on("timeout", () => {
          w(t, m, "Opening handshake has timed out");
        }), m.on("error", (u) => {
          m === null || m[Rt] || (m = t._req = null, xe(t, u));
        }), m.on("response", (u) => {
          let y = u.headers.location, B = u.statusCode;
          if (y && n.followRedirects && B >= 300 && B < 400) {
            if (++t._redirects > n.maxRedirects) {
              w(t, m, "Maximum redirects exceeded");
              return;
            }
            m.abort();
            let d;
            try {
              d = new Ve(y, e);
            } catch {
              let q = new SyntaxError(`Invalid URL: ${y}`);
              xe(t, q);
              return;
            }
            Dt(t, d, s, r);
          } else
            t.emit("unexpected-response", m, u) || w(t, m, `Unexpected server response: ${u.statusCode}`);
        }), m.on("upgrade", (u, y, B) => {
          if (t.emit("upgrade", u), t.readyState !== g.CONNECTING)
            return;
          m = t._req = null;
          let d = u.headers.upgrade;
          if (d === void 0 || d.toLowerCase() !== "websocket") {
            w(t, y, "Invalid Upgrade header");
            return;
          }
          let Le = er("sha1").update(f + nr).digest("base64");
          if (u.headers["sec-websocket-accept"] !== Le) {
            w(t, y, "Invalid Sec-WebSocket-Accept header");
            return;
          }
          let q = u.headers["sec-websocket-protocol"], C;
          if (q !== void 0 ? p.size ? p.has(q) || (C = "Server sent an invalid subprotocol") : C = "Server sent a subprotocol but none was requested" : p.size && (C = "Server sent no subprotocol"), C) {
            w(t, y, C);
            return;
          }
          q && (t._protocol = q);
          let E = u.headers["sec-websocket-extensions"];
          if (E !== void 0) {
            if (!_) {
              w(t, y, "Server sent a Sec-WebSocket-Extensions header but no extension was requested");
              return;
            }
            let x;
            try {
              x = fr(E);
            } catch {
              w(t, y, "Invalid Sec-WebSocket-Extensions header");
              return;
            }
            let z = Object.keys(x);
            if (z.length !== 1 || z[0] !== D.extensionName) {
              w(t, y, "Server indicated an extension that was not requested");
              return;
            }
            try {
              _.accept(x[D.extensionName]);
            } catch {
              w(t, y, "Invalid Sec-WebSocket-Extensions header");
              return;
            }
            t._extensions[D.extensionName] = _;
          }
          t.setSocket(y, B, { allowSynchronousEvents: n.allowSynchronousEvents, generateMask: n.generateMask, maxPayload: n.maxPayload, skipUTF8Validation: n.skipUTF8Validation });
        }), n.finishRequest ? n.finishRequest(m, t) : m.end();
      }
      function xe(t, e) {
        t._readyState = g.CLOSING, t._errorEmitted = true, t.emit("error", e), t.emitClose();
      }
      function pr(t) {
        return t.path = t.socketPath, It.connect(t);
      }
      function gr(t) {
        return t.path = void 0, !t.servername && t.servername !== "" && (t.servername = It.isIP(t.host) ? "" : t.host), Zs.connect(t);
      }
      function w(t, e, s) {
        t._readyState = g.CLOSING;
        let r = new Error(s);
        Error.captureStackTrace(r, w), e.setHeader ? (e[Rt] = true, e.abort(), e.socket && !e.socket.destroyed && e.socket.destroy(), process.nextTick(xe, t, r)) : (e.destroy(r), e.once("error", t.emit.bind(t, "error")), e.once("close", t.emitClose.bind(t)));
      }
      function Ye(t, e, s) {
        if (e) {
          let r = rr(e) ? e.size : hr(e).length;
          t._socket ? t._sender._bufferedBytes += r : t._bufferedAmount += r;
        }
        if (s) {
          let r = new Error(`WebSocket is not open: readyState ${t.readyState} (${I[t.readyState]})`);
          process.nextTick(s, r);
        }
      }
      function _r(t, e) {
        let s = this[S];
        s._closeFrameReceived = true, s._closeMessage = e, s._closeCode = t, s._socket[S] !== void 0 && (s._socket.removeListener("data", be), process.nextTick(Mt, s._socket), t === 1005 ? s.close() : s.close(t, e));
      }
      function mr() {
        let t = this[S];
        t.isPaused || t._socket.resume();
      }
      function yr(t) {
        let e = this[S];
        e._socket[S] !== void 0 && (e._socket.removeListener("data", be), process.nextTick(Mt, e._socket), e.close(t[or])), e._errorEmitted || (e._errorEmitted = true, e.emit("error", t));
      }
      function At() {
        this[S].emitClose();
      }
      function Sr(t, e) {
        this[S].emit("message", t, e);
      }
      function Er(t) {
        let e = this[S];
        e._autoPong && e.pong(t, !this._isServer, Bt), e.emit("ping", t);
      }
      function xr(t) {
        this[S].emit("pong", t);
      }
      function Mt(t) {
        t.resume();
      }
      function br(t) {
        let e = this[S];
        e.readyState !== g.CLOSED && (e.readyState === g.OPEN && (e._readyState = g.CLOSING, Ut(e)), this._socket.end(), e._errorEmitted || (e._errorEmitted = true, e.emit("error", t)));
      }
      function Ut(t) {
        t._closeTimer = setTimeout(t._socket.destroy.bind(t._socket), ur);
      }
      function qt() {
        let t = this[S];
        this.removeListener("close", qt), this.removeListener("data", be), this.removeListener("end", Wt), t._readyState = g.CLOSING;
        let e;
        !this._readableState.endEmitted && !t._closeFrameReceived && !t._receiver._writableState.errorEmitted && (e = t._socket.read()) !== null && t._receiver.write(e), t._receiver.end(), this[S] = void 0, clearTimeout(t._closeTimer), t._receiver._writableState.finished || t._receiver._writableState.errorEmitted ? t.emitClose() : (t._receiver.on("error", At), t._receiver.on("finish", At));
      }
      function be(t) {
        this[S]._receiver.write(t) || this.pause();
      }
      function Wt() {
        let t = this[S];
        t._readyState = g.CLOSING, t._receiver.end(), this.end();
      }
      function Ft() {
        let t = this[S];
        this.removeListener("error", Ft), this.on("error", Bt), t && (t._readyState = g.CLOSING, this.destroy());
      }
    });
    var zt = b((vn, Vt) => {
      "use strict";
      var wn = we(), { Duplex: wr } = require("stream");
      function jt(t) {
        t.emit("close");
      }
      function vr() {
        !this.destroyed && this._writableState.finished && this.destroy();
      }
      function Gt(t) {
        this.removeListener("error", Gt), this.destroy(), this.listenerCount("error") === 0 && this.emit("error", t);
      }
      function Tr(t, e) {
        let s = true, r = new wr({ ...e, autoDestroy: false, emitClose: false, objectMode: false, writableObjectMode: false });
        return t.on("message", function(i, o) {
          let l = !o && r._readableState.objectMode ? i.toString() : i;
          r.push(l) || t.pause();
        }), t.once("error", function(i) {
          r.destroyed || (s = false, r.destroy(i));
        }), t.once("close", function() {
          r.destroyed || r.push(null);
        }), r._destroy = function(n, i) {
          if (t.readyState === t.CLOSED) {
            i(n), process.nextTick(jt, r);
            return;
          }
          let o = false;
          t.once("error", function(c) {
            o = true, i(c);
          }), t.once("close", function() {
            o || i(n), process.nextTick(jt, r);
          }), s && t.terminate();
        }, r._final = function(n) {
          if (t.readyState === t.CONNECTING) {
            t.once("open", function() {
              r._final(n);
            });
            return;
          }
          t._socket !== null && (t._socket._writableState.finished ? (n(), r._readableState.endEmitted && r.destroy()) : (t._socket.once("finish", function() {
            n();
          }), t.close()));
        }, r._read = function() {
          t.isPaused && t.resume();
        }, r._write = function(n, i, o) {
          if (t.readyState === t.CONNECTING) {
            t.once("open", function() {
              r._write(n, i, o);
            });
            return;
          }
          t.send(n, o);
        }, r.on("end", vr), r.on("error", Gt), r;
      }
      Vt.exports = Tr;
    });
    var Yt = b((Tn, Ht) => {
      "use strict";
      var { tokenChars: kr } = J();
      function Or(t) {
        let e = /* @__PURE__ */ new Set(), s = -1, r = -1, n = 0;
        for (n; n < t.length; n++) {
          let o = t.charCodeAt(n);
          if (r === -1 && kr[o] === 1)
            s === -1 && (s = n);
          else if (n !== 0 && (o === 32 || o === 9))
            r === -1 && s !== -1 && (r = n);
          else if (o === 44) {
            if (s === -1)
              throw new SyntaxError(`Unexpected character at index ${n}`);
            r === -1 && (r = n);
            let l = t.slice(s, r);
            if (e.has(l))
              throw new SyntaxError(`The "${l}" subprotocol is duplicated`);
            e.add(l), s = r = -1;
          } else
            throw new SyntaxError(`Unexpected character at index ${n}`);
        }
        if (s === -1 || r !== -1)
          throw new SyntaxError("Unexpected end of input");
        let i = t.slice(s, n);
        if (e.has(i))
          throw new SyntaxError(`The "${i}" subprotocol is duplicated`);
        return e.add(i), e;
      }
      Ht.exports = { parse: Or };
    });
    var ts = b((On, es) => {
      "use strict";
      var Lr = require("events"), ve = require("http"), { Duplex: kn } = require("stream"), { createHash: Cr } = require("crypto"), Kt = Ge(), j = ie(), Pr = Yt(), Nr = we(), { GUID: Ar, kWebSocket: Ir } = P(), Br = /^[+/0-9A-Za-z]{22}==$/, Xt = 0, Jt = 1, Qt = 2, Ke = class extends Lr {
        constructor(e, s) {
          if (super(), e = { allowSynchronousEvents: true, autoPong: true, maxPayload: 100 * 1024 * 1024, skipUTF8Validation: false, perMessageDeflate: false, handleProtocols: null, clientTracking: true, verifyClient: null, noServer: false, backlog: null, server: null, host: null, path: null, port: null, WebSocket: Nr, ...e }, e.port == null && !e.server && !e.noServer || e.port != null && (e.server || e.noServer) || e.server && e.noServer)
            throw new TypeError('One and only one of the "port", "server", or "noServer" options must be specified');
          if (e.port != null ? (this._server = ve.createServer((r, n) => {
            let i = ve.STATUS_CODES[426];
            n.writeHead(426, { "Content-Length": i.length, "Content-Type": "text/plain" }), n.end(i);
          }), this._server.listen(e.port, e.host, e.backlog, s)) : e.server && (this._server = e.server), this._server) {
            let r = this.emit.bind(this, "connection");
            this._removeListeners = Rr(this._server, { listening: this.emit.bind(this, "listening"), error: this.emit.bind(this, "error"), upgrade: (n, i, o) => {
              this.handleUpgrade(n, i, o, r);
            } });
          }
          e.perMessageDeflate === true && (e.perMessageDeflate = {}), e.clientTracking && (this.clients = /* @__PURE__ */ new Set(), this._shouldEmitClose = false), this.options = e, this._state = Xt;
        }
        address() {
          if (this.options.noServer)
            throw new Error('The server is operating in "noServer" mode');
          return this._server ? this._server.address() : null;
        }
        close(e) {
          if (this._state === Qt) {
            e && this.once("close", () => {
              e(new Error("The server is not running"));
            }), process.nextTick(ce, this);
            return;
          }
          if (e && this.once("close", e), this._state !== Jt)
            if (this._state = Jt, this.options.noServer || this.options.server)
              this._server && (this._removeListeners(), this._removeListeners = this._server = null), this.clients ? this.clients.size ? this._shouldEmitClose = true : process.nextTick(ce, this) : process.nextTick(ce, this);
            else {
              let s = this._server;
              this._removeListeners(), this._removeListeners = this._server = null, s.close(() => {
                ce(this);
              });
            }
        }
        shouldHandle(e) {
          if (this.options.path) {
            let s = e.url.indexOf("?");
            if ((s !== -1 ? e.url.slice(0, s) : e.url) !== this.options.path)
              return false;
          }
          return true;
        }
        handleUpgrade(e, s, r, n) {
          s.on("error", Zt);
          let i = e.headers["sec-websocket-key"], o = e.headers.upgrade, l = +e.headers["sec-websocket-version"];
          if (e.method !== "GET") {
            G(this, e, s, 405, "Invalid HTTP method");
            return;
          }
          if (o === void 0 || o.toLowerCase() !== "websocket") {
            G(this, e, s, 400, "Invalid Upgrade header");
            return;
          }
          if (i === void 0 || !Br.test(i)) {
            G(this, e, s, 400, "Missing or invalid Sec-WebSocket-Key header");
            return;
          }
          if (l !== 13 && l !== 8) {
            G(this, e, s, 400, "Missing or invalid Sec-WebSocket-Version header", { "Sec-WebSocket-Version": "13, 8" });
            return;
          }
          if (!this.shouldHandle(e)) {
            fe(s, 400);
            return;
          }
          let c = e.headers["sec-websocket-protocol"], a = /* @__PURE__ */ new Set();
          if (c !== void 0)
            try {
              a = Pr.parse(c);
            } catch {
              G(this, e, s, 400, "Invalid Sec-WebSocket-Protocol header");
              return;
            }
          let f = e.headers["sec-websocket-extensions"], h = {};
          if (this.options.perMessageDeflate && f !== void 0) {
            let p = new j(this.options.perMessageDeflate, true, this.options.maxPayload);
            try {
              let _ = Kt.parse(f);
              _[j.extensionName] && (p.accept(_[j.extensionName]), h[j.extensionName] = p);
            } catch {
              G(this, e, s, 400, "Invalid or unacceptable Sec-WebSocket-Extensions header");
              return;
            }
          }
          if (this.options.verifyClient) {
            let p = { origin: e.headers[`${l === 8 ? "sec-websocket-origin" : "origin"}`], secure: !!(e.socket.authorized || e.socket.encrypted), req: e };
            if (this.options.verifyClient.length === 2) {
              this.options.verifyClient(p, (_, m, u, y) => {
                if (!_)
                  return fe(s, m || 401, u, y);
                this.completeUpgrade(h, i, a, e, s, r, n);
              });
              return;
            }
            if (!this.options.verifyClient(p))
              return fe(s, 401);
          }
          this.completeUpgrade(h, i, a, e, s, r, n);
        }
        completeUpgrade(e, s, r, n, i, o, l) {
          if (!i.readable || !i.writable)
            return i.destroy();
          if (i[Ir])
            throw new Error("server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration");
          if (this._state > Xt)
            return fe(i, 503);
          let a = ["HTTP/1.1 101 Switching Protocols", "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Accept: ${Cr("sha1").update(s + Ar).digest("base64")}`], f = new this.options.WebSocket(null, void 0, this.options);
          if (r.size) {
            let h = this.options.handleProtocols ? this.options.handleProtocols(r, n) : r.values().next().value;
            h && (a.push(`Sec-WebSocket-Protocol: ${h}`), f._protocol = h);
          }
          if (e[j.extensionName]) {
            let h = e[j.extensionName].params, p = Kt.format({ [j.extensionName]: [h] });
            a.push(`Sec-WebSocket-Extensions: ${p}`), f._extensions = e;
          }
          this.emit("headers", a, n), i.write(a.concat(`\r
`).join(`\r
`)), i.removeListener("error", Zt), f.setSocket(i, o, { allowSynchronousEvents: this.options.allowSynchronousEvents, maxPayload: this.options.maxPayload, skipUTF8Validation: this.options.skipUTF8Validation }), this.clients && (this.clients.add(f), f.on("close", () => {
            this.clients.delete(f), this._shouldEmitClose && !this.clients.size && process.nextTick(ce, this);
          })), l(f, n);
        }
      };
      es.exports = Ke;
      function Rr(t, e) {
        for (let s of Object.keys(e))
          t.on(s, e[s]);
        return function() {
          for (let r of Object.keys(e))
            t.removeListener(r, e[r]);
        };
      }
      function ce(t) {
        t._state = Qt, t.emit("close");
      }
      function Zt() {
        this.destroy();
      }
      function fe(t, e, s, r) {
        s = s || ve.STATUS_CODES[e], r = { Connection: "close", "Content-Type": "text/html", "Content-Length": Buffer.byteLength(s), ...r }, t.once("finish", t.destroy), t.end(`HTTP/1.1 ${e} ${ve.STATUS_CODES[e]}\r
` + Object.keys(r).map((n) => `${n}: ${r[n]}`).join(`\r
`) + `\r
\r
` + s);
      }
      function G(t, e, s, r, n, i) {
        if (t.listenerCount("wsClientError")) {
          let o = new Error(n);
          Error.captureStackTrace(o, G), t.emit("wsClientError", o, s, e);
        } else
          fe(s, r, n, i);
      }
    });
    var ln = {};
    _s(ln, { PagesAI: () => Oe, buildApiMeta: () => en });
    module.exports = ms(ln);
    var Dr = Y(zt(), 1), Mr = Y(qe(), 1), Ur = Y($e(), 1), ss = Y(we(), 1), qr = Y(ts(), 1);
    var rs = ss.default;
    var Wr = "https://pages-api.cloud.tencent.com", Fr = "https://pages-api.edgeone.ai", $r = [Wr, Fr], Te = "/v1", ke = class {
      baseUrl;
      baseSelectionPromise;
      apiToken;
      defaultEngineModelType;
      defaultTtsVoiceId;
      appId;
      requestMeta;
      baseCandidates;
      debugLog;
      constructor(e) {
        if (!e.apiToken)
          throw new Error("PAGES_API_TOKEN is required");
        this.baseUrl = null, this.baseSelectionPromise = null, this.apiToken = e.apiToken.trim(), this.defaultEngineModelType = e.defaultEngineModelType, this.defaultTtsVoiceId = e.defaultTtsVoiceId, this.appId = e.appId, this.requestMeta = e.requestMeta || {}, this.baseCandidates = Vr(e.baseUrls), this.debugLog = typeof e.debugLog == "function" ? e.debugLog : null;
      }
      async signAsr(e = {}) {
        var _a2;
        let s = await this.request(Te, { Action: "SignPagesAiAsr", EngineModelType: e.engineModelType || this.defaultEngineModelType, VoiceId: e.voiceId, ApiToken: this.apiToken, ...this.requestMeta, ...this.appId !== void 0 ? { AppId: this.appId } : {} });
        if (!((_a2 = s == null ? void 0 : s.Asr) == null ? void 0 : _a2.websocketUrl)) {
          let r = is(s);
          throw new Error(`ASR signature response is invalid${r ? `: ${r}` : ""}`);
        }
        return s.Asr;
      }
      async signTts(e, s = {}) {
        var _a2, _b, _c;
        let r = (e || "").trim();
        if (!r)
          throw new Error("TTS text is empty");
        let n = await this.request(Te, { Action: "SignPagesAiTts", ApiToken: this.apiToken, VoiceId: s.voiceId || this.defaultTtsVoiceId, Text: r, ...this.requestMeta, ...this.appId !== void 0 ? { AppId: this.appId } : {} });
        if (!((_a2 = n.Tts) == null ? void 0 : _a2.headers) || !((_b = n.Tts) == null ? void 0 : _b.endpoint) || !((_c = n.Tts) == null ? void 0 : _c.payload)) {
          let i = is(n);
          throw new Error(`TTS signature response is invalid${i ? `: ${i}` : ""}`);
        }
        return n.Tts;
      }
      async completeLlm(e) {
        var _a2;
        let r = (_a2 = await this.callLlmEndpoint({ ApiToken: this.apiToken, ...this.requestMeta, ...this.appId !== void 0 ? { AppId: this.appId } : {}, Messages: e })) == null ? void 0 : _a2.Content;
        if (typeof r != "string" || !r.trim())
          throw new Error("LLM response missing content");
        return r;
      }
      async callLlmEndpoint(e) {
        return this.request(Te, { ...e, Action: "CompletePagesAiLlm" });
      }
      async request(e, s) {
        let r = await this.ensureBaseUrl(), n = new URL(e, r), i;
        M(this.debugLog, "pages-ai:http:request", { url: n.toString(), payload: s, headers: { "Content-Type": "application/json", Authorization: zr(`Bearer ${this.apiToken}`) } });
        try {
          i = await fetch(n.toString(), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiToken}` }, body: JSON.stringify(s) });
        } catch (a) {
          throw M(this.debugLog, "pages-ai:http:error", { url: n.toString(), error: (a == null ? void 0 : a.message) || String(a) }), new Error((a == null ? void 0 : a.message) || String(a));
        }
        let o = await i.text();
        M(this.debugLog, "pages-ai:http:response", { url: n.toString(), status: i.status, statusText: i.statusText, headers: os(i.headers), body: o });
        let l = {};
        try {
          l = o ? JSON.parse(o) : {};
        } catch {
          l = {};
        }
        let c = jr(l);
        if (!i.ok) {
          let a = Gr(c) || i.statusText || "Request failed";
          throw new Error(`[${i.status}] ${a}`);
        }
        return c || {};
      }
      async ensureBaseUrl() {
        if (this.baseUrl)
          return this.baseUrl;
        if (this.baseSelectionPromise)
          return this.baseSelectionPromise;
        this.baseSelectionPromise = this.detectBaseUrl();
        try {
          let e = await this.baseSelectionPromise;
          return this.baseUrl = e, e;
        } finally {
          this.baseSelectionPromise = null;
        }
      }
      async detectBaseUrl() {
        M(this.debugLog, "pages-ai:http:detect-base", { candidates: this.baseCandidates });
        let e = await Promise.all(this.baseCandidates.map((n) => this.probeBase(n))), s = e.find((n) => n.ok);
        if (M(this.debugLog, "pages-ai:http:detect-base:result", { probes: e, winner: (s == null ? void 0 : s.base) || null }), s == null ? void 0 : s.base)
          return s.base;
        let r = e.map((n) => `${n.base}: ${n.reason || "Unknown error"}`).join("; ");
        throw new Error(`All endpoints failed: ${r}`);
      }
      async probeBase(e) {
        let s = new URL(Te, e);
        M(this.debugLog, "pages-ai:http:probe:request", { base: e, url: s.toString() });
        try {
          let r = await fetch(s.toString(), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiToken}` }, body: JSON.stringify({ Action: "TokenPing" }) }), n = await r.text();
          M(this.debugLog, "pages-ai:http:probe:response", { base: e, status: r.status, statusText: r.statusText, headers: os(r.headers), body: n });
          let i = {};
          try {
            i = n ? JSON.parse(n) : {};
          } catch {
            i = {};
          }
          if (!r.ok)
            return { base: e, ok: false, reason: `[${r.status}] ${r.statusText || "Request failed"}` };
          let o = (i == null ? void 0 : i.Code) ?? (i == null ? void 0 : i.code), l = (i == null ? void 0 : i.Message) ?? (i == null ? void 0 : i.message) ?? "";
          if (o === 109 || typeof l == "string" && l.toLowerCase().includes("region")) {
            let a = [o, l].filter(Boolean).join(": ");
            return { base: e, ok: false, reason: a || "Token not allowed for this region" };
          }
          return { base: e, ok: true };
        } catch (r) {
          return M(this.debugLog, "pages-ai:http:probe:error", { base: e, url: s.toString(), error: (r == null ? void 0 : r.message) || String(r) }), { base: e, ok: false, reason: (r == null ? void 0 : r.message) || String(r) };
        }
      }
    };
    function ns(t) {
      let e = (t || "").trim(), s = e && /^[a-z]+:\/\//i.test(e) ? e : `https://${e}`;
      return s.endsWith("/") ? s : `${s}/`;
    }
    function jr(t) {
      if (t && typeof t == "object") {
        if (t.Data && typeof t.Data == "object")
          return t.Data.Response && typeof t.Data.Response == "object" ? t.Data.Response : t.Data;
        if (t.Response && typeof t.Response == "object")
          return t.Response;
      }
      return t || {};
    }
    function Gr(t) {
      if (!t || typeof t != "object")
        return "";
      let e = t.Error || t.error;
      return (e == null ? void 0 : e.Message) ? e.Message : typeof e == "string" ? e : t.message || t.Message || "";
    }
    function is(t) {
      try {
        return JSON.stringify(t);
      } catch {
        return "";
      }
    }
    function Vr(t) {
      let e = $r.map(ns), s = (t || []).map(ns).filter((i) => !!i), r = /* @__PURE__ */ new Set(), n = [];
      return [...s, ...e].forEach((i) => {
        !i || r.has(i) || (r.add(i), n.push(i));
      }), n.length ? n : e;
    }
    function M(t, e, s) {
      if (t)
        try {
          t(e, s);
        } catch {
        }
    }
    function zr(t) {
      if (!t)
        return t;
      let e = Math.min(6, Math.floor(t.length / 3));
      return `${t.slice(0, e)}***${t.slice(-e)}`;
    }
    function os(t) {
      if (!t)
        return {};
      if (typeof t.entries == "function")
        return Array.from(t.entries()).reduce((r, [n, i]) => (r[n] = i, r), {});
      let e = {};
      return Object.entries(t).forEach(([s, r]) => {
        e[s.toLowerCase()] = r;
      }), e;
    }
    var Xe = Y(require("https")), Hr = Xe.default.request.bind(Xe.default);
    function as(t, e = {}, s = null) {
      let { endpoint: r, payload: n, headers: i } = t;
      if (!n)
        throw new Error("TTS payload missing");
      let { signal: o } = e;
      if (o == null ? void 0 : o.aborted)
        throw new Error("Aborted");
      let l = { ...i, "Content-Length": (i == null ? void 0 : i["Content-Length"]) ?? Buffer.byteLength(n) };
      U(s, "pages-ai:tts:sse:request", { endpoint: r, headers: l, payload: n });
      let c = null, a = false, f = null, h = [], p = null, _ = () => {
        p && (p(), p = null);
      }, m = (d) => {
        a || (h.push(d), _());
      }, u = () => {
        a || (a = true, _());
      }, y = (d) => {
        a || (f = d instanceof Error ? d : new Error(String(d)), a = true, _());
      }, B = { async next() {
        if (h.length)
          return { value: h.shift(), done: false };
        if (f)
          throw f;
        if (a)
          return { value: void 0, done: true };
        if (await new Promise((d) => {
          p = d;
        }), h.length)
          return { value: h.shift(), done: false };
        if (f)
          throw f;
        return { value: void 0, done: true };
      }, async return() {
        if (u(), c)
          try {
            c.destroy();
          } catch {
          }
        return { value: void 0, done: true };
      }, [Symbol.asyncIterator]() {
        return this;
      } };
      return c = Hr({ hostname: r, port: 443, path: "/", method: "POST", signal: o, headers: l }, (d) => {
        if (U(s, "pages-ai:tts:sse:response", { endpoint: r, statusCode: d.statusCode, statusMessage: d.statusMessage, headers: d.headers }), !(d.headers["content-type"] || "").toLowerCase().includes("text/event-stream")) {
          let E = "";
          d.on("data", (x) => {
            E += x.toString();
          }), d.on("end", () => {
            var _a2, _b;
            let x = `TTS request failed with status ${d.statusCode ?? ""}`.trim();
            if (E)
              try {
                let k = (_b = (_a2 = JSON.parse(E)) == null ? void 0 : _a2.Response) == null ? void 0 : _b.Error;
                (k == null ? void 0 : k.Message) ? x = `${k.Code || "Error"}: ${k.Message}` : x = `${x}: ${E.slice(0, 200)}`;
              } catch {
                x = `${x}: ${E.slice(0, 200)}`;
              }
            U(s, "pages-ai:tts:sse:error-response", { endpoint: r, statusCode: d.statusCode, statusMessage: d.statusMessage, headers: d.headers, body: E }), y(new Error(x));
          }), d.on("error", y);
          return;
        }
        let C = "";
        d.on("data", (E) => {
          C += E.toString();
          let x = C.split(`
`);
          C = x.pop() || "";
          for (let z of x)
            if (z.startsWith("data:")) {
              let k = z.slice(5).trim();
              if (k)
                try {
                  m({ data: k }), U(s, "pages-ai:tts:sse:event", { endpoint: r, data: Yr(k) });
                } catch (H) {
                  let fs = H instanceof Error ? H.message : String(H);
                  console.error("\u89E3\u6790 SSE \u6570\u636E\u5931\u8D25:", fs);
                }
            }
        }), d.on("end", () => {
          U(s, "pages-ai:tts:sse:end", { endpoint: r }), u();
        }), d.on("error", (E) => {
          U(s, "pages-ai:tts:sse:error", { endpoint: r, message: E instanceof Error ? E.message : String(E) }), y(E);
        });
      }), c.on("error", (d) => {
        U(s, "pages-ai:tts:sse:request-error", { endpoint: r, message: d instanceof Error ? d.message : String(d) }), y(d);
      }), o && o.addEventListener("abort", () => {
        U(s, "pages-ai:tts:sse:aborted", { endpoint: r }), y(new Error("Aborted")), c == null ? void 0 : c.destroy(new Error("Aborted"));
      }, { once: true }), c.write(n), c.end(), B;
    }
    function U(t, e, s) {
      if (t)
        try {
          t(e, s);
        } catch {
        }
    }
    function Yr(t) {
      return !t || t.length <= 200 ? t : { preview: t.slice(0, 200), length: t.length };
    }
    var Kr = 251195406, Xr = "16k_zh_en", Jr = void 0, Zr = ["https://pages-api.cloud.tencent.com", "https://pages-api.edgeone.ai"], ls = { Version: "2022-09-01", Region: "ch", Language: "zh", RequestId: "111", ClientIp: "1.1.1.1", ApiModule: "teo", RequestSource: "API", CamContext: "hall", AccountArea: "0", Uin: "100000043181", SubAccountUin: "100000043181", Timestamp: "111" }, cs = false, Oe = (_a = class {
      constructor(e) {
        __publicField(this, "asr");
        __publicField(this, "llm");
        __publicField(this, "tts");
        __privateAdd(this, _e, void 0);
        __privateAdd(this, _t, void 0);
        if (!(e == null ? void 0 : e.apiToken))
          throw new Error("apiToken is required to initialize PagesAI");
        let s = Qr(e), r = nn(s.debugLogger);
        __privateSet(this, _t, r), __privateSet(this, _e, new ke({ apiToken: s.apiToken, defaultEngineModelType: s.engineModelType, defaultTtsVoiceId: s.ttsVoiceId, appId: s.appId, baseUrls: s.apiBaseUrls, requestMeta: s.apiMeta, debugLog: r })), this.asr = se(tn(__privateGet(this, _e), r)), this.llm = se(sn(__privateGet(this, _e), r)), this.tts = se(rn(__privateGet(this, _e), r)), se(this);
      }
    }, _e = new WeakMap(), _t = new WeakMap(), _a);
    function Qr(t) {
      return { apiToken: t.apiToken, engineModelType: Xr, ttsVoiceId: Jr, appId: Kr, apiBaseUrls: Zr, apiMeta: ls, debugLogger: cs ? t.debugLogger : null };
    }
    function en() {
      return { ...ls };
    }
    function tn(t, e) {
      return { async createSocket() {
        try {
          let s = await t.signAsr();
          V(e, "pages-ai:asr:sign", s);
          let r = new rs(s.websocketUrl, { perMessageDeflate: false, headers: s.headers });
          return r.on("open", () => V(e, "pages-ai:asr:socket:open", { url: s.websocketUrl })), r.on("close", (n, i) => {
            var _a2;
            return V(e, "pages-ai:asr:socket:close", { url: s.websocketUrl, code: n, reason: (_a2 = i == null ? void 0 : i.toString) == null ? void 0 : _a2.call(i) });
          }), r.on("error", (n) => V(e, "pages-ai:asr:socket:error", { url: s.websocketUrl, message: (n == null ? void 0 : n.message) || String(n) })), r.on("message", (n) => V(e, "pages-ai:asr:socket:message", { url: s.websocketUrl, message: on(n) })), se({ socket: r, engineModelType: s.engineModelType, voiceId: s.voiceId });
        } catch (s) {
          let r = s instanceof Error ? s.message : String(s);
          throw new Error(`ASR runtime not configured: ${r}`);
        }
      } };
    }
    function sn(t, e) {
      return { async complete(s) {
        if (!Array.isArray(s) || !s.length)
          throw new Error("LLM messages are empty");
        return V(e, "pages-ai:llm:complete", { messages: s }), t.completeLlm(s);
      } };
    }
    function rn(t, e) {
      return { async synthesize(s, r = {}) {
        let n = (s || "").trim();
        if (!n)
          throw new Error("TTS text is empty");
        V(e, "pages-ai:tts:synthesize", { text: n });
        let i = await t.signTts(n);
        return as(i, { signal: r == null ? void 0 : r.signal }, e);
      } };
    }
    function se(t) {
      if (!t || typeof t != "object" || Object.isFrozen(t))
        return t;
      let e = Object.getPrototypeOf(t);
      return !(e === Object.prototype || e === null) && !Array.isArray(t) || (Object.freeze(t), Object.getOwnPropertyNames(t).forEach((r) => {
        let n = t[r];
        n && typeof n == "object" && !Object.isFrozen(n) && se(n);
      })), t;
    }
    function nn(t) {
      return cs && typeof t == "function" ? (e, s) => {
        try {
          t(e, s);
        } catch {
        }
      } : null;
    }
    function V(t, e, s) {
      t && t(e, s);
    }
    function on(t) {
      return t == null || typeof t == "string" ? t : Buffer.isBuffer(t) ? { type: "buffer", length: t.length, preview: t.toString("utf8", 0, Math.min(128, t.length)) } : typeof t.toString == "function" ? t.toString() : t;
    }
    function an() {
      if (typeof globalThis > "u")
        return;
      let t = globalThis;
      t.PagesAI || Object.defineProperty(t, "PagesAI", { configurable: false, enumerable: false, writable: false, value: Oe });
    }
    an();
  }
});
export default require_stdin();

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// <stdin>
import http from "http";
import { randomUUID } from "crypto";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
(async function() {
  var kvModule = { exports: {} };
  (function(module, exports) {
    var O = Object.create;
    var v = Object.defineProperty;
    var Y = Object.getOwnPropertyDescriptor;
    var F = Object.getOwnPropertyNames;
    var Z = Object.getPrototypeOf, X = Object.prototype.hasOwnProperty;
    var J = (r, e) => {
      for (var t in e)
        v(r, t, { get: e[t], enumerable: true });
    }, x = (r, e, t, n) => {
      if (e && typeof e == "object" || typeof e == "function")
        for (let o of F(e))
          !X.call(r, o) && o !== t && v(r, o, { get: () => e[o], enumerable: !(n = Y(e, o)) || n.enumerable });
      return r;
    };
    var W = (r, e, t) => (t = r != null ? O(Z(r)) : {}, x(e || !r || !r.__esModule ? v(t, "default", { value: r, enumerable: true }) : t, r)), q = (r) => x(v({}, "__esModule", { value: true }), r);
    var ne = {};
    J(ne, { bootstrap: () => re, createKVClient: () => S, getConfigs: () => M, initKVBindings: () => z });
    module.exports = q(ne);
    var k = W(__require("net"));
    var K = class {
      static encodeCommand(e) {
        let t = [];
        t.push(`*${e.length}\r
`);
        for (let n of e) {
          let o = Buffer.byteLength(n, "utf8");
          t.push("$" + o + `\r
` + n + `\r
`);
        }
        return t.join("");
      }
      static encodeCommandBuffer(e) {
        let t = [];
        t.push(Buffer.from(`*${e.length}\r
`));
        for (let n of e) {
          let o = typeof n == "string" ? Buffer.from(n, "utf8") : n;
          t.push(Buffer.from("$" + o.length + `\r
`)), t.push(o), t.push(Buffer.from(`\r
`));
        }
        return Buffer.concat(t);
      }
    }, w = class {
      buffer = "";
      append(e) {
        Buffer.isBuffer(e) ? this.buffer += e.toString("utf8") : this.buffer += e;
      }
      get bufferLength() {
        return this.buffer.length;
      }
      clear() {
        this.buffer = "";
      }
      parse() {
        var o;
        if (this.buffer.length === 0)
          return null;
        let e = this.buffer[0], t = this.buffer.indexOf(`\r
`);
        if (t === -1)
          return null;
        let n = this.buffer.substring(1, t);
        switch (e) {
          case "+":
            return this.buffer = this.buffer.substring(t + 2), { type: "simple_string", value: n };
          case "-":
            return this.buffer = this.buffer.substring(t + 2), { type: "error", value: n };
          case ":":
            return this.buffer = this.buffer.substring(t + 2), { type: "integer", value: parseInt(n, 10) };
          case "$":
            return this.parseBulkString(n, t);
          case "*":
            return this.parseArray(n, t);
          default: {
            let f = e.charCodeAt(0), a = this.buffer.substring(0, 100).replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t"), u = ((o = Buffer.from(this.buffer.substring(0, 20)).toString("hex").match(/.{1,2}/g)) == null ? void 0 : o.join(" ")) || "";
            throw new Error(`Unknown RESP type: '${e}' (char code: ${f}, hex: 0x${f.toString(16)})
Buffer length: ${this.buffer.length}
Buffer preview (first 100 chars): ${a}
Buffer hex (first 20 bytes): ${u}`);
          }
        }
      }
      parseBulkString(e, t) {
        let n = parseInt(e, 10);
        if (n === -1)
          return this.buffer = this.buffer.substring(t + 2), { type: "null", value: null };
        let o = t + 2, f = o + n, a = f + 2;
        if (this.buffer.length < a)
          return null;
        let u = this.buffer.substring(o, f);
        return this.buffer = this.buffer.substring(a), { type: "bulk_string", value: u };
      }
      parseArray(e, t) {
        let n = parseInt(e, 10);
        if (n === -1)
          return this.buffer = this.buffer.substring(t + 2), { type: "null", value: null };
        if (n === 0)
          return this.buffer = this.buffer.substring(t + 2), { type: "array", value: [] };
        let o = this.buffer;
        this.buffer = this.buffer.substring(t + 2);
        let f = [];
        for (let a = 0; a < n; a++) {
          let u = this.parse();
          if (u === null)
            return this.buffer = o, null;
          f.push(u);
        }
        return { type: "array", value: f };
      }
    };
    var R = "EO_KV_BINDINGS";
    var A = /^[a-zA-Z0-9_]+$/;
    var V = class {
      socket = null;
      decoder = new w();
      responseQueue = [];
      host;
      port;
      timeout;
      debug;
      connected = false;
      constructor(e) {
        this.host = e.host, this.port = e.port, this.timeout = e.timeout ?? 1e4, this.debug = e.debug ?? false;
      }
      log(e, ...t) {
        this.debug && console.log(`[RespConnection] ${e}`, ...t);
      }
      connect() {
        return new Promise((e, t) => {
          this.log("Connecting to KV service..."), this.socket = k.createConnection({ host: this.host, port: this.port }), this.socket.on("connect", () => {
            this.log("TCP connection established"), this.connected = true, e();
          }), this.socket.on("data", (n) => {
            this.decoder.append(n), this.processResponses();
          }), this.socket.on("error", (n) => {
            this.log(`Socket error: ${n.message}`), t(new Error("KV connection failed"));
          }), this.socket.on("close", (n) => {
            for (this.log(`Connection closed (hadError: ${n}, pending: ${this.responseQueue.length})`), this.connected = false; this.responseQueue.length > 0; ) {
              let { reject: o } = this.responseQueue.shift();
              o(new Error("Connection closed by server"));
            }
          }), this.socket.setTimeout(this.timeout, () => {
            this.log(`Connection timeout after ${this.timeout}ms`), t(new Error("KV connection timeout"));
          });
        });
      }
      processResponses() {
        let e;
        for (; (e = this.decoder.parse()) !== null; )
          if (this.responseQueue.length > 0) {
            let { resolve: t, reject: n } = this.responseQueue.shift();
            e.type === "error" ? n(new Error(e.value)) : t(e);
          }
      }
      sendCommand(e) {
        return new Promise((t, n) => {
          if (!this.socket || !this.connected) {
            n(new Error("Not connected"));
            return;
          }
          let o = K.encodeCommand(e);
          this.log(`Sending command: ${e[0]} (${o.length} bytes)`), this.responseQueue.push({ resolve: t, reject: n }), this.socket.write(o, (f) => {
            f && this.log(`Write error: ${f.message}`);
          });
        });
      }
      close() {
        this.socket && (this.socket.end(), this.socket = null), this.connected = false;
      }
    };
    function I(r) {
      if (!r || typeof r != "string")
        throw new Error("Key must be a non-empty string");
      let e = Buffer.byteLength(r, "utf-8");
      if (e > 512)
        throw new Error(`Key size exceeds maximum limit of ${512} bytes (got ${e} bytes)`);
      if (!A.test(r))
        throw new Error("Key can only contain letters, numbers, and underscores");
    }
    function L(r) {
      if (r.length > 26214400)
        throw new Error(`Value size exceeds maximum limit of ${26214400} bytes (${Math.round(26214400 / 1024 / 1024)} MB), got ${r.length} bytes`);
    }
    async function N(r) {
      if (typeof r == "string")
        return Buffer.from(r, "utf-8");
      if (r instanceof ArrayBuffer)
        return Buffer.from(r);
      if (ArrayBuffer.isView(r))
        return Buffer.from(r.buffer, r.byteOffset, r.byteLength);
      if (typeof ReadableStream < "u" && r instanceof ReadableStream) {
        let e = [], t = r.getReader();
        try {
          for (; ; ) {
            let { done: a, value: u } = await t.read();
            if (a)
              break;
            e.push(u);
          }
        } finally {
          t.releaseLock();
        }
        let n = e.reduce((a, u) => a + u.length, 0), o = new Uint8Array(n), f = 0;
        for (let a of e)
          o.set(a, f), f += a.length;
        return Buffer.from(o);
      }
      throw new Error(`Unsupported value type: ${typeof r}`);
    }
    function U(r, e) {
      switch (e) {
        case "json":
          try {
            return JSON.parse(r.toString("utf-8"));
          } catch {
            return r.toString("utf-8");
          }
        case "arrayBuffer":
          return r.buffer.slice(r.byteOffset, r.byteOffset + r.byteLength);
        case "stream": {
          let t = r;
          return new ReadableStream({ start(n) {
            n.enqueue(new Uint8Array(t)), n.close();
          } });
        }
        case "text":
        default:
          return r.toString("utf-8");
      }
    }
    function S(r, e) {
      let t = null, n = null, o = (e == null ? void 0 : e.debug) ?? false, f = `${r.userId}@${r.userKey}`, a = `/${r.namespace}/`, u = (s, ...i) => {
        o && console.log(`[KVClient] ${s}`, ...i);
      }, m = (s) => a + s, C = (s) => s.startsWith(a) ? s.substring(a.length) : s, D = async (s) => {
        u("Authenticating...");
        let i = await s.sendCommand(["AUTH", f]);
        if (i.type === "simple_string" && i.value === "OK")
          u("Authentication successful");
        else
          throw new Error("Authentication failed");
      }, Q = async (s) => {
        u("Selecting namespace...");
        let i = await s.sendCommand(["SELECT", r.namespace]);
        if (i.type === "simple_string" && i.value === "OK")
          u("Namespace selected");
        else
          throw new Error("Namespace selection failed");
      }, b = async () => {
        if (t && !t.connected && (t = null, n = null), t && t.connected)
          return t;
        if (n) {
          if (await n, t && t.connected)
            return t;
          t = null, n = null;
        }
        let s = typeof r.servicePort == "string" ? parseInt(r.servicePort, 10) : r.servicePort;
        return t = new V({ host: r.serviceName, port: s, timeout: e == null ? void 0 : e.timeout, debug: o }), n = (async () => {
          try {
            await t.connect(), await D(t), await Q(t);
          } catch (i) {
            throw t == null || t.close(), t = null, n = null, i;
          }
        })(), await n, t;
      }, j = (s) => {
        if (s.type === "null")
          return null;
        if (s.type === "array" && Array.isArray(s.value)) {
          let i = s.value;
          if (i.length > 0) {
            let l = i[0];
            return l.type === "null" ? null : Buffer.from(l.value, "utf-8");
          }
          return null;
        }
        return s.type === "bulk_string" ? Buffer.from(s.value, "utf-8") : null;
      };
      return { async get(s, i) {
        let l = await b(), c = m(s);
        u(`GET: ${c}`);
        let h = await l.sendCommand(["oget", c]), p = j(h);
        if (p === null)
          return null;
        let g = typeof i == "string" ? i : (i == null ? void 0 : i.type) ?? "text";
        return U(p, g);
      }, async put(s, i) {
        I(s);
        let l = await b(), c = m(s), h = await N(i);
        L(h);
        let p = h.toString("utf-8");
        u(`PUT: ${c} = ${p.substring(0, 100)}${p.length > 100 ? "..." : ""}`);
        let g = ["oset", c, p], d = await l.sendCommand(g);
        if (d.type !== "simple_string" || d.value !== "OK")
          throw new Error("PUT operation failed");
      }, async delete(s) {
        let i = await b(), l = m(s);
        u(`DELETE: ${l}`);
        let c = await i.sendCommand(["odel", l]);
        if (c.type === "error")
          throw new Error(`DELETE failed: ${c.value}`);
        u(`DELETE response: type=${c.type}, value=${c.value}`);
      }, async list(s) {
        var d, $, T;
        let i = await b(), l = (s == null ? void 0 : s.prefix) ?? "", c = (s == null ? void 0 : s.limit) ?? 10, h = m(l);
        u(`LIST: ${h}, limit: ${c}`);
        let p = ["list", h, "count", c.toString()];
        s != null && s.cursor && p.push("cursor", m(s.cursor));
        let g = await i.sendCommand(p);
        if (g.type === "array" && Array.isArray(g.value)) {
          let y = g.value;
          if (y.length >= 2) {
            let _ = { cursor: C(((d = y[0]) == null ? void 0 : d.value) || "") || void 0, complete: ((($ = y[1]) == null ? void 0 : $.value) || "").toLowerCase() === "true", keys: [] };
            for (let E = 2; E + 3 <= y.length; E += 3) {
              let G = { key: C(((T = y[E]) == null ? void 0 : T.value) || "") };
              _.keys.push(G);
            }
            return _;
          }
        }
        return { keys: [], complete: true };
      } };
    }
    function M() {
      let r = process.env[R];
      if (!r)
        return [];
      delete process.env[R];
      try {
        return JSON.parse(r);
      } catch {
        try {
          let e = Buffer.from(r, "base64").toString("utf-8");
          return JSON.parse(e);
        } catch {
          return [];
        }
      }
    }
    function z(r) {
      for (let e of r)
        globalThis[e.name] = S(e);
    }
    function re() {
      try {
        let r = M();
        r && r.length > 0 && (z(r), console.log(`[cli] Initialized ${r.length} KV binding(s)`));
      } catch {
        console.error("[cli] Initialization failed");
      }
    }
  })(kvModule, kvModule.exports);
  if (kvModule.exports.bootstrap) {
    await kvModule.exports.bootstrap();
  }
})();
var env = {
  "ProjectId": "makers-5ia8vzkvcwpy",
  "NG_CLI_ANALYTICS": "false",
  "NUXT_TELEMETRY_DISABLED": "1",
  "COREPACK_ENABLE_DOWNLOAD_PROMPT": "0",
  "COREPACK_ENABLE_STRICT": "0",
  "YARN_ENABLE_INTERACTIVE": "0",
  "NPM_CONFIG_YES": "true",
  "CI": "true",
  "TMPDIR": "/var/folders/y5/0nzcbgzd5q90d50336tpyc9m0000gn/T/",
  "EDGEONE_PROJECT_ID": "makers-5ia8vzkvcwpy",
  "PAGES_PROJECT_ID": "makers-5ia8vzkvcwpy"
};
Object.assign(env, process.env || {});
delete env.TENCENTCLOUD_UIN;
delete env.TENCENTCLOUD_APPID;
function resolveAgentConversationId(_req) {
  return "";
}
function stripRequestSignal(request) {
  if (!request) {
    return request;
  }
  try {
    Object.defineProperty(request, "signal", {
      value: void 0,
      configurable: true
    });
  } catch {
  }
  return request;
}
function createCloudFunctionContext(options) {
  return {
    ...options.request ? { request: stripRequestSignal(options.request) } : {},
    env,
    params: options.params || {},
    uuid: options.req.headers["eo-log-uuid"] || "",
    server: {
      region: options.req.headers["x-scf-region"] || "",
      requestId: options.req.headers["x-scf-request-id"] || ""
    },
    clientIp: options.req.headers["eo-connecting-ip"] || "",
    geo: options.safeGeo
  };
}
function stripInternalRequestHeaders(req) {
  for (const key in req.headers) {
    if (key.startsWith("x-scf-")) {
      delete req.headers[key];
    }
    if (key.startsWith("x-cube-")) {
      delete req.headers[key];
    }
  }
}
function getResponsePassHeaders(context, _fallbackConversationId = "") {
  return {
    "functions-request-id": (context == null ? void 0 : context.server) ? context.server.requestId : ""
  };
}
try {
  process.removeAllListeners("uncaughtException");
  process.removeAllListeners("unhandledRejection");
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
  });
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
  });
} catch (error) {
  console.error("Uncaught Exception:", error);
}
var port = 9e3;
var EdgeoneBodyParser = class {
  /**
   * Parse request body according to Content-Type, strictly following Edgeone rules
   * @param {Buffer} buffer Raw request body data
   * @param {string} contentType Content-Type header
   * @returns Parsed data
   */
  static parseBodyByContentType(buffer, contentType = "") {
    if (!buffer || buffer.length === 0) {
      return void 0;
    }
    const normalizedContentType = contentType.split(";")[0].trim().toLowerCase();
    switch (normalizedContentType) {
      case "application/json":
        try {
          const text = buffer.toString("utf-8");
          return JSON.parse(text);
        } catch (error) {
          throw new Error(`Invalid JSON in request body: ${error.message}`);
        }
      case "application/x-www-form-urlencoded":
        const formText = buffer.toString("utf-8");
        const params = new URLSearchParams(formText);
        const result = {};
        for (const [key, value] of params) {
          result[key] = value;
        }
        return result;
      case "text/plain":
        return buffer.toString("utf-8");
      case "application/octet-stream":
        return buffer;
      default:
        return buffer;
    }
  }
  /**
   * Parse URL query parameters
   * @param {string} url Full URL or query string
   * @returns {Object} Parsed query parameters object
   */
  static parseQuery(url) {
    if (!url)
      return {};
    const queryStart = url.indexOf("?");
    const queryString = queryStart >= 0 ? url.substring(queryStart + 1) : url;
    if (!queryString)
      return {};
    const params = {};
    const pairs = queryString.split("&");
    for (const pair of pairs) {
      if (!pair)
        continue;
      const equalIndex = pair.indexOf("=");
      let key, value;
      if (equalIndex === -1) {
        key = pair;
        value = true;
      } else if (equalIndex === 0) {
        continue;
      } else {
        key = pair.substring(0, equalIndex);
        value = pair.substring(equalIndex + 1);
        if (value === "") {
          value = "";
        }
      }
      if (key) {
        try {
          const decodedKey = decodeURIComponent(key);
          let decodedValue;
          if (typeof value === "boolean") {
            decodedValue = value;
          } else {
            decodedValue = decodeURIComponent(value);
            if (decodedValue === "true") {
              decodedValue = true;
            } else if (decodedValue === "false") {
              decodedValue = false;
            } else if (decodedValue === "null") {
              decodedValue = null;
            } else if (decodedValue === "undefined") {
              decodedValue = void 0;
            } else if (/^-?d+$/.test(decodedValue)) {
              const num = parseInt(decodedValue, 10);
              if (!isNaN(num) && num.toString() === decodedValue) {
                decodedValue = num;
              }
            } else if (/^-?d*.d+$/.test(decodedValue)) {
              const num = parseFloat(decodedValue);
              if (!isNaN(num) && num.toString() === decodedValue) {
                decodedValue = num;
              }
            }
          }
          if (params[decodedKey] !== void 0) {
            if (Array.isArray(params[decodedKey])) {
              params[decodedKey].push(decodedValue);
            } else {
              params[decodedKey] = [params[decodedKey], decodedValue];
            }
          } else {
            params[decodedKey] = decodedValue;
          }
        } catch (error) {
          if (typeof value === "boolean") {
            params[key] = value;
          } else {
            params[key] = value || "";
          }
        }
      }
    }
    return params;
  }
  /**
   * Parse Cookie header
   * @param {string} cookieHeader Cookie header string
   * @returns {Object} Parsed cookies object
   */
  static parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader || typeof cookieHeader !== "string") {
      return cookies;
    }
    cookieHeader.split(";").forEach((cookie) => {
      const trimmed = cookie.trim();
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const name = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        try {
          cookies[name] = decodeURIComponent(value);
        } catch (error) {
          cookies[name] = value;
        }
      }
    });
    return cookies;
  }
  /**
   * Read the full request body data from the stream
   */
  static async readBodyFromStream(req, maxSize = 50 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      if (req.readableEnded || req.destroyed) {
        resolve(Buffer.alloc(0));
        return;
      }
      if (req._bodyBuffer !== void 0) {
        resolve(req._bodyBuffer);
        return;
      }
      const chunks = [];
      let totalSize = 0;
      const cleanup = () => {
        req.removeListener("data", onData);
        req.removeListener("end", onEnd);
        req.removeListener("error", onError);
      };
      const onData = (chunk) => {
        totalSize += chunk.length;
        if (totalSize > maxSize) {
          cleanup();
          reject(new Error(`Request body too large. Max size: ${maxSize} bytes`));
          return;
        }
        chunks.push(chunk);
      };
      const onEnd = () => {
        cleanup();
        const buffer = Buffer.concat(chunks);
        req._bodyBuffer = buffer;
        resolve(buffer);
      };
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      req.on("data", onData);
      req.on("end", onEnd);
      req.on("error", onError);
      if (req.readable && !req.readableFlowing) {
        req.resume();
      }
    });
  }
};
function createEdgeoneCompatibleRequest(originalReq, isFramework = false) {
  const method = (originalReq.method || "GET").toUpperCase();
  const protocol = originalReq.headers["x-forwarded-proto"] || "http";
  const host = originalReq.headers.host || "localhost";
  const url = protocol + "://" + host + (originalReq.url || "/");
  const headerPairs = [];
  for (const key in originalReq.headers) {
    const v = originalReq.headers[key];
    if (typeof v === "string") {
      headerPairs.push([key, v]);
    } else if (Array.isArray(v)) {
      headerPairs.push([key, v.join(", ")]);
    } else if (v != null) {
      headerPairs.push([key, String(v)]);
    }
  }
  const init = {
    method,
    headers: new Headers(headerPairs)
  };
  if (method !== "GET" && method !== "HEAD") {
    init.duplex = "half";
    init.body = originalReq;
  }
  const request = new Request(url, init);
  let parsedBodyCache = void 0;
  let parsedBodyReady = false;
  let parsedBodyError = null;
  const contentType = request.headers.get("content-type") || "";
  const preloadBody = async () => {
    if (method === "GET" || method === "HEAD") {
      parsedBodyCache = void 0;
      parsedBodyReady = true;
      return;
    }
    try {
      const clone = request.clone();
      const ab = await clone.arrayBuffer();
      const buf = Buffer.from(ab);
      request._rawBodyBuffer = buf;
      parsedBodyCache = EdgeoneBodyParser.parseBodyByContentType(buf, contentType);
      parsedBodyReady = true;
    } catch (err) {
      parsedBodyError = err;
      parsedBodyReady = true;
    }
  };
  request._bodyPreloadPromise = preloadBody();
  if (!("cookies" in request)) {
    Object.defineProperty(request, "cookies", {
      get() {
        return EdgeoneBodyParser.parseCookies(request.headers.get("cookie") || "");
      },
      configurable: true,
      enumerable: true
    });
  }
  if (!("query" in request)) {
    Object.defineProperty(request, "query", {
      get() {
        return EdgeoneBodyParser.parseQuery(request.url || "");
      },
      configurable: true,
      enumerable: true
    });
  }
  Object.defineProperty(request, "body", {
    get() {
      if (parsedBodyReady) {
        if (parsedBodyError)
          throw parsedBodyError;
        return parsedBodyCache;
      }
      return new Promise((resolve, reject) => {
        (async () => {
          try {
            await request._bodyPreloadPromise;
            if (parsedBodyError)
              return reject(parsedBodyError);
            resolve(parsedBodyCache);
          } catch (e) {
            reject(e);
          }
        })();
      });
    },
    configurable: true,
    enumerable: true
  });
  return request;
}
async function handleResponse(res, response, passHeaders = {}) {
  var _a, _b, _c;
  const startTime = Date.now();
  const conversationId = passHeaders["makers-conversation-id"] || "";
  if (!response) {
    const requestId = passHeaders["functions-request-id"] || "";
    const headers = {
      "Functions-Request-Id": requestId,
      "eo-pages-inner-scf-status": "404",
      "eo-pages-inner-status-intercept": "true"
    };
    if (conversationId) {
      headers["makers-conversation-id"] = conversationId;
    }
    res.writeHead(404, headers);
    res.end(JSON.stringify({
      error: "Not Found",
      message: "The requested path does not exist"
    }));
    const endTime = Date.now();
    console.log(`Makers response status: 404`);
    return;
  }
  try {
    if (response instanceof Response) {
      let validateCacheControlHeader = function(headers2) {
        const cacheControl = headers2["cache-control"];
        if (cacheControl) {
          const directives = cacheControl.split(",").map((directive) => directive.trim());
          const validatedDirectives = [];
          for (const directive of directives) {
            if (!directive)
              continue;
            const [key, value] = directive.split("=");
            const standardDirectives = ["max-age", "public", "private", "s-maxage", "no-cache", "no-store", "no-transform", "must-revalidate", "proxy-revalidate", "must-understand", "stale-while-revalidate", "stale-if-error", "immutable"];
            if (!standardDirectives.includes(key)) {
              continue;
            }
            if (key === "stale-while-revalidate" || key === "stale-if-error") {
              if (!value) {
                const defaultValue = "31536000";
                validatedDirectives.push(key + "=" + defaultValue);
                continue;
              }
            }
            validatedDirectives.push(directive);
          }
          headers2["cache-control"] = validatedDirectives.join(", ");
        }
      };
      const requestId = passHeaders["functions-request-id"] || "";
      const responseStatus = response.status;
      const headers = Object.fromEntries(response.headers);
      validateCacheControlHeader(headers);
      headers["Functions-Request-Id"] = requestId;
      if (conversationId) {
        headers["makers-conversation-id"] = conversationId;
      }
      if (!headers["eo-pages-inner-scf-status"]) {
        headers["eo-pages-inner-scf-status"] = String(responseStatus);
      }
      if (!headers["eo-pages-inner-status-intercept"]) {
        headers["eo-pages-inner-status-intercept"] = "false";
      }
      if (response.headers.get("eop-client-geo")) {
        response.headers.delete("eop-client-geo");
      }
      delete headers["x-content-type-stream"];
      delete headers["X-Content-Type-Stream"];
      const isStream = response.body && (((_a = response.headers.get("content-type")) == null ? void 0 : _a.includes("text/event-stream")) || ((_b = response.headers.get("transfer-encoding")) == null ? void 0 : _b.includes("chunked")) || response.body instanceof ReadableStream || typeof response.body.pipe === "function" || response.headers.get("x-content-type-stream") === "true");
      if (isStream) {
        const streamHeaders = {
          ...headers
        };
        if ((_c = response.headers.get("content-type")) == null ? void 0 : _c.includes("text/event-stream")) {
          streamHeaders["Content-Type"] = "text/event-stream";
        }
        res.writeHead(response.status, streamHeaders);
        if (typeof response.body.pipe === "function") {
          response.body.pipe(res);
        } else {
          const reader = response.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done)
                break;
              if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
                res.write(value);
              } else {
                const chunk = new TextDecoder().decode(value);
                res.write(chunk);
              }
            }
          } finally {
            reader.releaseLock();
            res.end();
          }
        }
      } else {
        res.writeHead(response.status, headers);
        const body = await response.text();
        res.end(body);
      }
    } else {
      const requestId = passHeaders["functions-request-id"] || "";
      const headers = {
        "Content-Type": "application/json",
        "Functions-Request-Id": requestId,
        "eo-pages-inner-scf-status": "200",
        "eo-pages-inner-status-intercept": "false"
      };
      if (conversationId) {
        headers["makers-conversation-id"] = conversationId;
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify(response));
    }
  } catch (error) {
    const requestId = passHeaders["functions-request-id"] || "";
    const headers = {
      "Functions-Request-Id": requestId,
      "eo-pages-inner-scf-status": "502",
      "eo-pages-inner-status-intercept": "true"
    };
    if (conversationId) {
      headers["makers-conversation-id"] = conversationId;
    }
    res.writeHead(502, headers);
    res.end(JSON.stringify({
      error: "Internal Server Error",
      message: error.message
    }));
  } finally {
    const endTime = Date.now();
    console.log(`Makers response status: ${(response == null ? void 0 : response.status) || "unknown"}`);
  }
}
var server = http.createServer(async (req, res) => {
  let agentConversationId = "";
  try {
    const requestStartTime = Date.now();
    const geoStr = decodeURIComponent(req.headers["eo-connecting-geo"]) || "";
    const geo = geoStr ? (() => {
      const result = {};
      const matches = geoStr.match(/[a-z_]+="[^"]*"|[a-z_]+=[A-Za-z0-9.-]+/g) || [];
      matches.forEach((match) => {
        const [key, value] = match.split("=", 2);
        result[key] = value.replace(/^"|"$/g, "");
      });
      return result;
    })() : {};
    const newGeo = {
      asn: geo.asn,
      countryName: geo.nation_name,
      countryCodeAlpha2: geo.region_code && geo.region_code.split("-")[0],
      countryCodeNumeric: geo.nation_numeric,
      regionName: geo.region_name,
      regionCode: geo.region_code,
      cityName: geo.city_name,
      latitude: geo.latitude,
      longitude: geo.longitude,
      cisp: geo.network_operator
    };
    const safeGeo = {};
    for (const [key, value] of Object.entries(newGeo)) {
      if (value !== void 0 && value !== null) {
        if (typeof value === "string" && /[\u4e00-\u9fff]/.test(value)) {
          safeGeo[key] = Buffer.from(value, "utf8").toString("utf8");
        } else {
          safeGeo[key] = value;
        }
      }
    }
    req.headers["eo-connecting-geo"] = safeGeo;
    let context = {};
    let enhancedRequest = {};
    req.headers["functions-request-id"] = req.headers["x-scf-request-id"] || "";
    agentConversationId = resolveAgentConversationId(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname;
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    let fullPath = "";
    if (req.headers.host === "localhost:9000") {
      fullPath = pathname;
    } else {
      const host = req.headers["eo-pages-host"];
      const xForwardedProto = req.headers["x-forwarded-proto"];
      fullPath = (xForwardedProto || "https") + "://" + host + req.url;
      if (fullPath.endsWith("?")) {
        fullPath = fullPath.slice(0, -1);
      }
    }
    console.log(`Makers request path: ${fullPath}`);
    let response = null;
    if (pathname.startsWith("/api/")) {
      enhancedRequest = createEdgeoneCompatibleRequest(req, false);
      if (enhancedRequest._bodyPreloadPromise) {
        try {
          await enhancedRequest._bodyPreloadPromise;
        } catch (error) {
          console.warn("Body preload failed:", error.message);
        }
      }
      context = createCloudFunctionContext({
        req,
        safeGeo,
        request: enhancedRequest,
        params: {},
        conversation_id: agentConversationId
      });
      stripInternalRequestHeaders(req);
      const routeMatch = pathname.slice("/api/".length);
      const cleanPath = routeMatch.startsWith("/") ? routeMatch.slice(1) : routeMatch;
      if (cleanPath) {
        const params = {};
        params["default"] = cleanPath.split("/");
        context.params = params;
        const mod_0 = (() => {
          var __create = Object.create;
          var __defProp = Object.defineProperty;
          var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
          var __getOwnPropNames = Object.getOwnPropertyNames;
          var __getProtoOf = Object.getPrototypeOf;
          var __hasOwnProp = Object.prototype.hasOwnProperty;
          var __commonJS = (cb, mod) => function __require2() {
            return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
          };
          var __copyProps = (to, from, except, desc) => {
            if (from && typeof from === "object" || typeof from === "function") {
              for (let key of __getOwnPropNames(from))
                if (!__hasOwnProp.call(to, key) && key !== except)
                  __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
            }
            return to;
          };
          var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
            // If the importer is in node compatibility mode or this is not an ESM
            // file that has been converted to a CommonJS file using a Babel-
            // compatible transform (i.e. "__esModule" has not been set), then set
            // "default" to the CommonJS "module.exports" for node compatibility.
            isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
            mod
          ));
          var require_dist = __commonJS({
            "node_modules/.pnpm/@edgeone+pages-blob@0.0.16/node_modules/@edgeone/pages-blob/dist/index.js"(exports, module) {
              "use strict";
              var U = Object.defineProperty;
              var le = Object.getOwnPropertyDescriptor;
              var ue = Object.getOwnPropertyNames;
              var ge = Object.prototype.hasOwnProperty;
              var fe = (t, e) => {
                for (var r in e)
                  U(t, r, { get: e[r], enumerable: true });
              };
              var he = (t, e, r, n) => {
                if (e && typeof e == "object" || typeof e == "function")
                  for (let s of ue(e))
                    !ge.call(t, s) && s !== r && U(t, s, { get: () => e[s], enumerable: !(n = le(e, s)) || n.enumerable });
                return t;
              };
              var me = (t) => he(U({}, "__esModule", { value: true }), t);
              var Oe = {};
              fe(Oe, { InvalidKeyError: () => w, InvalidStoreNameError: () => y, MissingProjectIdError: () => T, PagesBlobError: () => h, PreconditionFailedError: () => x, QuotaExceededError: () => O, RateLimitedError: () => j, Store: () => E, getStore: () => Me, listStores: () => De });
              module.exports = me(Oe);
              var h = class extends Error {
                code;
                constructor(e, r) {
                  super(`PagesBlob: ${r}`), this.name = "PagesBlobError", this.code = e;
                }
              };
              var w = class extends h {
                constructor(e) {
                  super("INVALID_KEY", e);
                }
              };
              var y = class extends h {
                constructor(e) {
                  super("INVALID_STORE_NAME", e);
                }
              };
              var b = class extends h {
                constructor(e) {
                  super("MISSING_ENVIRONMENT", `Environment not configured for Pages Blob. Missing: ${e.join(", ")}. Supply these properties when creating a store, or ensure the function is running in a Pages environment.`);
                }
              };
              var O = class extends h {
                constructor() {
                  super("QUOTA_EXCEEDED", "storage quota exceeded");
                }
              };
              var j = class extends h {
                constructor() {
                  super("RATE_LIMITED", "request rate limited, please retry later");
                }
              };
              var T = class extends h {
                constructor() {
                  super("MISSING_PROJECT_ID", "projectId is required when using API token mode. Please supply { name, projectId, token } to getStore() / listStores().");
                }
              };
              var m = class extends h {
                constructor(e) {
                  super("CREDENTIAL_ERROR", e);
                }
              };
              var f = class extends h {
                constructor(e, r) {
                  super("COS_ERROR", `COS returned ${e}: ${r}`);
                }
              };
              var x = class extends h {
                constructor() {
                  super("PRECONDITION_FAILED", "conditional write failed (key already exists)");
                }
              };
              function C(t) {
                if (t === "")
                  throw new w("Blob key must not be empty.");
                if (t.startsWith("/") || t.startsWith("%2F"))
                  throw new w("Blob key must not start with forward slash (/).");
                if (new TextEncoder().encode(t).length > 600)
                  throw new w("Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long.");
              }
              function z(t) {
                if (t === "")
                  throw new y("Store name must not be empty.");
                if (t.includes("/") || t.includes(":"))
                  throw new y("Store name must not contain forward slashes (/) or colons (:).");
                if (!/^[a-zA-Z0-9_-]+$/.test(t))
                  throw new y("Store name must only contain letters, digits, underscores, and hyphens.");
                if (new TextEncoder().encode(t).length > 64)
                  throw new y("Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long.");
              }
              var E = class {
                cosClient;
                storeName;
                defaultConsistency;
                constructor(e, r, n = "eventual") {
                  this.cosClient = e, this.storeName = r, this.defaultConsistency = n;
                }
                resolveConsistency(e) {
                  return e ?? this.defaultConsistency;
                }
                async set(e, r, n) {
                  C(e);
                  let s = await this.cosClient.putObject(this.storeName, e, r, { onlyIfNew: n == null ? void 0 : n.onlyIfNew, cacheControl: n == null ? void 0 : n.cacheControl });
                  if ((n == null ? void 0 : n.onlyIfNew) && s.statusCode === 412)
                    throw new x();
                }
                async setJSON(e, r, n) {
                  C(e);
                  let s = JSON.stringify(r), i = await this.cosClient.putObject(this.storeName, e, s, { onlyIfNew: n == null ? void 0 : n.onlyIfNew, contentType: "application/json", cacheControl: n == null ? void 0 : n.cacheControl });
                  if ((n == null ? void 0 : n.onlyIfNew) && i.statusCode === 412)
                    throw new x();
                }
                async createUploadUrl(e, r) {
                  C(e);
                  let { url: n, expiresAt: s } = await this.cosClient.createPresignedPutUrl(this.storeName, e, { expireSeconds: r == null ? void 0 : r.expireSeconds, contentType: r == null ? void 0 : r.contentType });
                  return { url: n, key: e, expiresAt: s };
                }
                async get(e, r) {
                  C(e);
                  let n = this.resolveConsistency(r == null ? void 0 : r.consistency), s = await this.cosClient.getObject(this.storeName, e, n);
                  if (s === null)
                    return null;
                  let { body: i } = s, a = (r == null ? void 0 : r.type) ?? "text", o = new TextDecoder("utf-8");
                  switch (a) {
                    case "text":
                      return o.decode(i);
                    case "json":
                      return JSON.parse(o.decode(i));
                    case "arrayBuffer":
                      return i.buffer.slice(i.byteOffset, i.byteOffset + i.byteLength);
                    case "blob":
                      return new Blob([i]);
                    case "stream":
                      return new ReadableStream({ start(c) {
                        c.enqueue(i), c.close();
                      } });
                    default:
                      return o.decode(i);
                  }
                }
                async getMetadata(e, r) {
                  C(e);
                  let n = this.resolveConsistency(r == null ? void 0 : r.consistency);
                  return this.cosClient.headObject(this.storeName, e, n);
                }
                async getWithHeaders(e, r) {
                  C(e);
                  let n = this.resolveConsistency(r == null ? void 0 : r.consistency), s = await this.cosClient.getObject(this.storeName, e, n);
                  return s ? { body: new TextDecoder("utf-8").decode(s.body), headers: s.headers || {} } : null;
                }
                async delete(e) {
                  C(e), await this.cosClient.deleteObject(this.storeName, e);
                }
                async list(e) {
                  let r = (e == null ? void 0 : e.paginate) !== false, n = e == null ? void 0 : e.limit, s = [], i = [], a = this.resolveConsistency(e == null ? void 0 : e.consistency), o = (e == null ? void 0 : e.cursor) || "", c = true, d;
                  for (; c; ) {
                    let u = n !== void 0 ? n - s.length : 1e3, l = Math.min(u, 1e3);
                    if (l <= 0)
                      break;
                    let g = await this.cosClient.listObjects(this.storeName, { prefix: e == null ? void 0 : e.prefix, delimiter: (e == null ? void 0 : e.directories) ? "/" : void 0, marker: o || void 0, maxKeys: l, consistency: a });
                    for (let p of g.contents)
                      s.push({ key: p.key, etag: p.etag });
                    i.push(...g.commonPrefixes), n !== void 0 && s.length >= n ? (s.length = n, (g.isTruncated || g.contents.length === l) && (d = g.nextMarker), c = false) : g.isTruncated ? !r && n === void 0 ? (d = g.nextMarker, c = false) : o = g.nextMarker : c = false;
                  }
                  return { blobs: s, directories: i, ...d ? { cursor: d } : {} };
                }
              };
              var ye = new TextEncoder();
              function _(t) {
                let e = ye.encode(t), r = new ArrayBuffer(e.byteLength), n = new Uint8Array(r);
                return n.set(e), n;
              }
              function G(t) {
                let e = t instanceof Uint8Array ? t : new Uint8Array(t), r = "";
                for (let n = 0; n < e.length; n++)
                  r += e[n].toString(16).padStart(2, "0");
                return r;
              }
              async function H(t, e) {
                let r = await crypto.subtle.importKey("raw", _(t), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]), n = await crypto.subtle.sign("HMAC", r, _(e));
                return G(n);
              }
              async function pe(t) {
                let e = await crypto.subtle.digest("SHA-1", _(t));
                return G(e);
              }
              function $(t) {
                return encodeURIComponent(t).replace(/[!'()*]/g, (e) => "%" + e.charCodeAt(0).toString(16).toUpperCase());
              }
              function P(t) {
                try {
                  return decodeURIComponent(t);
                } catch {
                  return t;
                }
              }
              function we(t) {
                return t.split("/").map((e) => P(e)).join("/");
              }
              function I(t) {
                return we(P(t));
              }
              function W(t) {
                return t.split("/").map((e) => $(P(e))).join("/");
              }
              var Ce = /* @__PURE__ */ new Set(["cache-control", "content-disposition", "content-encoding", "content-length", "content-md5", "content-type", "expect", "expires", "if-match", "if-modified-since", "if-none-match", "if-unmodified-since", "origin", "range", "transfer-encoding"]);
              function xe(t) {
                return t === "host" || t === "x-cos-security-token" ? false : !!(Ce.has(t) || t.startsWith("x-cos-"));
              }
              function X(t) {
                if (!t)
                  return [];
                let e = [];
                for (let [r, n] of Object.entries(t))
                  n != null && e.push([r.toLowerCase(), String(n)]);
                return e.sort(([r], [n]) => r < n ? -1 : r > n ? 1 : 0), e;
              }
              function Y(t) {
                return t.map(([e, r]) => `${$(e)}=${$(r)}`).join("&");
              }
              function F(t) {
                return t.map(([e]) => $(e)).join(";");
              }
              async function V(t) {
                let e = t.method.toLowerCase(), r = t.pathname.startsWith("/") ? t.pathname : `/${t.pathname}`, n = Math.floor(Date.now() / 1e3), s = n + (t.expireSeconds ?? 3600), i = `${n};${s}`, o = X(t.headers).filter(([N]) => xe(N)), c = F(o), d = Y(o), u = X(t.query), l = F(u), g = Y(u), p = `${e}
${r}
${g}
${d}
`, oe = `sha1
${i}
${await pe(p)}
`, ie = await H(t.secretKey, i), ae = await H(ie, oe), ce = ["q-sign-algorithm=sha1", `q-ak=${t.secretId}`, `q-sign-time=${i}`, `q-key-time=${i}`, `q-header-list=${c}`, `q-url-param-list=${l}`, `q-signature=${ae}`].join("&"), q = {};
                for (let [N, de] of o)
                  q[N] = de;
                return { authorization: ce, signedHeaders: q };
              }
              async function J(t) {
                let e = new URL(t.domain), r = P(t.key), n = `/${I(t.key)}`, s = `/${W(r)}`;
                e.pathname = s;
                let { authorization: i } = await V({ method: t.method, pathname: n, query: t.query, headers: t.headers, secretId: t.credential.secretId, secretKey: t.credential.secretKey, expireSeconds: t.expireSeconds });
                if (t.query)
                  for (let [a, o] of Object.entries(t.query))
                    o != null && e.searchParams.set(a, String(o));
                for (let a of i.split("&")) {
                  let o = a.indexOf("=");
                  if (o === -1)
                    continue;
                  let c = a.slice(0, o), d = a.slice(o + 1);
                  e.searchParams.set(c, d);
                }
                return t.credential.sessionToken && e.searchParams.set("x-cos-security-token", t.credential.sessionToken), e.toString();
              }
              async function S(t) {
                let e = new URL(t.domain), r = t.key ? P(t.key) : "", n = t.key ? `/${I(t.key)}` : "/", s = r ? `/${W(r)}` : "/";
                if (e.pathname = s, t.query)
                  for (let [l, g] of Object.entries(t.query))
                    g != null && e.searchParams.set(l, String(g));
                let { authorization: i } = await V({ method: t.method, pathname: n, query: t.query, headers: t.headers, secretId: t.credential.secretId, secretKey: t.credential.secretKey }), a = new Headers();
                if (t.headers)
                  for (let [l, g] of Object.entries(t.headers))
                    g != null && a.set(l, String(g));
                a.set("Authorization", i), t.credential.sessionToken && a.set("x-cos-security-token", t.credential.sessionToken);
                let o = e.toString(), c = { method: t.method, headers: a, body: t.body ?? void 0, signal: t.signal }, d = 2, u;
                for (let l = 0; l <= d; l++)
                  try {
                    return await fetch(o, c);
                  } catch (g) {
                    if (u = g, g instanceof DOMException && g.name === "AbortError")
                      throw g;
                    l < d && await new Promise((p) => setTimeout(p, 1e3 * (l + 1)));
                  }
                throw u;
              }
              var be = "blob.edgeone.site";
              var Te = "blob-nocache.edgeone.site";
              var M = class t {
                credentialManager;
                bucket = "";
                region = "";
                keyPrefix = "";
                cachedDomain = "";
                uncachedDomain = "";
                initialized = false;
                static buildErrorDetail(e, r, n, s, i) {
                  let a = n ? `${r}/${n}` : r, o = i ? ` [request-id: ${i}]` : "";
                  return `${e} ${a} - ${Ee(s)}${o}`;
                }
                constructor(e) {
                  this.credentialManager = e;
                }
                computeSubdomain(e) {
                  let r = [];
                  if (e.appId && r.push(e.appId), e.zoneId && r.push(e.zoneId), e.projectId && r.push(e.projectId), r.length >= 2)
                    return r.join("-");
                  if (e.resourcePrefix) {
                    let s = e.resourcePrefix.replace(/\/?\*$/, "").split("/").filter(Boolean);
                    if (s.length >= 2)
                      return s.slice(0, Math.min(s.length, 3)).join("-");
                  }
                  return "";
                }
                async ensureInitialized() {
                  if (this.initialized)
                    return;
                  let e = await this.credentialManager.getCredential();
                  !this.keyPrefix && e.resourcePrefix && (this.keyPrefix = e.resourcePrefix.replace(/\/?\*$/, ""));
                  let r = e.edgeRegion === "CN", n = e.cosMainland, s = e.cosOverseas, i = r ? n || s : s || n;
                  !this.bucket && i && (this.bucket = i.bucket, this.region = i.region);
                  let a = this.computeSubdomain(e);
                  if (!a)
                    throw new f(0, "unable to derive tenant subdomain from credential; missing appId/zoneId/projectId or resourcePrefix");
                  this.cachedDomain = `https://${a}.${be}`, this.uncachedDomain = `https://${a}.${Te}`, this.initialized = true;
                }
                async resolveDomain(e) {
                  return await this.ensureInitialized(), e === "strong" ? this.uncachedDomain : this.cachedDomain;
                }
                async resolveCredential() {
                  let e = await this.credentialManager.getCredential();
                  return { secretId: e.tmpSecretId, secretKey: e.tmpSecretKey, sessionToken: e.sessionToken };
                }
                buildCosKey(e, r) {
                  return `${this.keyPrefix}/${e}/${r}`;
                }
                async getDomains() {
                  return await this.ensureInitialized(), { cached: this.cachedDomain, uncached: this.uncachedDomain };
                }
                async putObject(e, r, n, s) {
                  let i = await this.resolveDomain("strong"), a = await this.resolveCredential(), o = this.buildCosKey(e, r), d = (s == null ? void 0 : s.cacheControl) === null ? void 0 : (s == null ? void 0 : s.cacheControl) ?? "max-age=0, stale-while-revalidate=60", u = {};
                  (s == null ? void 0 : s.onlyIfNew) && (u["If-None-Match"] = "*"), d && (u["Cache-Control"] = d), (s == null ? void 0 : s.contentType) && (u["Content-Type"] = s.contentType);
                  try {
                    let l = await S({ domain: i, method: "PUT", key: o, headers: u, body: n, credential: a });
                    if (l.status === 412)
                      return await l.arrayBuffer().catch(() => {
                      }), { etag: "", statusCode: 412 };
                    if (!l.ok) {
                      let p = await k(l);
                      throw new f(l.status, t.buildErrorDetail("PUT", i, o, p || `status ${l.status}`, R(l)));
                    }
                    let g = l.headers.get("etag") || "";
                    return await l.arrayBuffer().catch(() => {
                    }), { etag: g, statusCode: l.status };
                  } catch (l) {
                    throw l instanceof f ? l : new f(0, t.buildErrorDetail("PUT", i, o, A(l)));
                  }
                }
                async createPresignedPutUrl(e, r, n) {
                  let s = await this.resolveDomain("strong"), i = await this.resolveCredential(), a = this.buildCosKey(e, r), o = {};
                  (n == null ? void 0 : n.contentType) && (o["Content-Type"] = n.contentType);
                  let c = (n == null ? void 0 : n.expireSeconds) ?? 3600, d = await J({ domain: s, method: "PUT", key: a, headers: o, credential: i, expireSeconds: c }), u = Math.floor(Date.now() / 1e3) + c;
                  return { url: d, expiresAt: u };
                }
                async getObject(e, r, n) {
                  let s = await this.resolveDomain(n), i = await this.resolveCredential(), a = this.buildCosKey(e, r);
                  try {
                    let o = await S({ domain: s, method: "GET", key: a, credential: i });
                    if (o.status === 404)
                      return await o.arrayBuffer().catch(() => {
                      }), null;
                    if (!o.ok) {
                      let u = await k(o);
                      throw new f(o.status, t.buildErrorDetail("GET", s, a, u || `status ${o.status}`, R(o)));
                    }
                    let c = new Uint8Array(await o.arrayBuffer()), d = Z(o.headers);
                    return { body: c, contentType: d["content-type"], headers: d };
                  } catch (o) {
                    throw o instanceof f ? o : new f(0, t.buildErrorDetail("GET", s, a, A(o)));
                  }
                }
                async headObject(e, r, n) {
                  let s = await this.resolveDomain(n), i = await this.resolveCredential(), a = this.buildCosKey(e, r);
                  try {
                    let o = await S({ domain: s, method: "HEAD", key: a, credential: i });
                    if (o.status === 404)
                      return null;
                    if (!o.ok) {
                      let d = await k(o);
                      throw new f(o.status, t.buildErrorDetail("HEAD", s, a, d || `status ${o.status}`, R(o)));
                    }
                    let c = Z(o.headers);
                    return { cacheControl: c["cache-control"], contentType: c["content-type"], etag: c.etag, headers: c };
                  } catch (o) {
                    throw o instanceof f ? o : new f(0, t.buildErrorDetail("HEAD", s, a, A(o)));
                  }
                }
                async deleteObject(e, r) {
                  let n = await this.resolveDomain("strong"), s = await this.resolveCredential(), i = this.buildCosKey(e, r);
                  try {
                    let a = await S({ domain: n, method: "DELETE", key: i, credential: s });
                    if (a.status === 204 || a.status === 404 || a.ok) {
                      await a.arrayBuffer().catch(() => {
                      });
                      return;
                    }
                    let o = await k(a);
                    throw new f(a.status, t.buildErrorDetail("DELETE", n, i, o || `status ${a.status}`, R(a)));
                  } catch (a) {
                    throw a instanceof f ? a : new f(0, t.buildErrorDetail("DELETE", n, i, A(a)));
                  }
                }
                async listObjects(e, r) {
                  await this.ensureInitialized();
                  let n = `${this.keyPrefix}/${e}/`, s = (r == null ? void 0 : r.prefix) ? n + r.prefix : n, i = await this.getBucketRaw({ prefix: s, delimiter: r == null ? void 0 : r.delimiter, marker: r == null ? void 0 : r.marker, maxKeys: r == null ? void 0 : r.maxKeys, consistency: r == null ? void 0 : r.consistency }), a = i.contents.map((c) => {
                    let d = c.key, u = d.startsWith(n) ? d.slice(n.length) : d;
                    return u ? { key: u, etag: c.etag } : null;
                  }).filter((c) => c !== null), o = i.commonPrefixes.map((c) => c.startsWith(n) ? c.slice(n.length) : c).filter((c) => !!c);
                  return { contents: a, commonPrefixes: o, isTruncated: i.isTruncated, nextMarker: i.nextMarker };
                }
                async listStores(e) {
                  let r = [], n = "", s = true;
                  for (; s; ) {
                    await this.ensureInitialized();
                    let i = `${this.keyPrefix}/`, a = await this.getBucketRaw({ prefix: i, delimiter: "/", maxKeys: 1e3, marker: n || void 0, consistency: e });
                    for (let o of a.commonPrefixes) {
                      let c = o.startsWith(i) ? o.slice(i.length, -1) : o.slice(0, -1);
                      c && r.push(c);
                    }
                    if (s = a.isTruncated, n = a.nextMarker, !s || !n)
                      break;
                  }
                  return r;
                }
                async getBucketRaw(e) {
                  let r = await this.resolveDomain(e.consistency), n = await this.resolveCredential(), s = { prefix: I(e.prefix) };
                  e.delimiter && (s.delimiter = e.delimiter), e.marker && (s.marker = I(e.marker)), e.maxKeys && (s["max-keys"] = e.maxKeys);
                  try {
                    let i = await S({ domain: r, method: "GET", query: s, credential: n });
                    if (!i.ok) {
                      let o = await k(i);
                      throw new f(i.status, t.buildErrorDetail("LIST", r, e.prefix, o || `status ${i.status}`, R(i)));
                    }
                    let a = await i.text();
                    return Se(a);
                  } catch (i) {
                    throw i instanceof f ? i : new f(0, t.buildErrorDetail("LIST", r, e.prefix, A(i)));
                  }
                }
              };
              function Ee(t) {
                return t.replace(/[a-zA-Z0-9\-]+\.cos\.[a-zA-Z0-9\-.]+\.myqcloud\.com/gi, "[cos-origin]").replace(/[a-zA-Z0-9\-]+\.cos\.[a-zA-Z0-9\-.]+\.tencentcos\.cn/gi, "[cos-origin]");
              }
              async function k(t) {
                try {
                  return await t.text();
                } catch {
                  return "";
                }
              }
              function R(t) {
                return t.headers.get("x-cos-request-id") || t.headers.get("x-eo-log-id") || void 0;
              }
              function A(t) {
                let e = t, r = e.message || String(t), n = e.cause;
                if (n) {
                  let s = n.message || n.code || "";
                  return s ? `${r} (${s})` : r;
                }
                return r;
              }
              function Z(t) {
                let e = {};
                return t.forEach((r, n) => {
                  e[n.toLowerCase()] = r;
                }), e;
              }
              function Se(t) {
                let e = [], r = /<Contents>([\s\S]*?)<\/Contents>/g, n;
                for (; (n = r.exec(t)) !== null; ) {
                  let d = n[1], u = v(d, "Key"), l = v(d, "ETag");
                  u !== null && e.push({ key: L(u), etag: l || "" });
                }
                let s = [], i = /<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g;
                for (; (n = i.exec(t)) !== null; ) {
                  let d = n[1], u = v(d, "Prefix");
                  u !== null && s.push(L(u));
                }
                let o = v(t, "IsTruncated") === "true", c = v(t, "NextMarker") || "";
                return { contents: e, commonPrefixes: s, isTruncated: o, nextMarker: L(c) };
              }
              function v(t, e) {
                let n = new RegExp(`<${e}>([\\s\\S]*?)<\\/${e}>`).exec(t);
                return n ? n[1] : null;
              }
              function L(t) {
                return t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
              }
              var Pe = "X-RateLimit-Reset";
              async function B(t, e, r = 2) {
                var _a, _b;
                (_b = (_a = e.signal) == null ? void 0 : _a.throwIfAborted) == null ? void 0 : _b.call(_a);
                try {
                  let n = await fetch(t, e);
                  if (r > 0 && (n.status === 429 || n.status >= 500)) {
                    let s = Q(n.headers.get(Pe));
                    return await ee(s, e.signal), B(t, e, r - 1);
                  }
                  return n;
                } catch (n) {
                  if (r === 0 || n instanceof DOMException && n.name === "AbortError")
                    throw n;
                  let s = Q();
                  return await ee(s, e.signal), B(t, e, r - 1);
                }
              }
              function Q(t) {
                return t ? Math.max(Number(t) * 1e3 - Date.now(), 500) : 1500;
              }
              function ee(t, e) {
                return new Promise((r, n) => {
                  if (e == null ? void 0 : e.aborted)
                    return n(e.reason);
                  let s = setTimeout(() => {
                    e == null ? void 0 : e.removeEventListener("abort", i), r();
                  }, t), i = () => {
                    clearTimeout(s), n(e.reason);
                  };
                  e == null ? void 0 : e.addEventListener("abort", i, { once: true });
                });
              }
              var Ie = "prod";
              function te() {
                let t = typeof process < "u" ? process.env.PAGES_BLOB_STS_ENV : void 0;
                return t === "test" || t === "prod" ? t : Ie;
              }
              var ke = 300;
              var Re = "https://blob-sts.edgeone.site/";
              var D = class {
                authToken;
                projectId;
                cached = null;
                constructor(e, r) {
                  this.authToken = e, this.projectId = r;
                }
                async getCredential() {
                  if (this.cached && !this.isExpired(this.cached))
                    return this.cached;
                  let e = await this.fetchCredential();
                  return this.cached = e, e;
                }
                clearCache() {
                  this.cached = null;
                }
                isExpired(e) {
                  let r = Math.floor(Date.now() / 1e3);
                  return e.expiredTime - r < ke;
                }
                async fetchCredential() {
                  for (let n = 1; n <= 3; n++) {
                    let s = new AbortController(), i = setTimeout(() => s.abort(), 1e4), a;
                    try {
                      a = await B(Re, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.authToken}`, "X-Env": te() }, body: JSON.stringify(this.projectId ? { ProjectId: this.projectId } : {}), signal: s.signal });
                    } catch (d) {
                      if (n < 3) {
                        await K(500 * n);
                        continue;
                      }
                      throw new m(`failed to obtain STS credential: ${d.message || "timeout"}`);
                    } finally {
                      clearTimeout(i);
                    }
                    if (a.status === 413)
                      throw new m("storage quota exceeded");
                    if (a.status === 429)
                      throw new m("rate limited, please retry later");
                    if (!a.ok) {
                      if (a.status >= 500 && n < 3) {
                        await K(500 * n);
                        continue;
                      }
                      let d = await a.text().catch(() => "unknown error");
                      throw new m(`failed to obtain STS credential: ${a.status} ${d}`);
                    }
                    let o = await a.json(), c = o.data && typeof o.data == "object" ? o.data : o;
                    if (c.tmpSecretId && c.tmpSecretKey && c.sessionToken && c.expiredTime) {
                      let d = c.cosMainland, u = c.cosOverseas, l = a.headers.get("X-Edge-Region") || void 0;
                      return { tmpSecretId: c.tmpSecretId, tmpSecretKey: c.tmpSecretKey, sessionToken: c.sessionToken, expiredTime: c.expiredTime, appId: c.appId || void 0, zoneId: c.zoneId || void 0, projectId: c.projectId || void 0, resourcePrefix: c.resourcePrefix || void 0, cosMainland: d || void 0, cosOverseas: u || void 0, edgeRegion: l };
                    }
                    if (c.code !== void 0 && c.code !== 0) {
                      let d = c.msg || c.message || "unknown error";
                      throw new m(`credential exchange failed (code=${c.code}): ${d}`);
                    }
                    if (o.code !== void 0 && o.code !== 0) {
                      let d = o.msg || o.message || "unknown error";
                      throw new m(`credential exchange failed (code=${o.code}): ${d}`);
                    }
                    if (n < 3) {
                      await K(500 * n);
                      continue;
                    }
                    throw new m("invalid STS credential response");
                  }
                  throw new m("invalid STS credential response");
                }
              };
              function K(t) {
                return new Promise((e) => setTimeout(e, t));
              }
              var Ae = "{{PAGES_BLOB_DEPLOY_CREDENTIAL}}";
              function re() {
                let t = {}, e = ve();
                if (e)
                  t.deployCredential = e;
                else {
                  let n = ne("PAGES_BLOB_DEPLOY_CREDENTIAL");
                  n && (t.deployCredential = n);
                }
                let r = ne("PAGES_PROJECT_ID");
                return r && (t.projectId = r), t;
              }
              function ve() {
                let t = Ae;
                if (!(t.startsWith("{{") && t.endsWith("}}")))
                  return t || void 0;
              }
              function ne(t) {
                if (typeof process < "u" && process.env)
                  return process.env[t];
              }
              function Me(t) {
                let e = typeof t == "string" ? t : t.name;
                z(e);
                let r = se(typeof t == "string" ? void 0 : t), n = new D(r.authToken, r.projectId), s = new M(n);
                return new E(s, e, r.consistency ?? "eventual");
              }
              async function De(t) {
                let e = se(t ? { name: "__list__", projectId: t.projectId, token: t.token, consistency: t.consistency } : void 0), r = new D(e.authToken, e.projectId);
                return { stores: (await new M(r).listStores(e.consistency)).map((i) => ({ name: i })) };
              }
              function se(t) {
                let e = re(), r = (t == null ? void 0 : t.token) || e.deployCredential, n = (t == null ? void 0 : t.projectId) || e.projectId;
                if ((t == null ? void 0 : t.token) || e.projectId) {
                  if (!n)
                    throw new T();
                  if (!r)
                    throw new b(["token"]);
                  return { authToken: r, projectId: n, consistency: t == null ? void 0 : t.consistency };
                }
                if ((t == null ? void 0 : t.projectId) && !r)
                  throw new b(["token"]);
                if (!e.deployCredential)
                  throw new b(["deployCredential"]);
                return { authToken: e.deployCredential, consistency: t == null ? void 0 : t.consistency };
              }
            }
          });
          var import_pages_blob = __toESM(require_dist());
          var PLANS = Object.freeze([
            Object.freeze({
              id: "monthly",
              name: "\u6708\u5EA6\u8BA2\u9605",
              amountCny: 29,
              durationDays: 30,
              suffix: "/\u6708",
              note: "\u9002\u5408\u77ED\u671F\u7075\u6D3B\u4F7F\u7528"
            }),
            Object.freeze({
              id: "yearly",
              name: "\u5E74\u5EA6\u8BA2\u9605",
              amountCny: 199,
              durationDays: 365,
              suffix: "/\u5E74",
              note: "\u6BD4\u6309\u6708\u652F\u4ED8\u8282\u7701 149 \u5143"
            }),
            Object.freeze({
              id: "lifetime",
              name: "\u6C38\u4E45\u4E70\u65AD",
              amountCny: 599,
              durationDays: null,
              suffix: "/\u6C38\u4E45",
              note: "\u4E00\u6B21\u4ED8\u8D39\uFF0C\u957F\u671F\u4F7F\u7528\u5F53\u524D\u6838\u5FC3\u529F\u80FD"
            })
          ]);
          function getPlan(planId) {
            return PLANS.find((plan) => plan.id === planId) ?? null;
          }
          var DAY_MS = 24 * 60 * 60 * 1e3;
          function applyConfirmedOrder({ current, order, confirmedAt }) {
            if (current == null ? void 0 : current.isLifetime) {
              return { plan: "lifetime", expiresAt: null, isLifetime: true };
            }
            const plan = getPlan(order.plan);
            if (!plan)
              throw new Error("INVALID_PLAN");
            const durationDays = Number.isInteger(order.durationDays) && order.durationDays > 0 ? order.durationDays : plan.durationDays;
            if (durationDays === null) {
              return { plan: plan.id, expiresAt: null, isLifetime: true };
            }
            const confirmedMs = Date.parse(confirmedAt);
            const currentExpiryMs = (current == null ? void 0 : current.expiresAt) ? Date.parse(current.expiresAt) : Number.NaN;
            const startsAt = Number.isFinite(currentExpiryMs) && currentExpiryMs > confirmedMs ? currentExpiryMs : confirmedMs;
            return {
              plan: plan.id,
              expiresAt: new Date(startsAt + durationDays * DAY_MS).toISOString(),
              isLifetime: false
            };
          }
          function computeEntitlement({ user, confirmedOrders = [], paid: suppliedPaid, now }) {
            if (user.role === "admin") {
              return { phase: "admin", hasAccess: true, plan: "admin", expiresAt: null, trialEndsAt: user.trialEndsAt ?? null };
            }
            if (user.status === "suspended") {
              return { phase: "suspended", hasAccess: false, plan: null, expiresAt: null, trialEndsAt: user.trialEndsAt ?? null };
            }
            const paid = suppliedPaid === void 0 ? [...confirmedOrders].sort((left, right) => Date.parse(left.confirmedAt) - Date.parse(right.confirmedAt)).reduce((current, order) => applyConfirmedOrder({ current, order, confirmedAt: order.confirmedAt }), null) : suppliedPaid;
            if (paid == null ? void 0 : paid.isLifetime) {
              return { phase: "active_lifetime", hasAccess: true, ...paid, trialEndsAt: user.trialEndsAt ?? null };
            }
            if ((paid == null ? void 0 : paid.expiresAt) && Date.parse(paid.expiresAt) > Date.parse(now)) {
              return { phase: `active_${paid.plan}`, hasAccess: true, ...paid, trialEndsAt: user.trialEndsAt ?? null };
            }
            if (user.trialEndsAt && Date.parse(user.trialEndsAt) > Date.parse(now)) {
              return {
                phase: "trialing",
                hasAccess: true,
                plan: null,
                expiresAt: null,
                trialEndsAt: user.trialEndsAt
              };
            }
            return {
              phase: "expired",
              hasAccess: false,
              plan: null,
              expiresAt: null,
              trialEndsAt: user.trialEndsAt ?? null
            };
          }
          function confirmedOrderKey(userId, orderId) {
            return `v1/confirmed-orders-by-user/${userId}/${orderId}.json`;
          }
          async function confirmedForUser(repository, userId) {
            const keys = await repository.list(`v1/confirmed-orders-by-user/${userId}/`);
            const currentEvents = await Promise.all(keys.map((key) => repository.getJson(key)));
            const migrationKey = `v1/migrations/confirmed-orders-by-user/${userId}.json`;
            const migrated = await repository.getJson(migrationKey);
            let legacyEvents = [];
            if (!migrated) {
              const legacyKeys = await repository.list("v1/confirmed-orders/");
              legacyEvents = (await Promise.all(legacyKeys.map((key) => repository.getJson(key)))).filter((event) => (event == null ? void 0 : event.userId) === userId);
              await Promise.all(legacyEvents.map(async (event) => {
                try {
                  await repository.setJson(confirmedOrderKey(userId, event.orderId), event, { onlyIfNew: true });
                } catch (error) {
                  if ((error == null ? void 0 : error.code) !== "ALREADY_EXISTS")
                    throw error;
                }
              }));
              await repository.setJson(migrationKey, { migratedAt: (/* @__PURE__ */ new Date()).toISOString() });
            }
            const byOrderId = new Map([...currentEvents, ...legacyEvents].filter(Boolean).map((event) => [event.orderId, event]));
            const events = [...byOrderId.values()].sort((left, right) => left.confirmedAt.localeCompare(right.confirmedAt));
            const decisionMigrationKey = `v1/migrations/order-decisions-by-user/${userId}.json`;
            if (!await repository.getJson(decisionMigrationKey)) {
              await Promise.all(events.map(async (event) => {
                try {
                  await repository.setJson(`v1/order-decisions/${event.orderId}.json`, {
                    orderId: event.orderId,
                    userId: event.userId,
                    type: "confirmed",
                    decidedAt: event.confirmedAt,
                    decidedBy: event.confirmedBy ?? "legacy-system",
                    decidedByUsername: event.confirmedByUsername ?? "\u5386\u53F2\u7BA1\u7406\u5458",
                    adminNote: ""
                  }, { onlyIfNew: true });
                } catch (error) {
                  if ((error == null ? void 0 : error.code) !== "ALREADY_EXISTS")
                    throw error;
                }
              }));
              await repository.setJson(decisionMigrationKey, { migratedAt: (/* @__PURE__ */ new Date()).toISOString() });
            }
            return events;
          }
          async function paidEntitlementForUser(repository, userId) {
            const events = await confirmedForUser(repository, userId);
            if (events.length === 0) {
              const legacyCache = await repository.getJson(`v1/entitlements/${userId}.json`);
              if (legacyCache)
                return legacyCache.paid ?? legacyCache;
            }
            return events.reduce(
              (current, event) => applyConfirmedOrder({ current, order: event, confirmedAt: event.confirmedAt }),
              null
            );
          }
          var HttpError = class extends Error {
            constructor(status, code, message) {
              super(message);
              this.status = status;
              this.code = code;
            }
          };
          function jsonResponse(body, status = 200, headers = {}) {
            return new Response(JSON.stringify(body), {
              status,
              headers: {
                "cache-control": "no-store",
                "content-type": "application/json; charset=utf-8",
                ...headers
              }
            });
          }
          function emptyResponse(status = 204, headers = {}) {
            return new Response(null, {
              status,
              headers: { "cache-control": "no-store", ...headers }
            });
          }
          async function readJson(request) {
            try {
              const value = await request.json();
              if (!value || typeof value !== "object" || Array.isArray(value))
                throw new Error("Expected an object");
              return value;
            } catch {
              throw new HttpError(400, "INVALID_JSON", "\u8BF7\u6C42\u5185\u5BB9\u683C\u5F0F\u9519\u8BEF");
            }
          }
          function requireSameOrigin(request) {
            const host = request.headers.get("host");
            if (!host)
              return;
            const origin = request.headers.get("origin");
            if (origin) {
              let originHost;
              try {
                originHost = new URL(origin).host;
              } catch {
                throw new HttpError(403, "INVALID_ORIGIN", "\u8BF7\u6C42\u6765\u6E90\u65E0\u6548\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5");
              }
              if (originHost !== host) {
                throw new HttpError(403, "INVALID_ORIGIN", "\u8BF7\u6C42\u6765\u6E90\u65E0\u6548\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5");
              }
              return;
            }
            const referer = request.headers.get("referer");
            if (referer) {
              let refererHost;
              try {
                refererHost = new URL(referer).host;
              } catch {
                throw new HttpError(403, "INVALID_ORIGIN", "\u8BF7\u6C42\u6765\u6E90\u65E0\u6548\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5");
              }
              if (refererHost !== host) {
                throw new HttpError(403, "INVALID_ORIGIN", "\u8BF7\u6C42\u6765\u6E90\u65E0\u6548\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5");
              }
            }
          }
          function errorResponse(error) {
            if (error instanceof HttpError) {
              return jsonResponse({ error: error.code, message: error.message }, error.status);
            }
            return jsonResponse({ error: "INTERNAL_ERROR", message: "\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" }, 500);
          }
          var scrypt = promisify(scryptCallback);
          var SESSION_COOKIE = "kyrie_session";
          var SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
          async function hashPassword(password) {
            const salt = randomBytes(16);
            const derived = await scrypt(password, salt, 64);
            return `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
          }
          async function verifyPassword(password, encoded) {
            if (typeof encoded !== "string")
              return false;
            const [algorithm, saltValue, hashValue, extra] = encoded.split("$");
            if (algorithm !== "scrypt" || !saltValue || !hashValue || extra !== void 0)
              return false;
            try {
              const expected = Buffer.from(hashValue, "base64url");
              if (expected.length !== 64)
                return false;
              const actual = Buffer.from(await scrypt(password, Buffer.from(saltValue, "base64url"), expected.length));
              return actual.length === expected.length && timingSafeEqual(actual, expected);
            } catch {
              return false;
            }
          }
          function createSessionToken() {
            return randomBytes(32).toString("base64url");
          }
          function hashToken(token) {
            return createHash("sha256").update(token).digest("hex");
          }
          function parseSessionCookie(request) {
            const cookieHeader = request.headers.get("cookie") ?? "";
            for (const item of cookieHeader.split(";")) {
              const [rawName, ...rawValue] = item.trim().split("=");
              if (rawName === SESSION_COOKIE)
                return decodeURIComponent(rawValue.join("="));
            }
            return null;
          }
          function sessionCookie(token) {
            return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
          }
          function expiredSessionCookie() {
            return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
          }
          var IMAGE_TYPES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp"]);
          var MAX_QR_BYTES = 2 * 1024 * 1024;
          var TEMPORARY_PASSWORD_MS = 24 * 60 * 60 * 1e3;
          var IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,80}$/;
          function safeUser(user) {
            return {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              contact: user.contact,
              role: user.role,
              status: user.status,
              passwordResetRequired: user.passwordResetRequired,
              createdAt: user.createdAt,
              trialEndsAt: user.trialEndsAt
            };
          }
          async function listObjects(repository, prefix) {
            const keys = await repository.list(prefix);
            return Promise.all(keys.map((key) => repository.getJson(key)));
          }
          async function findUser(repository, userId) {
            const keys = await repository.list("v1/users/by-name/");
            for (const key of keys) {
              const user = await repository.getJson(key);
              if ((user == null ? void 0 : user.id) === userId)
                return { key, user };
            }
            throw new HttpError(404, "USER_NOT_FOUND", "\u7528\u6237\u4E0D\u5B58\u5728");
          }
          async function invalidateSessions(repository, userId) {
            const keys = await repository.list("v1/sessions/");
            const sessions = await Promise.all(keys.map(async (key) => ({ key, value: await repository.getJson(key) })));
            await Promise.all(sessions.filter((item) => {
              var _a;
              return ((_a = item.value) == null ? void 0 : _a.userId) === userId;
            }).map((item) => repository.delete(item.key)));
          }
          async function rebuildEntitlement(repository, userId) {
            return paidEntitlementForUser(repository, userId);
          }
          function createAdminService({ repository, now, uuid }) {
            async function settleDecision(orderId, candidate) {
              const key = `v1/order-decisions/${orderId}.json`;
              const existing = await repository.getJson(key);
              if (existing)
                return existing;
              try {
                await repository.setJson(key, candidate, { onlyIfNew: true });
                return candidate;
              } catch (error) {
                if ((error == null ? void 0 : error.code) !== "ALREADY_EXISTS")
                  throw error;
                return repository.getJson(key);
              }
            }
            function decisionAdministrator(decision, fallback) {
              return {
                id: decision.decidedBy ?? fallback.id,
                username: decision.decidedByUsername ?? fallback.username
              };
            }
            async function audit(admin, action, targetId, before, after, operationKey) {
              const createdAt = now();
              const key = operationKey ? `v1/audit/by-operation/${operationKey}.json` : `v1/audit/${createdAt}-${uuid()}.json`;
              try {
                await repository.setJson(key, {
                  id: uuid(),
                  adminId: admin.id,
                  adminUsername: admin.username,
                  action,
                  targetId,
                  before,
                  after,
                  createdAt
                }, operationKey ? { onlyIfNew: true } : {});
              } catch (error) {
                if (operationKey && (error == null ? void 0 : error.code) === "ALREADY_EXISTS")
                  return;
                throw error;
              }
            }
            return {
              async listUsers() {
                const users = await listObjects(repository, "v1/users/by-name/");
                return Promise.all(users.map(async (user) => ({
                  ...safeUser(user),
                  entitlement: computeEntitlement({
                    user,
                    paid: await paidEntitlementForUser(repository, user.id),
                    now: now()
                  })
                })));
              },
              async listOrders() {
                const orders = await listObjects(repository, "v1/orders/");
                return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              },
              async confirmOrder(admin, orderId, note) {
                const orderKey = `v1/orders/${orderId}.json`;
                const order = await repository.getJson(orderKey);
                if (!order)
                  throw new HttpError(404, "ORDER_NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
                const eventKey = confirmedOrderKey(order.userId, orderId);
                let event = await repository.getJson(eventKey);
                if (!event && !["pending_review", "confirmed"].includes(order.status))
                  throw new HttpError(409, "ORDER_NOT_READY", "\u8BE5\u8BA2\u5355\u5C1A\u672A\u63D0\u4EA4\u4ED8\u6B3E\u6838\u5B9E");
                const decision = await settleDecision(orderId, {
                  orderId,
                  userId: order.userId,
                  type: "confirmed",
                  decidedAt: (event == null ? void 0 : event.confirmedAt) ?? now(),
                  decidedBy: (event == null ? void 0 : event.confirmedBy) ?? admin.id,
                  decidedByUsername: (event == null ? void 0 : event.confirmedByUsername) ?? admin.username,
                  adminNote: order.adminNote || (note == null ? void 0 : note.trim().slice(0, 200)) || ""
                });
                if ((decision == null ? void 0 : decision.type) !== "confirmed")
                  throw new HttpError(409, "ORDER_ALREADY_REJECTED", "\u8BE5\u8BA2\u5355\u5DF2\u88AB\u5176\u4ED6\u7BA1\u7406\u5458\u62D2\u7EDD");
                event ?? (event = {
                  orderId,
                  userId: order.userId,
                  plan: order.plan,
                  amountCny: order.amountCny,
                  confirmedAt: decision.decidedAt,
                  confirmedBy: decision.decidedBy,
                  confirmedByUsername: decision.decidedByUsername
                });
                if (!await repository.getJson(eventKey)) {
                  try {
                    await repository.setJson(eventKey, event, { onlyIfNew: true });
                  } catch (error) {
                    if ((error == null ? void 0 : error.code) !== "ALREADY_EXISTS")
                      throw error;
                    event = await repository.getJson(eventKey);
                  }
                }
                const updated = { ...order, status: "confirmed", reviewedAt: decision.decidedAt, reviewedBy: decision.decidedBy, adminNote: decision.adminNote || "" };
                await repository.setJson(orderKey, updated);
                const entitlement = await rebuildEntitlement(repository, order.userId);
                await audit(decisionAdministrator(decision, admin), "order.confirmed", orderId, { status: order.status }, { status: updated.status, plan: order.plan }, `order-confirmed-${orderId}`);
                return { order: updated, entitlement };
              },
              async rejectOrder(admin, orderId, note, adminNote) {
                if (typeof note !== "string" || note.trim().length < 2) {
                  throw new HttpError(400, "REJECTION_NOTE_REQUIRED", "\u62D2\u7EDD\u7533\u8BF7\u65F6\u5FC5\u987B\u586B\u5199\u6838\u5BF9\u8BF4\u660E");
                }
                const key = `v1/orders/${orderId}.json`;
                const order = await repository.getJson(key);
                if (!order)
                  throw new HttpError(404, "ORDER_NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
                if (!["pending_review", "rejected"].includes(order.status))
                  throw new HttpError(409, "ORDER_NOT_READY", "\u8BE5\u8BA2\u5355\u5F53\u524D\u4E0D\u80FD\u62D2\u7EDD");
                const previousConfirmation = (await confirmedForUser(repository, order.userId)).find((event) => event.orderId === orderId);
                const decision = await settleDecision(orderId, {
                  orderId,
                  userId: order.userId,
                  type: previousConfirmation ? "confirmed" : "rejected",
                  decidedAt: (previousConfirmation == null ? void 0 : previousConfirmation.confirmedAt) ?? order.reviewedAt ?? now(),
                  decidedBy: (previousConfirmation == null ? void 0 : previousConfirmation.confirmedBy) ?? order.reviewedBy ?? admin.id,
                  decidedByUsername: (previousConfirmation == null ? void 0 : previousConfirmation.confirmedByUsername) ?? admin.username,
                  adminNote: order.adminNote || (typeof adminNote === "string" ? adminNote.trim().slice(0, 200) : ""),
                  userMessage: order.userMessage || note.trim().slice(0, 200)
                });
                if ((decision == null ? void 0 : decision.type) !== "rejected")
                  throw new HttpError(409, "ORDER_ALREADY_CONFIRMED", "\u8BE5\u8BA2\u5355\u5DF2\u7531\u5176\u4ED6\u7BA1\u7406\u5458\u786E\u8BA4\u5230\u8D26");
                const updated = { ...order, status: "rejected", reviewedAt: decision.decidedAt, reviewedBy: decision.decidedBy, adminNote: decision.adminNote || "", userMessage: decision.userMessage };
                await repository.setJson(key, updated);
                await audit(decisionAdministrator(decision, admin), "order.rejected", orderId, { status: order.status }, { status: updated.status }, `order-rejected-${orderId}`);
                return updated;
              },
              async changeUserStatus(admin, userId, status, note) {
                if (!["active", "suspended"].includes(status))
                  throw new HttpError(400, "INVALID_STATUS", "\u8BF7\u9009\u62E9\u6709\u6548\u7684\u8D26\u53F7\u72B6\u6001");
                const { key, user } = await findUser(repository, userId);
                if (user.role === "admin")
                  throw new HttpError(400, "ADMIN_STATUS_PROTECTED", "\u4E0D\u80FD\u901A\u8FC7\u6B64\u5165\u53E3\u505C\u7528\u7BA1\u7406\u5458");
                const updated = { ...user, status };
                await repository.setJson(key, updated);
                if (status === "suspended")
                  await invalidateSessions(repository, userId);
                await audit(admin, "user.status_changed", userId, { status: user.status }, { status, note: (note == null ? void 0 : note.trim()) || "" });
                return safeUser(updated);
              },
              async resetPassword(admin, userId) {
                const { key, user } = await findUser(repository, userId);
                const temporaryPassword = `Ktb-${createSessionToken()}!`;
                const updated = {
                  ...user,
                  passwordHash: await hashPassword(temporaryPassword),
                  passwordResetRequired: true,
                  temporaryPasswordExpiresAt: new Date(Date.parse(now()) + TEMPORARY_PASSWORD_MS).toISOString()
                };
                await repository.setJson(key, updated);
                await invalidateSessions(repository, userId);
                await audit(admin, "user.password_reset", userId, { passwordResetRequired: user.passwordResetRequired }, { passwordResetRequired: true });
                return { temporaryPassword };
              },
              async grantEntitlement(admin, userId, planId, customDays, idempotencyKey) {
                if (typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(idempotencyKey)) {
                  throw new HttpError(400, "INVALID_IDEMPOTENCY_KEY", "\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5");
                }
                const days = Number(customDays);
                const isCustom = Number.isInteger(days) && days >= 1 && days <= 3650;
                const plan = isCustom ? getPlan("monthly") : getPlan(planId);
                if (!plan)
                  throw new HttpError(400, "INVALID_PLAN", "\u8BF7\u9009\u62E9\u6709\u6548\u7684\u4F1A\u5458\u65B9\u6848\u6216\u586B\u5199 1 \u81F3 3650 \u5929");
                await findUser(repository, userId);
                const orderId = `ADMIN-${idempotencyKey}`;
                const event = { orderId, userId, plan: plan.id, ...isCustom ? { durationDays: days } : {}, amountCny: 0, confirmedAt: now(), confirmedBy: admin.id, source: "admin" };
                const eventKey = confirmedOrderKey(userId, orderId);
                let storedEvent = await repository.getJson(eventKey);
                try {
                  if (!storedEvent)
                    await repository.setJson(eventKey, event, { onlyIfNew: true });
                } catch (error) {
                  if ((error == null ? void 0 : error.code) !== "ALREADY_EXISTS")
                    throw error;
                  storedEvent = await repository.getJson(eventKey);
                }
                storedEvent ?? (storedEvent = event);
                if (storedEvent.plan !== event.plan || (storedEvent.durationDays ?? null) !== (event.durationDays ?? null)) {
                  throw new HttpError(409, "IDEMPOTENCY_CONFLICT", "\u8BE5\u64CD\u4F5C\u5DF2\u7528\u4E8E\u5176\u4ED6\u4F1A\u5458\u65B9\u6848\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
                }
                const entitlement = await rebuildEntitlement(repository, userId);
                await audit(admin, "user.entitlement_granted", userId, null, { plan: storedEvent.plan, customDays: storedEvent.durationDays ?? null, orderId }, `entitlement-${userId}-${idempotencyKey}`);
                return entitlement;
              },
              async uploadPaymentSettings(admin, formData) {
                const method = formData.get("method");
                const image = formData.get("image");
                const contact = String(formData.get("contact") ?? "").trim();
                if (!["wechat", "alipay"].includes(method) || !image || typeof image.arrayBuffer !== "function") {
                  throw new HttpError(400, "INVALID_QR_IMAGE", "\u8BF7\u9009\u62E9\u6709\u6548\u7684\u5FAE\u4FE1\u6216\u652F\u4ED8\u5B9D\u6536\u6B3E\u7801\u56FE\u7247");
                }
                if (!IMAGE_TYPES.has(image.type) || image.size <= 0 || image.size > MAX_QR_BYTES) {
                  throw new HttpError(400, "INVALID_QR_IMAGE", "\u6536\u6B3E\u7801\u4EC5\u652F\u6301 2MB \u4EE5\u5185\u7684 PNG\u3001JPG \u6216 WebP \u56FE\u7247");
                }
                if (contact.length > 64)
                  throw new HttpError(400, "INVALID_SUPPORT_CONTACT", "\u5BA2\u670D\u8054\u7CFB\u65B9\u5F0F\u4E0D\u80FD\u8D85\u8FC7 64 \u4E2A\u5B57\u7B26");
                await repository.setBinary(`v1/payment-qr/${method}`, new Uint8Array(await image.arrayBuffer()));
                await repository.setJson(`v1/payment-qr/${method}.json`, { contentType: image.type, updatedAt: now(), updatedBy: admin.id });
                const current = await repository.getJson("v1/settings/payment.json") ?? {};
                const updated = {
                  wechatConfigured: current.wechatConfigured === true || method === "wechat",
                  alipayConfigured: current.alipayConfigured === true || method === "alipay",
                  supportContact: contact || current.supportContact || "",
                  updatedAt: now()
                };
                await repository.setJson("v1/settings/payment.json", updated);
                await audit(admin, "payment.settings_updated", method, null, { method, contentType: image.type });
                return updated;
              },
              async listAudit() {
                const events = await listObjects(repository, "v1/audit/");
                return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              }
            };
          }
          var TRIAL_MS = 72 * 60 * 60 * 1e3;
          var SESSION_MS = 7 * 24 * 60 * 60 * 1e3;
          var USERNAME_PATTERN = /^[\p{L}\p{N}_-]{4,32}$/u;
          var dummyHashPromise;
          function normalizeUsername(value) {
            return typeof value === "string" ? value.trim().toLocaleLowerCase("en-US") : "";
          }
          function userKey(usernameNormalized) {
            return `v1/users/by-name/${hashToken(usernameNormalized)}.json`;
          }
          async function markFreshUserPartitions(repository, userId, createdAt) {
            await Promise.all([
              repository.setJson(`v1/migrations/confirmed-orders-by-user/${userId}.json`, { migratedAt: createdAt, source: "new-user" }, { onlyIfNew: true }),
              repository.setJson(`v1/migrations/orders-by-user/${userId}.json`, { migratedAt: createdAt, source: "new-user" }, { onlyIfNew: true }),
              repository.setJson(`v1/migrations/order-decisions-by-user/${userId}.json`, { migratedAt: createdAt, source: "new-user" }, { onlyIfNew: true })
            ]);
          }
          function publicUser(user) {
            return {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              contact: user.contact,
              role: user.role,
              status: user.status,
              passwordResetRequired: user.passwordResetRequired,
              createdAt: user.createdAt
            };
          }
          function validPassword(value) {
            return typeof value === "string" && value.length >= 8 && value.length <= 128;
          }
          async function createSession(repository, user, now) {
            const token = createSessionToken();
            const tokenHash = hashToken(token);
            await repository.setJson(`v1/sessions/${tokenHash}.json`, {
              tokenHash,
              userId: user.id,
              usernameNormalized: user.usernameNormalized,
              createdAt: now,
              expiresAt: new Date(Date.parse(now) + SESSION_MS).toISOString()
            });
            return token;
          }
          async function invalidateUserSessions(repository, userId) {
            const keys = await repository.list("v1/sessions/");
            const sessions = await Promise.all(keys.map(async (key) => ({ key, value: await repository.getJson(key) })));
            await Promise.all(sessions.filter((item) => {
              var _a;
              return ((_a = item.value) == null ? void 0 : _a.userId) === userId;
            }).map((item) => repository.delete(item.key)));
          }
          function createAuthService({ repository, now, uuid }) {
            async function snapshot(user) {
              const paid = await paidEntitlementForUser(repository, user.id);
              return {
                user: publicUser(user),
                entitlement: computeEntitlement({ user, paid, now: now() })
              };
            }
            async function currentUser(request) {
              const token = parseSessionCookie(request);
              if (!token)
                return null;
              const key = `v1/sessions/${hashToken(token)}.json`;
              const session = await repository.getJson(key);
              if (!session)
                return null;
              if (Date.parse(session.expiresAt) <= Date.parse(now())) {
                await repository.delete(key);
                return null;
              }
              return repository.getJson(userKey(session.usernameNormalized));
            }
            return {
              async register({ username, password, contact }) {
                const displayUsername = typeof username === "string" ? username.trim() : "";
                const usernameNormalized = normalizeUsername(username);
                const cleanContact = typeof contact === "string" ? contact.trim() : "";
                if (!USERNAME_PATTERN.test(displayUsername) || !validPassword(password) || cleanContact.length < 2 || cleanContact.length > 64) {
                  throw new HttpError(400, "INVALID_REGISTRATION", "\u8BF7\u586B\u5199\u6709\u6548\u7684\u7528\u6237\u540D\u3001\u5BC6\u7801\u548C\u8054\u7CFB\u65B9\u5F0F");
                }
                const createdAt = now();
                const user = {
                  id: uuid(),
                  username: displayUsername,
                  usernameNormalized,
                  displayName: displayUsername,
                  contact: cleanContact,
                  passwordHash: await hashPassword(password),
                  role: "user",
                  status: "active",
                  passwordResetRequired: false,
                  createdAt,
                  trialEndsAt: new Date(Date.parse(createdAt) + TRIAL_MS).toISOString()
                };
                try {
                  await repository.setJson(userKey(usernameNormalized), user, { onlyIfNew: true });
                } catch (error) {
                  if ((error == null ? void 0 : error.code) === "ALREADY_EXISTS") {
                    throw new HttpError(409, "USERNAME_TAKEN", "\u8BE5\u7528\u6237\u540D\u5DF2\u88AB\u4F7F\u7528");
                  }
                  throw error;
                }
                try {
                  await markFreshUserPartitions(repository, user.id, createdAt);
                } catch {
                }
                return { ...await snapshot(user), token: await createSession(repository, user, createdAt) };
              },
              async login({ username, password }) {
                const usernameNormalized = normalizeUsername(username);
                const user = await repository.getJson(userKey(usernameNormalized));
                const passwordHash = (user == null ? void 0 : user.passwordHash) ?? await (dummyHashPromise ?? (dummyHashPromise = hashPassword("not-a-real-user-password")));
                const valid = validPassword(password) && await verifyPassword(password, passwordHash);
                if (!user || !valid) {
                  throw new HttpError(401, "INVALID_CREDENTIALS", "\u7528\u6237\u540D\u6216\u5BC6\u7801\u4E0D\u6B63\u786E");
                }
                if (user.status === "suspended") {
                  throw new HttpError(403, "ACCOUNT_SUSPENDED", "\u8D26\u53F7\u5DF2\u505C\u7528\uFF0C\u8BF7\u8054\u7CFB\u5BA2\u670D");
                }
                if (user.passwordResetRequired && user.temporaryPasswordExpiresAt && Date.parse(user.temporaryPasswordExpiresAt) <= Date.parse(now())) {
                  throw new HttpError(403, "TEMP_PASSWORD_EXPIRED", "\u4E34\u65F6\u5BC6\u7801\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u91CD\u7F6E");
                }
                const token = await createSession(repository, user, now());
                return { ...await snapshot(user), token };
              },
              async me(request) {
                const user = await currentUser(request);
                if (!user)
                  throw new HttpError(401, "AUTH_REQUIRED", "\u8BF7\u5148\u767B\u5F55");
                return snapshot(user);
              },
              async logout(request) {
                const token = parseSessionCookie(request);
                if (token)
                  await repository.delete(`v1/sessions/${hashToken(token)}.json`);
              },
              async changePassword(request, { currentPassword, newPassword }) {
                const user = await currentUser(request);
                if (!user)
                  throw new HttpError(401, "AUTH_REQUIRED", "\u8BF7\u5148\u767B\u5F55");
                if (!validPassword(newPassword)) {
                  throw new HttpError(400, "INVALID_PASSWORD", "\u65B0\u5BC6\u7801\u81F3\u5C11\u9700\u8981 8 \u4E2A\u5B57\u7B26");
                }
                if (!await verifyPassword(currentPassword, user.passwordHash)) {
                  throw new HttpError(400, "INVALID_CURRENT_PASSWORD", "\u5F53\u524D\u5BC6\u7801\u4E0D\u6B63\u786E");
                }
                if (await verifyPassword(newPassword, user.passwordHash)) {
                  throw new HttpError(400, "PASSWORD_UNCHANGED", "\u65B0\u5BC6\u7801\u4E0D\u80FD\u4E0E\u5F53\u524D\u5BC6\u7801\u76F8\u540C");
                }
                const updated = { ...user, passwordHash: await hashPassword(newPassword), passwordResetRequired: false, temporaryPasswordExpiresAt: null };
                await repository.setJson(userKey(user.usernameNormalized), updated);
                await invalidateUserSessions(repository, user.id);
                const token = await createSession(repository, updated, now());
                return { ...await snapshot(updated), token };
              },
              currentUser
            };
          }
          var BOOTSTRAP_PASSWORD_MS = 7 * 24 * 60 * 60 * 1e3;
          async function seedAdmins({ repository, env: env2, now, uuid }) {
            for (let index = 1; index <= 3; index += 1) {
              const username = env2[`ADMIN_${index}_USERNAME`];
              const password = env2[`ADMIN_${index}_PASSWORD`];
              const displayName = env2[`ADMIN_${index}_DISPLAY_NAME`];
              if (!username || !password)
                continue;
              const usernameNormalized = normalizeUsername(username);
              const key = userKey(usernameNormalized);
              if (await repository.getJson(key))
                continue;
              const admin = {
                id: uuid(),
                username: username.trim(),
                usernameNormalized,
                displayName: (displayName == null ? void 0 : displayName.trim()) || `\u7BA1\u7406\u5458${index}`,
                contact: "",
                passwordHash: await hashPassword(password),
                role: "admin",
                status: "active",
                passwordResetRequired: true,
                temporaryPasswordExpiresAt: new Date(Date.parse(now()) + BOOTSTRAP_PASSWORD_MS).toISOString(),
                createdAt: now(),
                trialEndsAt: null
              };
              try {
                await repository.setJson(key, admin, { onlyIfNew: true });
              } catch (error) {
                if ((error == null ? void 0 : error.code) !== "ALREADY_EXISTS")
                  throw error;
                continue;
              }
              try {
                await markFreshUserPartitions(repository, admin.id, admin.createdAt);
              } catch {
              }
            }
          }
          var PAYMENT_METHODS = /* @__PURE__ */ new Set(["wechat", "alipay"]);
          function publicOrder(order) {
            return {
              orderId: order.orderId,
              userId: order.userId,
              username: order.username,
              plan: order.plan,
              amountCny: order.amountCny,
              status: order.status,
              createdAt: order.createdAt,
              paymentMethod: order.paymentMethod,
              payerHint: order.payerHint,
              paidAtClaimed: order.paidAtClaimed,
              claimedAt: order.claimedAt ?? null,
              reviewedAt: order.reviewedAt ?? null,
              userMessage: order.status === "rejected" ? order.userMessage ?? "\u4ED8\u6B3E\u4FE1\u606F\u672A\u6838\u5BF9\u6210\u529F\uFF0C\u8BF7\u8054\u7CFB\u5BA2\u670D" : void 0
            };
          }
          function publicPlans() {
            return PLANS.map(({ id, name, amountCny, durationDays, suffix, note }) => ({
              id,
              name,
              amountCny,
              durationDays,
              suffix,
              note
            }));
          }
          function validClaim({ paymentMethod, payerHint, paidAtClaimed }) {
            return PAYMENT_METHODS.has(paymentMethod) && typeof payerHint === "string" && payerHint.trim().length >= 2 && payerHint.trim().length <= 64 && Number.isFinite(Date.parse(paidAtClaimed));
          }
          function createBillingService({ repository, now, uuid }) {
            async function persistOrder(order) {
              const orderKey = `v1/orders/${order.orderId}.json`;
              await repository.setJson(orderKey, order);
              await repository.setJson(`v1/orders-by-user/${order.userId}/${order.orderId}.json`, { orderKey });
              return order;
            }
            async function ownOrderRecords(userId) {
              const indexKeys = await repository.list(`v1/orders-by-user/${userId}/`);
              const orderKeys = (await Promise.all(indexKeys.map((key) => repository.getJson(key)))).map((index) => index == null ? void 0 : index.orderKey).filter(Boolean);
              let orders = (await Promise.all(orderKeys.map((key) => repository.getJson(key)))).filter(Boolean);
              const migrationKey = `v1/migrations/orders-by-user/${userId}.json`;
              if (!await repository.getJson(migrationKey)) {
                const legacyKeys = await repository.list("v1/orders/");
                const legacyOrders = await Promise.all(legacyKeys.map((key) => repository.getJson(key)));
                const own = legacyOrders.filter((order) => (order == null ? void 0 : order.userId) === userId);
                await Promise.all(own.map((order) => repository.setJson(`v1/orders-by-user/${userId}/${order.orderId}.json`, { orderKey: `v1/orders/${order.orderId}.json` })));
                await repository.setJson(migrationKey, { migratedAt: now() });
                orders = [...orders, ...own];
              }
              const unique = [...new Map(orders.map((order) => [order.orderId, order])).values()];
              const openByPlan = /* @__PURE__ */ new Map();
              for (const order of unique.filter((item) => ["awaiting_payment", "pending_review"].includes(item.status)).sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
                openByPlan.set(order.plan, order);
              }
              await Promise.all([...openByPlan.values()].map((order) => repository.setJson(`v1/open-orders/${userId}/${order.plan}.json`, { order })));
              return unique;
            }
            async function paymentSettings() {
              return await repository.getJson("v1/settings/payment.json") ?? {
                wechatConfigured: false,
                alipayConfigured: false,
                supportContact: ""
              };
            }
            return {
              async getPaymentSettings() {
                return paymentSettings();
              },
              async getPublicSupport() {
                const settings = await paymentSettings();
                return { supportContact: settings.supportContact || "" };
              },
              async createOrder(user, { plan: planId }) {
                const plan = getPlan(planId);
                if (!plan)
                  throw new HttpError(400, "INVALID_PLAN", "\u8BF7\u9009\u62E9\u6709\u6548\u7684\u4F1A\u5458\u65B9\u6848");
                const settings = await paymentSettings();
                if (!settings.wechatConfigured || !settings.alipayConfigured) {
                  throw new HttpError(503, "PAYMENT_NOT_CONFIGURED", "\u6536\u6B3E\u65B9\u5F0F\u914D\u7F6E\u4E2D\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
                }
                const openOrderKey = `v1/open-orders/${user.id}/${plan.id}.json`;
                const openOrder = await repository.getJson(openOrderKey);
                if (openOrder == null ? void 0 : openOrder.order) {
                  const storedOrder = await repository.getJson(`v1/orders/${openOrder.order.orderId}.json`);
                  const recoverable = storedOrder ?? openOrder.order;
                  if (["awaiting_payment", "pending_review"].includes(recoverable.status)) {
                    await persistOrder(recoverable);
                    return publicOrder(recoverable);
                  }
                  await repository.delete(openOrderKey);
                }
                const existing = (await ownOrderRecords(user.id)).filter((order2) => (order2 == null ? void 0 : order2.plan) === plan.id && ["awaiting_payment", "pending_review"].includes(order2.status)).sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
                if (existing) {
                  try {
                    await repository.setJson(openOrderKey, { order: existing }, { onlyIfNew: true });
                  } catch (error) {
                    if ((error == null ? void 0 : error.code) !== "ALREADY_EXISTS")
                      throw error;
                  }
                  return publicOrder(existing);
                }
                const date = now().slice(0, 10).replaceAll("-", "");
                const suffix = uuid().replaceAll("-", "").slice(0, 16).toUpperCase();
                const order = {
                  orderId: `KTB-${date}-${suffix}`,
                  userId: user.id,
                  username: user.username,
                  plan: plan.id,
                  amountCny: plan.amountCny,
                  status: "awaiting_payment",
                  createdAt: now(),
                  paymentMethod: null,
                  payerHint: null,
                  paidAtClaimed: null
                };
                try {
                  await repository.setJson(openOrderKey, { order }, { onlyIfNew: true });
                } catch (error) {
                  if ((error == null ? void 0 : error.code) !== "ALREADY_EXISTS")
                    throw error;
                  const winner = await repository.getJson(openOrderKey);
                  if (!(winner == null ? void 0 : winner.order))
                    throw error;
                  await persistOrder(winner.order);
                  return publicOrder(winner.order);
                }
                await persistOrder(order);
                return publicOrder(order);
              },
              async claimOrder(user, orderId, claim) {
                if (!validClaim(claim))
                  throw new HttpError(400, "INVALID_PAYMENT_CLAIM", "\u8BF7\u586B\u5199\u5B8C\u6574\u7684\u4ED8\u6B3E\u6838\u5BF9\u4FE1\u606F");
                const key = `v1/orders/${orderId}.json`;
                const order = await repository.getJson(key);
                if (!order || order.userId !== user.id)
                  throw new HttpError(404, "ORDER_NOT_FOUND", "\u8BA2\u5355\u4E0D\u5B58\u5728");
                if (order.status !== "awaiting_payment")
                  throw new HttpError(409, "ORDER_ALREADY_CLAIMED", "\u8BE5\u8BA2\u5355\u5DF2\u7ECF\u63D0\u4EA4\u6838\u5B9E");
                const updated = {
                  ...order,
                  status: "pending_review",
                  paymentMethod: claim.paymentMethod,
                  payerHint: claim.payerHint.trim(),
                  paidAtClaimed: new Date(claim.paidAtClaimed).toISOString(),
                  claimedAt: now()
                };
                await repository.setJson(key, updated);
                return publicOrder(updated);
              },
              async listOwnOrders(user) {
                const orders = await ownOrderRecords(user.id);
                return orders.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicOrder);
              },
              async getQr(method) {
                if (!PAYMENT_METHODS.has(method))
                  throw new HttpError(404, "QR_NOT_FOUND", "\u6536\u6B3E\u7801\u4E0D\u5B58\u5728");
                const [bytes, meta] = await Promise.all([
                  repository.getBinary(`v1/payment-qr/${method}`),
                  repository.getJson(`v1/payment-qr/${method}.json`)
                ]);
                if (!bytes || !meta)
                  throw new HttpError(404, "QR_NOT_FOUND", "\u6536\u6B3E\u7801\u5C1A\u672A\u914D\u7F6E");
                return { bytes, contentType: meta.contentType };
              }
            };
          }
          async function consumeRateLimit({ repository, scope, limit, windowMs, now }) {
            const key = `v1/rate-limits/${hashToken(scope)}.json`;
            const current = await repository.getJson(key);
            const nowMs = Date.parse(now);
            const next = !current || Date.parse(current.resetsAt) <= nowMs ? { count: 1, resetsAt: new Date(nowMs + windowMs).toISOString() } : { count: current.count + 1, resetsAt: current.resetsAt };
            await repository.setJson(key, next);
            return { allowed: next.count <= limit, retryAt: next.resetsAt };
          }
          async function checkRateLimit({ repository, scope, limit, now }) {
            const current = await repository.getJson(`v1/rate-limits/${hashToken(scope)}.json`);
            if (!current || Date.parse(current.resetsAt) <= Date.parse(now))
              return { allowed: true };
            return { allowed: current.count < limit, retryAt: current.resetsAt };
          }
          var MINUTE_MS = 60 * 1e3;
          var HOUR_MS = 60 * MINUTE_MS;
          function createApi({ repository, env: env2 = {}, now = () => (/* @__PURE__ */ new Date()).toISOString(), uuid = randomUUID }) {
            const auth = createAuthService({ repository, now, uuid });
            const billing = createBillingService({ repository, now, uuid });
            const admin = createAdminService({ repository, now, uuid });
            async function requireUser(request) {
              const user = await auth.currentUser(request);
              if (!user)
                throw new HttpError(401, "AUTH_REQUIRED", "\u8BF7\u5148\u767B\u5F55");
              if (user.status !== "active")
                throw new HttpError(403, "ACCOUNT_SUSPENDED", "\u8D26\u53F7\u5DF2\u505C\u7528\uFF0C\u8BF7\u8054\u7CFB\u5BA2\u670D");
              if (user.passwordResetRequired)
                throw new HttpError(403, "PASSWORD_CHANGE_REQUIRED", "\u8BF7\u5148\u66F4\u6362\u4E34\u65F6\u5BC6\u7801");
              return user;
            }
            async function requireAdmin(request) {
              const user = await requireUser(request);
              if (user.role !== "admin")
                throw new HttpError(403, "ADMIN_REQUIRED", "\u65E0\u6743\u8BBF\u95EE\u7BA1\u7406\u5458\u540E\u53F0");
              return user;
            }
            async function enforceRateLimit(scope, limit, windowMs) {
              const result = await consumeRateLimit({ repository, scope, limit, windowMs, now: now() });
              if (!result.allowed)
                throw new HttpError(429, "RATE_LIMITED", "\u64CD\u4F5C\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
            }
            return async function handle(request, context2 = {}) {
              try {
                await seedAdmins({ repository, env: env2, now, uuid });
                const url2 = new URL(request.url);
                const clientIp = context2.clientIp || "unknown";
                if (request.method === "GET" && url2.pathname === "/api/plans") {
                  return jsonResponse(publicPlans());
                }
                if (request.method === "GET" && url2.pathname === "/api/support") {
                  return jsonResponse(await billing.getPublicSupport());
                }
                if (request.method === "GET" && url2.pathname === "/api/auth/me") {
                  return jsonResponse(await auth.me(request));
                }
                if (request.method === "GET" && url2.pathname === "/api/orders/me") {
                  return jsonResponse(await billing.listOwnOrders(await requireUser(request)));
                }
                const qrMatch = url2.pathname.match(/^\/api\/payment\/qr\/(wechat|alipay)$/);
                if (request.method === "GET" && qrMatch) {
                  await requireUser(request);
                  const qr = await billing.getQr(qrMatch[1]);
                  return new Response(qr.bytes, { status: 200, headers: { "cache-control": "no-store", "content-type": qr.contentType } });
                }
                if (request.method === "GET" && url2.pathname === "/api/admin/users") {
                  await requireAdmin(request);
                  return jsonResponse(await admin.listUsers());
                }
                if (request.method === "GET" && url2.pathname === "/api/admin/orders") {
                  await requireAdmin(request);
                  return jsonResponse(await admin.listOrders());
                }
                if (request.method === "GET" && url2.pathname === "/api/admin/audit") {
                  await requireAdmin(request);
                  return jsonResponse(await admin.listAudit());
                }
                if (request.method === "GET" && url2.pathname === "/api/admin/payment-settings") {
                  await requireAdmin(request);
                  return jsonResponse(await billing.getPaymentSettings());
                }
                if (request.method !== "GET" && request.method !== "HEAD")
                  requireSameOrigin(request);
                if (request.method === "POST" && url2.pathname === "/api/auth/register") {
                  const limit = await consumeRateLimit({
                    repository,
                    scope: `register:${clientIp}`,
                    limit: 3,
                    windowMs: HOUR_MS,
                    now: now()
                  });
                  if (!limit.allowed)
                    return jsonResponse({ error: "RATE_LIMITED", message: "\u6CE8\u518C\u5C1D\u8BD5\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }, 429);
                  const result = await auth.register(await readJson(request));
                  const { token, ...body } = result;
                  return jsonResponse(body, 201, { "set-cookie": sessionCookie(token) });
                }
                if (request.method === "POST" && url2.pathname === "/api/auth/login") {
                  const body = await readJson(request);
                  const loginScope = `login:${clientIp}:${normalizeUsername(body.username)}`;
                  const currentLimit = await checkRateLimit({ repository, scope: loginScope, limit: 5, now: now() });
                  if (!currentLimit.allowed)
                    return jsonResponse({ error: "RATE_LIMITED", message: "\u767B\u5F55\u5C1D\u8BD5\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }, 429);
                  let result;
                  try {
                    result = await auth.login(body);
                  } catch (error) {
                    if (error instanceof HttpError && error.code === "INVALID_CREDENTIALS") {
                      const failedLimit = await consumeRateLimit({ repository, scope: loginScope, limit: 5, windowMs: MINUTE_MS, now: now() });
                      if (!failedLimit.allowed)
                        return jsonResponse({ error: "RATE_LIMITED", message: "\u767B\u5F55\u5C1D\u8BD5\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }, 429);
                    }
                    throw error;
                  }
                  const { token, ...responseBody } = result;
                  return jsonResponse(responseBody, 200, { "set-cookie": sessionCookie(token) });
                }
                if (request.method === "POST" && url2.pathname === "/api/auth/logout") {
                  await auth.logout(request);
                  return emptyResponse(204, { "set-cookie": expiredSessionCookie() });
                }
                if (request.method === "POST" && url2.pathname === "/api/auth/password") {
                  const passwordUser = await auth.currentUser(request);
                  if (!passwordUser)
                    throw new HttpError(401, "AUTH_REQUIRED", "\u8BF7\u5148\u767B\u5F55");
                  if (passwordUser.status !== "active")
                    throw new HttpError(403, "ACCOUNT_SUSPENDED", "\u8D26\u53F7\u5DF2\u505C\u7528\uFF0C\u8BF7\u8054\u7CFB\u5BA2\u670D");
                  await enforceRateLimit(`password-change:${clientIp}:${passwordUser.id}`, 10, HOUR_MS);
                  const result = await auth.changePassword(request, await readJson(request));
                  const { token, ...body } = result;
                  return jsonResponse(body, 200, { "set-cookie": sessionCookie(token) });
                }
                if (request.method === "POST" && url2.pathname === "/api/orders") {
                  const user = await requireUser(request);
                  await enforceRateLimit(`order-create:${clientIp}:${user.id}`, 10, HOUR_MS);
                  return jsonResponse(await billing.createOrder(user, await readJson(request)), 201);
                }
                const claimMatch = url2.pathname.match(/^\/api\/orders\/([^/]+)\/claim$/);
                if (request.method === "POST" && claimMatch) {
                  const user = await requireUser(request);
                  await enforceRateLimit(`order-claim:${clientIp}:${user.id}`, 10, HOUR_MS);
                  return jsonResponse(await billing.claimOrder(user, claimMatch[1], await readJson(request)));
                }
                if (request.method === "POST" && url2.pathname === "/api/admin/payment-settings") {
                  const administrator = await requireAdmin(request);
                  await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS);
                  return jsonResponse(await admin.uploadPaymentSettings(administrator, await request.formData()));
                }
                const confirmMatch = url2.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/confirm$/);
                if (request.method === "POST" && confirmMatch) {
                  const administrator = await requireAdmin(request);
                  await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS);
                  const body = await readJson(request);
                  return jsonResponse(await admin.confirmOrder(administrator, confirmMatch[1], body.note));
                }
                const rejectMatch = url2.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/reject$/);
                if (request.method === "POST" && rejectMatch) {
                  const administrator = await requireAdmin(request);
                  await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS);
                  const body = await readJson(request);
                  return jsonResponse(await admin.rejectOrder(administrator, rejectMatch[1], body.note, body.adminNote));
                }
                const statusMatch = url2.pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
                if (request.method === "POST" && statusMatch) {
                  const administrator = await requireAdmin(request);
                  await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS);
                  const body = await readJson(request);
                  return jsonResponse(await admin.changeUserStatus(administrator, statusMatch[1], body.status, body.note));
                }
                const resetMatch = url2.pathname.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
                if (request.method === "POST" && resetMatch) {
                  const administrator = await requireAdmin(request);
                  await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS);
                  return jsonResponse(await admin.resetPassword(administrator, resetMatch[1]));
                }
                const entitlementMatch = url2.pathname.match(/^\/api\/admin\/users\/([^/]+)\/entitlement$/);
                if (request.method === "POST" && entitlementMatch) {
                  const administrator = await requireAdmin(request);
                  await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS);
                  const body = await readJson(request);
                  return jsonResponse(await admin.grantEntitlement(administrator, entitlementMatch[1], body.plan, body.days, body.idempotencyKey));
                }
                return jsonResponse({ error: "NOT_FOUND", message: "\u63A5\u53E3\u4E0D\u5B58\u5728" }, 404);
              } catch (error) {
                return errorResponse(error);
              }
            };
          }
          function createBlobRepository(store) {
            async function normalizeConditionalWrite(work) {
              try {
                await work();
              } catch (error) {
                if ((error == null ? void 0 : error.code) === "PRECONDITION_FAILED") {
                  const conflict = new Error("Object already exists");
                  conflict.code = "ALREADY_EXISTS";
                  throw conflict;
                }
                throw error;
              }
            }
            return {
              async getJson(key) {
                return store.get(key, { type: "json", consistency: "strong" });
              },
              async setJson(key, value, options = {}) {
                await normalizeConditionalWrite(() => store.setJSON(key, value, options.onlyIfNew ? { onlyIfNew: true } : void 0));
              },
              async setBinary(key, value, options = {}) {
                await normalizeConditionalWrite(() => store.set(key, value, options.onlyIfNew ? { onlyIfNew: true } : void 0));
              },
              async getBinary(key) {
                const value = await store.get(key, { type: "arrayBuffer", consistency: "strong" });
                return value == null ? null : new Uint8Array(value);
              },
              async delete(key) {
                await store.delete(key);
              },
              async list(prefix) {
                const result = await store.list({ prefix, consistency: "strong" });
                return result.blobs.map((item) => item.key);
              }
            };
          }
          async function onRequest(context2) {
            const store = (0, import_pages_blob.getStore)({
              name: "kyrie-membership-v1",
              consistency: "strong"
            });
            const repository = createBlobRepository(store);
            const api = createApi({
              repository,
              env: context2.env
            });
            return api(context2.request, {
              clientIp: context2.clientIp
            });
          }
          return {
            onRequest: typeof onRequest !== "undefined" ? onRequest : void 0,
            onRequestGet: typeof onRequestGet !== "undefined" ? onRequestGet : void 0,
            onRequestPost: typeof onRequestPost !== "undefined" ? onRequestPost : void 0,
            onRequestPut: typeof onRequestPut !== "undefined" ? onRequestPut : void 0,
            onRequestDelete: typeof onRequestDelete !== "undefined" ? onRequestDelete : void 0,
            onRequestPatch: typeof onRequestPatch !== "undefined" ? onRequestPatch : void 0,
            onRequestHead: typeof onRequestHead !== "undefined" ? onRequestHead : void 0,
            onRequestOptions: typeof onRequestOptions !== "undefined" ? onRequestOptions : void 0
          };
        })();
        try {
          const handler = (() => {
            const method = req.method;
            if (method === "GET" && mod_0.onRequestGet) {
              return mod_0.onRequestGet;
            } else if (method === "POST" && mod_0.onRequestPost) {
              return mod_0.onRequestPost;
            } else if (method === "PUT" && mod_0.onRequestPut) {
              return mod_0.onRequestPut;
            } else if (method === "DELETE" && mod_0.onRequestDelete) {
              return mod_0.onRequestDelete;
            } else if (method === "PATCH" && mod_0.onRequestPatch) {
              return mod_0.onRequestPatch;
            } else if (method === "HEAD" && mod_0.onRequestHead) {
              return mod_0.onRequestHead;
            } else if (method === "OPTIONS" && mod_0.onRequestOptions) {
              return mod_0.onRequestOptions;
            } else {
              return mod_0.onRequest;
            }
          })();
          if (handler) {
            response = await handler(context);
            if (response && typeof response === "object" && response.websocket) {
              console.log("[WebSocket] WebSocket configuration detected for:", pathname);
              const upgradeHeader = req.headers["upgrade"];
              if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
                console.log("[WebSocket] Executing WebSocket handshake...");
                try {
                  const { WebSocketServer } = __require("ws");
                  const wss = new WebSocketServer({ noServer: true });
                  wss.on("connection", (ws, request) => {
                    console.log("[WebSocket] Connection established");
                    if (response.websocket.onopen) {
                      try {
                        response.websocket.onopen(ws, request);
                      } catch (error) {
                        console.error("[WebSocket] Error in onopen:", error);
                      }
                    }
                    ws.on("message", (data, isBinary) => {
                      if (response.websocket.onmessage) {
                        try {
                          response.websocket.onmessage(ws, data, isBinary);
                        } catch (error) {
                          console.error("[WebSocket] Error in onmessage:", error);
                          ws.close(1011, "Internal error");
                        }
                      }
                    });
                    ws.on("close", (code, reason) => {
                      if (response.websocket.onclose) {
                        try {
                          response.websocket.onclose(ws, code, reason);
                        } catch (error) {
                          console.error("[WebSocket] Error in onclose:", error);
                        }
                      }
                    });
                    ws.on("error", (error) => {
                      if (response.websocket.onerror) {
                        try {
                          response.websocket.onerror(ws, error);
                        } catch (err) {
                          console.error("[WebSocket] Error in onerror:", err);
                        }
                      } else {
                        console.error("[WebSocket] Connection error:", error);
                      }
                    });
                  });
                  wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
                    wss.emit("connection", ws, req);
                  });
                  console.log("[WebSocket] Handshake complete, connection established");
                  return;
                } catch (wsError) {
                  console.error("[WebSocket] Handshake error:", wsError);
                  response = new Response(JSON.stringify({
                    error: "WebSocket Handshake Failed",
                    message: wsError.message
                  }), {
                    status: 500,
                    headers: {
                      "Content-Type": "application/json"
                    }
                  });
                }
              } else {
                response = new Response("WebSocket endpoint. Use ws:// protocol to connect.", {
                  status: 426,
                  headers: {
                    "Content-Type": "text/plain",
                    "Upgrade": "websocket"
                  }
                });
              }
            }
          }
        } catch (handlerError) {
          console.log("Makers response status: ", 502);
          response = new Response(JSON.stringify({
            error: "Internal Server Error",
            message: handlerError.message
          }), {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              // 'Functions-Request-Id': context.server ? context.server.requestId : '',
              "eo-pages-inner-scf-status": "502",
              "eo-pages-inner-status-intercept": "true"
            }
          });
        }
        const requestEndTime2 = Date.now();
        await handleResponse(res, response, getResponsePassHeaders(context, agentConversationId));
        return;
      }
    }
    if (!response) {
      response = new Response(JSON.stringify({
        error: "Not Found",
        message: "The requested path does not exist"
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const requestEndTime = Date.now();
    if (!res.headers) {
      res.headers = {};
    }
    await handleResponse(res, response, getResponsePassHeaders(context, agentConversationId));
  } catch (error) {
    console.error("server error", error);
    res.writeHead(502, {
      "Content-Type": "application/json",
      "Functions-Request-Id": req.headers["x-scf-request-id"] || "",
      ...agentConversationId ? { [REQUEST_CONVERSATION_ID_HEADER]: agentConversationId } : {},
      "eo-pages-inner-scf-status": "502",
      "eo-pages-inner-status-intercept": "true"
    });
    res.end(JSON.stringify({
      error: "Internal Server Error",
      code: "FUNCTION_INVOCATION_FAILED",
      message: error.message,
      trace: error.stack
    }));
  }
});
server.headersTimeout = 0;
server.requestTimeout = 0;
server.listen(port, () => {
});
export {
  server
};
