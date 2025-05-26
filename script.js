let currentAudio = null;
let isPaused = false;
let currentLabel = "";
let elapsedTime = 0;
let timerInterval = null;
let bellPlayed = false;
let originalBGMVolume = null;
let bgmData = [];

async function loadBGMData() {
  try {
    const res = await fetch('bgm_data.json');
    bgmData = await res.json();
  } catch (e) {
    console.error("BGMデータの読み込みに失敗しました:", e);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadBGMData(); // ← 追加
  showScreen('home');
  populateMoodOptions();
  const savedColor = localStorage.getItem('theme-color');
  if (savedColor) {
    applyThemeColor(savedColor);
    document.getElementById('preset-color').value = savedColor;
    document.getElementById('custom-color').value = savedColor;
  }

  const savedFontColor = localStorage.getItem('font-color');  // ←追加
  if (savedFontColor) {                                       // ←追加
    applyFontColor(savedFontColor);                           // ←追加
    document.getElementById('preset-font-color').value = savedFontColor; // ←追加
    document.getElementById('custom-font-color').value = savedFontColor; // ←追加
  }

  // 気分設定の復元
  const moodDefaults = {
    kitaku: 'select-kitaku',
    shokuji: 'select-shokuji',
    kadai: 'select-kadai',
    nyuyoku: 'select-nyuyoku',
    neru: 'select-neru'
  };

  for (const key in moodDefaults) {
    const saved = localStorage.getItem(`mood-${key}`);
    if (saved) {
      const select = document.getElementById(moodDefaults[key]);
      if (select) {
        select.value = saved;
      }
    }
  }

});

function populateMoodOptions() {
  const actions = [
    '帰宅後のルーティン',
    '食事後の片付け',
    '課題後に動く',
    '入浴準備',
    '就寝準備'
  ];
  const actionIds = {
    '帰宅後のルーティン': 'select-kitaku',
    '食事後の片付け': 'select-shokuji',
    '課題後に動く': 'select-kadai',
    '入浴準備': 'select-nyuyoku',
    '就寝準備': 'select-neru'
  };

  actions.forEach(action => {
    const select = document.getElementById(actionIds[action]);
    if (!select) return;

    // 該当する気分名だけ抽出
    const moods = bgmData
      .filter(item => item["行動名"] === action)
      .map(item => ({
        label: item["気分名"],
        value: item["ファイル名"].replace('.mp3', '') // ID的には従来通り
      }));

    // 中身をクリアして追加
    select.innerHTML = '';
    moods.forEach(mood => {
      const option = document.createElement('option');
      option.value = mood.value;
      option.textContent = mood.label;
      select.appendChild(option);
    });
  });
}

function playBGM(name, label) {

// BGM再生中なら一時的に音量を下げる
let originalBGMVolume = null;
if (currentAudio) {
  originalBGMVolume = currentAudio.volume;
  currentAudio.volume = 0.2;
}

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // 各行動と対応するセレクトボックスID
  const moodMap = {
    kitaku: 'select-kitaku',
    shokuji: 'select-shokuji',
    kadai: 'select-kadai',
    nyuyoku: 'select-nyuyoku',
    neru: 'select-neru'
  };

  // 気分セレクトから現在のvalueを取得（例："kitaku_2"）
  const moodSelect = document.getElementById(moodMap[name]);
  const moodLabel = moodSelect.options[moodSelect.selectedIndex].text;

  const bgmEntry = bgmData.find(item => item["行動名"] === label && item["気分名"] === moodLabel);
  if (!bgmEntry) {
    alert("該当するBGMが見つかりません");
    return;
  }
  
  const fileName = bgmEntry["ファイル名"];
  currentAudio = new Audio(`assets/${fileName}`);

  currentAudio.loop = true;
  currentAudio.play();
  // クレジット情報を表示
document.getElementById("bgm-credit").innerHTML =
  `<strong>再生中：</strong><br>
   曲名：${bgmEntry["元タイトル"]}<br>
   作者：${bgmEntry["作者"]}<br>
   サイト：<a href="${bgmEntry["URL"]}" target="_blank">${bgmEntry["サイト"]}</a>`;

  isPaused = false;
  currentLabel = label;
  elapsedTime = 0;
  bellPlayed = false;

  document.getElementById("now-playing").textContent = `▶️ 「${label}」に移行中……`;
  document.getElementById("controls").style.display = "block";
  document.getElementById("message").textContent = "";

  updateElapsedDisplay();
  timerInterval = setInterval(() => {
    elapsedTime++;
    updateElapsedDisplay();

    if (elapsedTime === 300 && !bellPlayed) {
      fadeVolume(currentAudio, currentAudio.volume, 0.3, 500);
      const bell = new Audio('assets/Bell.mp3');
      bell.play();
      setTimeout(() => {
        fadeVolume(currentAudio, 0.3, 1.0, 500);
      }, 2500);
      bellPlayed = true;
    }
  }, 1000);
}

function updateElapsedDisplay() {
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  document.getElementById("elapsed-time").textContent = `経過時間：${minutes}分${seconds.toString().padStart(2, '0')}秒`;
}

function togglePause() {
  if (!currentAudio) return;
  if (isPaused) {
    currentAudio.play();
    document.querySelector('#controls button').textContent = "⏸ 一時停止";
    isPaused = false;
  } else {
    currentAudio.pause();
    document.querySelector('#controls button').textContent = "▶️ 再開";
    isPaused = true;
  }
}

function completeAction() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  document.getElementById("now-playing").textContent = "";
  document.getElementById("elapsed-time").textContent = "";
  document.getElementById("controls").style.display = "none";
  document.getElementById("message").innerHTML = `「${currentLabel}」移行完了！<br>がんばったね。`;
  document.getElementById("bgm-credit").innerHTML = "";
}

function fadeVolume(audio, from, to, duration) {
  const steps = 10;
  const stepTime = duration / steps;
  const volumeStep = (to - from) / steps;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    audio.volume = Math.min(Math.max(from + volumeStep * currentStep, 0), 1);
    if (currentStep >= steps) clearInterval(interval);
  }, stepTime);
}

function applyThemeColor(color) {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    document.documentElement.style.setProperty('--main-color', color);
    localStorage.setItem('theme-color', color);

    // ステータスバーカラーにも反映
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", color);
    }
  }
}

function setThemeFromPreset(color) {
  applyThemeColor(color);
  document.getElementById('custom-color').value = color;
}

function setThemeFromInput(color) {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    applyThemeColor(color);
    document.getElementById('preset-color').value = color;
  }
}

function showScreen(screen) {
  document.getElementById('home-screen').style.display = (screen === 'home') ? 'block' : 'none';
  document.getElementById('menu-screen').style.display = (screen === 'menu') ? 'block' : 'none';

  document.getElementById('tab-home').classList.toggle('active', screen === 'home');
  document.getElementById('tab-menu').classList.toggle('active', screen === 'menu');
}

function toggleCredits() {
  const section = document.getElementById('credits');
  section.style.display = (section.style.display === 'none') ? 'block' : 'none';
}

function applyFontColor(color) {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    document.documentElement.style.setProperty('--font-color', color);
    localStorage.setItem('font-color', color);
  }
}

function setFontFromPreset(color) {
  applyFontColor(color);
  document.getElementById('custom-font-color').value = color;
}

function setFontFromInput(color) {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    applyFontColor(color);
    document.getElementById('preset-font-color').value = color;
  }
}

function toggleSection(id, button) {
  const el = document.getElementById(id);
  const arrow = button.querySelector('.arrow');

  if (el.style.display === 'none' || el.style.display === '') {
    el.style.display = 'block';
    if (arrow) arrow.textContent = '▼';
  } else {
    el.style.display = 'none';
    if (arrow) arrow.textContent = '▶';
  }
}

function showImageModal() {
  document.getElementById("image-modal").style.display = "flex";
}

function hideImageModal() {
  document.getElementById("image-modal").style.display = "none";
}

let previewAudio = null;
let previewingId = null;

function previewBGM(selectId) {

  // BGMが再生中なら一時的に音量を下げる
  if (currentAudio && !previewAudio) {
    originalBGMVolume = currentAudio.volume;
    currentAudio.volume = 0.2;
  }

  const selectedValue = document.getElementById(selectId).value;
  const previewFile = `assets/${selectedValue}.mp3`;

  // 同じボタンが押されたら停止する
  if (previewingId === selectId && previewAudio) {
    previewAudio.pause();
    previewAudio = null;
    previewingId = null;
    return;
  }

  // 他のプレビューが流れていれば停止
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }

  previewAudio = new Audio(previewFile);
  previewAudio.volume = 0.8;
  previewAudio.play();
  previewingId = selectId;

  // 10秒後に自動停止
  setTimeout(() => {
    if (previewingId === selectId && previewAudio) {
      previewAudio.pause();
      previewAudio = null;
      previewingId = null;

      // BGM音量を戻す
      if (currentAudio && originalBGMVolume !== null) {
        currentAudio.volume = originalBGMVolume;
      }
      // 🔽 5秒後にクレジット表示を消す
      setTimeout(() => {
        // previewAudio がまだ再生されていないことを確認して消去
        if (!previewAudio) {
          document.getElementById("preview-credit").innerHTML = "";
        }
      }, 5000); // ← 5000ミリ秒 = 5秒
    }
  }, 10000); // ← 試聴音は10秒で自動終了


  const moodLabel = document.getElementById(selectId).options[document.getElementById(selectId).selectedIndex].text;

  // 行動名を逆引き
  const actionMap = {
    'select-kitaku': '帰宅後のルーティン',
    'select-shokuji': '食事後の片付け',
    'select-kadai': '課題後に動く',
    'select-nyuyoku': '入浴準備',
    'select-neru': '就寝準備'
  };
  const actionName = actionMap[selectId];

  // JSONから該当エントリを取得
  const entry = bgmData.find(item =>
    item["行動名"] === actionName && item["気分名"] === moodLabel
  );

  // 表示
  if (entry) {
    document.getElementById("preview-credit").innerHTML =
      `<strong>試聴中：</strong><br>
     曲名：${entry["元タイトル"]}<br>
     作者：${entry["作者"]}<br>
     サイト：<a href="${entry["URL"]}" target="_blank">${entry["サイト"]}</a>`;
  }

}

function resetMoodSettings() {
  const moodMap = {
    kitaku: 'select-kitaku',
    shokuji: 'select-shokuji',
    kadai: 'select-kadai',
    nyuyoku: 'select-nyuyoku',
    neru: 'select-neru'
  };

  for (const key in moodMap) {
    localStorage.removeItem(`mood-${key}`);
    const select = document.getElementById(moodMap[key]);
    if (select) {
      select.selectedIndex = 0; // 最初の選択肢に戻す
    }
  }
}
