(function () {
  'use strict';

  // ===========================================================================
  // RFC 1321 MD5 Core Operations
  // ===========================================================================
  function safeAdd(x, y) {
    var lsw = (x & 0xffff) + (y & 0xffff);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }

  function bitRotateLeft(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  function md5cmn(q, a, b, x, s, t) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }

  function md5ff(a, b, c, d, x, s, t) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function md5gg(a, b, c, d, x, s, t) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function md5hh(a, b, c, d, x, s, t) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function md5ii(a, b, c, d, x, s, t) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function rhex(num) {
    var str = '';
    for (var j = 0; j <= 3; j++) {
      str += ((num >> (j * 8 + 4)) & 0x0f).toString(16) + ((num >> (j * 8)) & 0x0f).toString(16);
    }
    return str;
  }

  function wordToHexLE(val) {
    var s = '';
    for (var b = 0; b < 4; b++) {
      var byteVal = (val >>> (b * 8)) & 0xff;
      var h = byteVal.toString(16);
      s += (h.length === 1 ? '0' : '') + h;
    }
    return s;
  }

  // ===========================================================================
  // MD5 Block Processing & Round State Capture
  // ===========================================================================
  function computeMd5WithSteps(str) {
    var nblk = ((str.length + 8) >> 6) + 1;
    var blks = new Array(nblk * 16);
    for (var k = 0; k < blks.length; k++) {
      blks[k] = 0;
    }
    for (var i = 0; i < str.length; i++) {
      blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    }
    blks[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
    blks[nblk * 16 - 2] = (str.length * 8) & 0xffffffff;
    blks[nblk * 16 - 1] = Math.floor((str.length * 8) / 0x100000000);

    var a = 1732584193; // 0x67452301
    var b = -271733879; // 0xefcdab89
    var c = -1732584194; // 0x98badcfe
    var d = 271733878;  // 0x10325476

    var steps = [];

    for (var bIdx = 0; bIdx < blks.length; bIdx += 16) {
      var olda = a;
      var oldb = b;
      var oldc = c;
      var oldd = d;

      // Round 1 (F logic)
      a = md5ff(a, b, c, d, blks[bIdx + 0], 7, -680876936);
      d = md5ff(d, a, b, c, blks[bIdx + 1], 12, -389564586);
      c = md5ff(c, d, a, b, blks[bIdx + 2], 17, 606105819);
      b = md5ff(b, c, d, a, blks[bIdx + 3], 22, -1044525330);
      a = md5ff(a, b, c, d, blks[bIdx + 4], 7, -176418897);
      d = md5ff(d, a, b, c, blks[bIdx + 5], 12, 1200080426);
      c = md5ff(c, d, a, b, blks[bIdx + 6], 17, -1473231341);
      b = md5ff(b, c, d, a, blks[bIdx + 7], 22, -45705983);
      a = md5ff(a, b, c, d, blks[bIdx + 8], 7, 1770035416);
      d = md5ff(d, a, b, c, blks[bIdx + 9], 12, -1958414417);
      c = md5ff(c, d, a, b, blks[bIdx + 10], 17, -42063);
      b = md5ff(b, c, d, a, blks[bIdx + 11], 22, -1990404162);
      a = md5ff(a, b, c, d, blks[bIdx + 12], 7, 1804603682);
      d = md5ff(d, a, b, c, blks[bIdx + 13], 12, -40341101);
      c = md5ff(c, d, a, b, blks[bIdx + 14], 17, -1502002290);
      b = md5ff(b, c, d, a, blks[bIdx + 15], 22, 1236535329);
      steps.push({
        round: 'Round 1 (F logic &bull; Steps 0-15)',
        A: wordToHexLE(a),
        B: wordToHexLE(b),
        C: wordToHexLE(c),
        D: wordToHexLE(d)
      });

      // Round 2 (G logic)
      a = md5gg(a, b, c, d, blks[bIdx + 1], 5, -165796510);
      d = md5gg(d, a, b, c, blks[bIdx + 6], 9, -1069501632);
      c = md5gg(c, d, a, b, blks[bIdx + 11], 14, 643717713);
      b = md5gg(b, c, d, a, blks[bIdx + 0], 20, -373897302);
      a = md5gg(a, b, c, d, blks[bIdx + 5], 5, -701558691);
      d = md5gg(d, a, b, c, blks[bIdx + 10], 9, 38016083);
      c = md5gg(c, d, a, b, blks[bIdx + 15], 14, -660478335);
      b = md5gg(b, c, d, a, blks[bIdx + 4], 20, -405537848);
      a = md5gg(a, b, c, d, blks[bIdx + 9], 5, 568446438);
      d = md5gg(d, a, b, c, blks[bIdx + 14], 9, -1019803690);
      c = md5gg(c, d, a, b, blks[bIdx + 3], 14, -187363961);
      b = md5gg(b, c, d, a, blks[bIdx + 8], 20, 1163531501);
      a = md5gg(a, b, c, d, blks[bIdx + 13], 5, -1444681467);
      d = md5gg(d, a, b, c, blks[bIdx + 2], 9, -51403784);
      c = md5gg(c, d, a, b, blks[bIdx + 7], 14, 1735328473);
      b = md5gg(b, c, d, a, blks[bIdx + 12], 20, -1926607734);
      steps.push({
        round: 'Round 2 (G logic &bull; Steps 16-31)',
        A: wordToHexLE(a),
        B: wordToHexLE(b),
        C: wordToHexLE(c),
        D: wordToHexLE(d)
      });

      // Round 3 (H logic)
      a = md5hh(a, b, c, d, blks[bIdx + 5], 4, -378558);
      d = md5hh(d, a, b, c, blks[bIdx + 8], 11, -2022574463);
      c = md5hh(c, d, a, b, blks[bIdx + 11], 16, 1839030562);
      b = md5hh(b, c, d, a, blks[bIdx + 14], 23, -35309556);
      a = md5hh(a, b, c, d, blks[bIdx + 1], 4, -1530992060);
      d = md5hh(d, a, b, c, blks[bIdx + 4], 11, 1272893353);
      c = md5hh(c, d, a, b, blks[bIdx + 7], 16, -155497632);
      b = md5hh(b, c, d, a, blks[bIdx + 10], 23, -1094730640);
      a = md5hh(a, b, c, d, blks[bIdx + 13], 4, 681279174);
      d = md5hh(d, a, b, c, blks[bIdx + 0], 11, -358537222);
      c = md5hh(c, d, a, b, blks[bIdx + 3], 16, -722521979);
      b = md5hh(b, c, d, a, blks[bIdx + 6], 23, 76029189);
      a = md5hh(a, b, c, d, blks[bIdx + 9], 4, -640364487);
      d = md5hh(d, a, b, c, blks[bIdx + 12], 11, -421815835);
      c = md5hh(c, d, a, b, blks[bIdx + 15], 16, 530742520);
      b = md5hh(b, c, d, a, blks[bIdx + 2], 23, -995338651);
      steps.push({
        round: 'Round 3 (H logic &bull; Steps 32-47)',
        A: wordToHexLE(a),
        B: wordToHexLE(b),
        C: wordToHexLE(c),
        D: wordToHexLE(d)
      });

      // Round 4 (I logic)
      a = md5ii(a, b, c, d, blks[bIdx + 0], 6, -198630844);
      d = md5ii(d, a, b, c, blks[bIdx + 7], 10, 1126891415);
      c = md5ii(c, d, a, b, blks[bIdx + 14], 15, -1416354905);
      b = md5ii(b, c, d, a, blks[bIdx + 5], 21, -57434055);
      a = md5ii(a, b, c, d, blks[bIdx + 12], 6, 1700485571);
      d = md5ii(d, a, b, c, blks[bIdx + 3], 10, -1894986606);
      c = md5ii(c, d, a, b, blks[bIdx + 10], 15, -1051523);
      b = md5ii(b, c, d, a, blks[bIdx + 1], 21, -2054922799);
      a = md5ii(a, b, c, d, blks[bIdx + 8], 6, 1873313359);
      d = md5ii(d, a, b, c, blks[bIdx + 15], 10, -30611744);
      c = md5ii(c, d, a, b, blks[bIdx + 6], 15, -1560198380);
      b = md5ii(b, c, d, a, blks[bIdx + 13], 21, 1309151649);
      a = md5ii(a, b, c, d, blks[bIdx + 4], 6, -145523070);
      d = md5ii(d, a, b, c, blks[bIdx + 11], 10, -1120210379);
      c = md5ii(c, d, a, b, blks[bIdx + 2], 15, 718787259);
      b = md5ii(b, c, d, a, blks[bIdx + 9], 21, -343485551);
      steps.push({
        round: 'Round 4 (I logic &bull; Steps 48-63)',
        A: wordToHexLE(a),
        B: wordToHexLE(b),
        C: wordToHexLE(c),
        D: wordToHexLE(d)
      });

      a = safeAdd(a, olda);
      b = safeAdd(b, oldb);
      c = safeAdd(c, oldc);
      d = safeAdd(d, oldd);
    }

    var finalDigest = rhex(a) + rhex(b) + rhex(c) + rhex(d);
    return {
      finalDigest: finalDigest,
      steps: steps,
      lengthBits: str.length * 8,
      blocks: nblk,
      rawBlocks: blks
    };
  }

  // ===========================================================================
  // Hex to 128-bit Binary Array
  // ===========================================================================
  function hexToBinaryArray(hex) {
    var bits = [];
    for (var i = 0; i < hex.length; i++) {
      var nibble = parseInt(hex[i], 16);
      for (var b = 3; b >= 0; b--) {
        bits.push((nibble >> b) & 1);
      }
    }
    return bits;
  }

  // Generate 1-bit modified variant of string
  function getOneBitPerturbation(str) {
    if (str.length === 0) {
      return 'a';
    }
    var firstCharCode = str.charCodeAt(0);
    // Flip least-significant bit of first character
    var flippedCode = firstCharCode ^ 1;
    return String.fromCharCode(flippedCode) + str.slice(1);
  }

  // ===========================================================================
  // Simulation Controller (Isolated to .lab-sim-card)
  // ===========================================================================
  function initSimulation() {
    var inputElem = document.getElementById('sim-input');
    var digestElem = document.getElementById('sim-digest');
    var bitsElem = document.getElementById('sim-bits');
    var blocksElem = document.getElementById('sim-blocks');
    var paddingElem = document.getElementById('sim-padding');
    var padSegmentsElem = document.getElementById('sim-pad-segments');
    var roundsTbody = document.getElementById('sim-rounds');

    var avOrigInput = document.getElementById('av-orig-input');
    var avModInput = document.getElementById('av-mod-input');
    var avDistElem = document.getElementById('av-dist');
    var avPercentElem = document.getElementById('av-percent');
    var avGrid = document.getElementById('av-grid');

    if (!inputElem) {
      return;
    }

    function renderSimulation() {
      var val = inputElem.value;
      var res = computeMd5WithSteps(val);

      // View 1: Digest Panel
      if (digestElem) {
        digestElem.textContent = res.finalDigest;
      }
      if (bitsElem) {
        bitsElem.textContent = res.lengthBits + ' bits (' + val.length + ' bytes)';
      }
      if (blocksElem) {
        blocksElem.textContent = res.blocks + ' block(s) (512 bits ea)';
      }

      // View 2: RFC 1321 Padding Terminal
      if (paddingElem) {
        var padBitsMod = (res.lengthBits + 8) % 512;
        var zeroBitsNeeded = (448 - padBitsMod + 512) % 512;
        paddingElem.textContent =
          'RFC 1321 Padding Pipeline:\n' +
          '1. Original Payload : ' + val.length + ' bytes (' + res.lengthBits + ' bits)\n' +
          '2. Padding Delimiter: 1 byte (0x80 = 10000000b)\n' +
          '3. Zero-Padding     : ' + zeroBitsNeeded + ' zero bits (' + Math.floor(zeroBitsNeeded / 8) + ' bytes) -> Total 448 (mod 512)\n' +
          '4. Message Length   : 64-bit integer = ' + res.lengthBits + ' bits (appended little-endian)\n' +
          '5. Padded Block Count: ' + res.blocks + ' x 512-bit block(s) (' + (res.blocks * 64) + ' bytes total)';
      }

      if (padSegmentsElem) {
        var segHtml = '';
        segHtml += '<span class="pad-seg pad-seg-data">Data: ' + val.length + 'B</span>';
        segHtml += '<span class="pad-seg pad-seg-pad">0x80: 1B</span>';
        var padModBytes = (val.length + 1) % 64;
        var zBytes = (56 - padModBytes + 64) % 64;
        segHtml += '<span class="pad-seg pad-seg-zeros">0x00: ' + zBytes + 'B</span>';
        segHtml += '<span class="pad-seg pad-seg-len">Len: 8B (64-bit LE)</span>';
        padSegmentsElem.innerHTML = segHtml;
      }

      // View 3: Intermediate Round States
      if (roundsTbody) {
        var rHtml = '';
        res.steps.forEach(function (step) {
          rHtml += '<tr>' +
            '<td><strong>' + step.round + '</strong></td>' +
            '<td>0x' + step.A + '</td>' +
            '<td>0x' + step.B + '</td>' +
            '<td>0x' + step.C + '</td>' +
            '<td>0x' + step.D + '</td>' +
            '</tr>';
        });
        roundsTbody.innerHTML = rHtml;
      }

      // View 4: Avalanche Effect Comparison
      var modVal = getOneBitPerturbation(val);
      var modRes = computeMd5WithSteps(modVal);

      if (avOrigInput) {
        avOrigInput.textContent = '"' + val + '"';
      }
      if (avModInput) {
        avModInput.textContent = '"' + modVal + '"';
      }

      var bitsOrig = hexToBinaryArray(res.finalDigest);
      var bitsMod = hexToBinaryArray(modRes.finalDigest);

      var flippedCount = 0;
      var gridHtml = '';
      for (var b = 0; b < 128; b++) {
        var isFlipped = bitsOrig[b] !== bitsMod[b];
        if (isFlipped) {
          flippedCount++;
          gridHtml += '<div class="lab-bit-cell lab-bit-flip" title="Bit ' + b + ': Flipped (' + bitsOrig[b] + ' -> ' + bitsMod[b] + ')">' + b + '</div>';
        } else {
          gridHtml += '<div class="lab-bit-cell lab-bit-match" title="Bit ' + b + ': Unchanged (' + bitsOrig[b] + ')">' + b + '</div>';
        }
      }

      if (avDistElem) {
        avDistElem.textContent = flippedCount + ' / 128 bits';
      }
      if (avPercentElem) {
        var pct = ((flippedCount / 128) * 100).toFixed(1);
        avPercentElem.textContent = pct + '%';
      }
      if (avGrid) {
        avGrid.innerHTML = gridHtml;
      }
    }

    // Scoped view buttons: switch internal simulator panels ONLY
    var viewBtns = document.querySelectorAll('.lab-sim-viewbtn');
    viewBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        viewBtns.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        var selectedView = btn.getAttribute('data-view');
        var viewPanels = document.querySelectorAll('.lab-sim-view');
        viewPanels.forEach(function (panel) {
          panel.classList.toggle('active', panel.getAttribute('data-viewpanel') === selectedView);
        });
      });
    });

    inputElem.addEventListener('input', renderSimulation);
    renderSimulation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimulation);
  } else {
    initSimulation();
  }
})();
